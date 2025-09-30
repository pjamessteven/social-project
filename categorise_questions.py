from typing import List
from qdrant_client import QdrantClient, models
from bertopic import BERTopic
import numpy as np
import pandas as pd
from collections import defaultdict
import sys
from hdbscan import HDBSCAN
from qdrant_client.models import VectorParams, Distance
import openai
from dotenv import load_dotenv                                                                                                                                          
import os

load_dotenv()                                                                                                                                                           
# -------------------------------
# 1. Parse command line arguments and connect to Qdrant
# -------------------------------
DRY_RUN = "--dry-run" in sys.argv

if DRY_RUN:
    print("🔍 DRY RUN MODE: No database writes will be performed")
else:
    print("💾 LIVE MODE: Database writes will be performed")

# Initialize OpenAI client for title generation
openai_client = openai.OpenAI(
    api_key=os.getenv("OPENROUTER_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

client = QdrantClient(
    url="http://localhost:6333",
    api_key=None,
    timeout=60  # 60 second timeout
)

COLLECTION_Q = "default_questions"
COLLECTION_T = "default_topics"

# -------------------------------
# 2. Load all questions + vectors
# -------------------------------
print(f"Connecting to Qdrant and loading from collection: {COLLECTION_Q}")

try:
    # Check if collection exists
    collection_info = client.get_collection(COLLECTION_Q)
    print(f"Collection found: {collection_info.points_count} points")
except Exception as e:
    print(f"❌ Error accessing collection {COLLECTION_Q}: {e}")
    sys.exit(1)

all_points = []
next_page = None

while True:
    try:
        points, next_page = client.scroll(
            collection_name=COLLECTION_Q,
            limit=10000,  # Much smaller batch size to avoid timeout
            with_payload=True,
            with_vectors=True,
            offset=next_page,
        )
        all_points.extend(points)
        print(f"Loaded batch: {len(points)} points (total: {len(all_points)})")
        if next_page is None:
            break
    except Exception as e:
        print(f"❌ Error during scroll: {e}")
        print("Retrying with smaller batch size...")
        try:
            # Retry with even smaller batch
            points, next_page = client.scroll(
                collection_name=COLLECTION_Q,
                limit=100,
                with_payload=True,
                with_vectors=True,
                offset=next_page,
            )
            all_points.extend(points)
            print(f"Loaded smaller batch: {len(points)} points (total: {len(all_points)})")
            if next_page is None:
                break
        except Exception as e2:
            print(f"❌ Failed even with smaller batch: {e2}")
            sys.exit(1)

print(f"✅ Loaded {len(all_points)} vectors from Qdrant")

if len(all_points) == 0:
    print("❌ No points found in collection. Exiting.")
    sys.exit(1)

print("Extracting data from points...")
ids = [p.id for p in all_points]

# Extract questions from nested _node_content structure
questions = []
for p in all_points:
    if p.payload and "_node_content" in p.payload:
        try:
            import json
            node_content = json.loads(p.payload["_node_content"]) if isinstance(p.payload["_node_content"], str) else p.payload["_node_content"]
            text = node_content.get("text", "")
            if text:
                questions.append(text)
            else:
                questions.append("")  # Keep index alignment
        except (json.JSONDecodeError, TypeError) as e:
            print(f"Warning: Could not parse _node_content for point {p.id}: {e}")
            questions.append("")  # Keep index alignment
    else:
        questions.append("")  # Keep index alignment

embeddings = np.array([p.vector for p in all_points if p.vector is not None])

print(f"Extracted {len(ids)} IDs, {len(questions)} questions, {len(embeddings)} embeddings")

# Filter out empty questions but keep index alignment
valid_indices = [i for i, q in enumerate(questions) if q.strip()]
if len(valid_indices) == 0:
    print("❌ No valid questions found in payloads. Check that points have '_node_content' with 'text' field.")
    sys.exit(1)

print(f"Found {len(valid_indices)} valid questions out of {len(questions)} total points")

if len(embeddings) == 0:
    print("❌ No embeddings found. Check that points have vectors.")
    sys.exit(1)

# -------------------------------
# 3. Run BERTopic with precomputed embeddings
# -------------------------------
print("Running BERTopic clustering...")
try:
    # Filter to only valid questions and their corresponding embeddings
    valid_questions = [questions[i] for i in valid_indices]
    valid_embeddings = embeddings[valid_indices]
    valid_ids = [ids[i] for i in valid_indices]
    
    topic_model = BERTopic(hdbscan_model=HDBSCAN(min_cluster_size=100), embedding_model=None, verbose=True)

    topics, probs = topic_model.fit_transform(valid_questions, valid_embeddings)

    topic_model.reduce_topics(valid_questions, nr_topics=100)

    # Type guard to satisfy type checker
    if topic_model.topics_ is None:
        raise ValueError("Model topics_ is None after fitting")

    topics: List[int] = list(topic_model.topics_)

    print(f"✅ BERTopic completed. Found {len(set(topics))} topics")
except Exception as e:
    print(f"❌ Error during BERTopic clustering: {e}")
    sys.exit(1)

# Assign topic_id to each valid question
updates = []
for idx, qid in enumerate(valid_ids):
    updates.append(
        models.PointStruct(
            id=qid,
            vector={},
            payload={"topic_id": int(topics[idx])}
        )
    )

# Write back in batches
if not DRY_RUN:
    BATCH_SIZE = 500
    for i in range(0, len(updates), BATCH_SIZE):
        client.upsert(
            collection_name=COLLECTION_Q,
            points=updates[i:i+BATCH_SIZE]
        )
    print("✅ Questions updated with topic_id")
else:
    print("🔍 DRY RUN: Would update questions with topic_id (skipped)")

# -------------------------------
# 4. Build topics collection
# -------------------------------
# Create collection if not exists
if not DRY_RUN:
    try:
        client.get_collection(COLLECTION_T)
    except:
        client.create_collection(
            collection_name=COLLECTION_T,
            vectors_config=models.VectorParams(size=0, distance=Distance.COSINE)  # no vectors needed
        )
else:
    print("🔍 DRY RUN: Would create/check topics collection (skipped)")

topic_info = topic_model.get_topic_info()

# Collect representative questions per topic
topic_to_questions = defaultdict(list)
for q, t in zip(valid_questions, topics):
    topic_to_questions[t].append(q)

# Generate labels using LLM
def generate_llm_title(topic_id, questions, keywords, topn=5, depth=None, max_depth=None):
    """Generate a descriptive title for a topic using LLM"""
    try:
        # Get the most relevant questions (up to topn)
        sample_questions = questions[:topn]
        keywords_str = ", ".join(keywords[:10])  # Use top 10 keywords
        
        # Add depth context to the prompt
        depth_context = ""
        if depth is not None and max_depth is not None:
            if depth == 0:
                depth_context = f"\n\nThis is a ROOT topic (depth {depth}/{max_depth}). Generate a BROAD, high-level category name that encompasses many subtopics."
            elif depth == max_depth:
                depth_context = f"\n\nThis is a LEAF topic (depth {depth}/{max_depth}). Generate a SPECIFIC, detailed title that captures the precise subject matter."
            else:
                depth_context = f"\n\nThis is a MID-LEVEL topic (depth {depth}/{max_depth}). Generate a moderately specific title - more specific than broad categories but not overly narrow."
        
        prompt = f"""Based on the following questions and keywords from a topic cluster, generate a concise, descriptive title (2-6 words) that captures the main theme:

Questions:
{chr(10).join(f"- {q}" for q in sample_questions)}

Keywords: {keywords_str}{depth_context}

Generate a clear, specific title that someone browsing topics would understand. Focus on the main subject matter, not generic phrases.

Title:"""

        response = openai_client.chat.completions.create(
            model="deepseek/deepseek-chat-v3.1",
            messages=[
                {"role": "user", "content": prompt}
            ],
            max_tokens=50,
            temperature=0.3
        )
        
        title = response.choices[0].message.content.strip()
        # Clean up the title (remove quotes, extra whitespace)
        title = title.strip('"\'').strip()
        
        depth_str = f" (depth {depth}/{max_depth})" if depth is not None and max_depth is not None else ""
        print(f"Generated title for topic {topic_id}{depth_str}: {title}")
        return title
        
    except Exception as e:
        print(f"Error generating LLM title for topic {topic_id}: {e}")
        # Fallback to simple label
        return generate_simple_label(topic_id, questions, topn=2)

def generate_simple_label(topic_id, questions, topn=3):
    """Fallback: simple version using first few questions"""
    sample_qs = questions[:topn]
    return " | ".join(sample_qs)

# Calculate topic hierarchy depths first
print("Calculating topic hierarchy depths...")
topic_depths = {}
max_depth = 0
hierarchical_topics = None
all_topic_ids = set()

try:
    hierarchical_topics = topic_model.hierarchical_topics(valid_questions)
    
    # Build parent-child mapping
    children_map = defaultdict(list)
    parent_map = {}
    
    if 'Child_Left_ID' in hierarchical_topics.columns and 'Child_Right_ID' in hierarchical_topics.columns and 'Parent_ID' in hierarchical_topics.columns:
        for _, row in hierarchical_topics.iterrows():
            parent = row['Parent_ID']
            child_left = row['Child_Left_ID']
            child_right = row['Child_Right_ID']
            children_map[parent].extend([child_left, child_right])
            parent_map[child_left] = parent
            parent_map[child_right] = parent
            
            # Collect all topic IDs (including synthetic parent topics)
            all_topic_ids.update([parent, child_left, child_right])
        
        # Find root topics (topics that are parents but not children)
        all_children = set()
        all_parents = set()
        for _, row in hierarchical_topics.iterrows():
            all_children.update([row['Child_Left_ID'], row['Child_Right_ID']])
            all_parents.add(row['Parent_ID'])
        roots = all_parents - all_children
        
        # Calculate depths using BFS
        from collections import deque
        queue = deque([(root, 0) for root in roots])
        
        while queue:
            topic_id, depth = queue.popleft()
            topic_depths[topic_id] = depth
            max_depth = max(max_depth, depth)
            
            for child in children_map[topic_id]:
                queue.append((child, depth + 1))
        
        print(f"Calculated depths for {len(topic_depths)} topics, max depth: {max_depth}")
        print(f"Found {len(all_topic_ids)} total topics (including synthetic parent topics)")
    else:
        print("No hierarchical structure found, using depth 0 for all topics")
        
except Exception as e:
    print(f"Error calculating hierarchy depths: {e}")
    print("Using depth 0 for all topics")

# Generate topic documents with LLM-generated titles
print("Generating LLM titles for topics...")
topic_points = []
topic_id_to_title = {}

# First, generate titles for original topics
for _, row in topic_info.iterrows():
    topic_id = int(row["Topic"])
    if topic_id == -1:
        continue  # -1 = outliers

    rep_questions = topic_to_questions[topic_id]
    
    topic_words = topic_model.get_topic(topic_id)
    if topic_words and isinstance(topic_words, list):
        keywords = [word for word, _ in topic_words]
    else:
        keywords = []
    
    # Get depth information for this topic
    depth = topic_depths.get(topic_id, None)
    
    # Generate LLM title using questions, keywords, and depth context
    llm_title = generate_llm_title(topic_id, rep_questions, keywords, topn=5, depth=depth, max_depth=max_depth if max_depth > 0 else None)
    
    # Keep the simple label as backup
    simple_label = generate_simple_label(topic_id, rep_questions, topn=2)
    
    topic_id_to_title[topic_id] = llm_title
    
    # Get topic count from topic_info
    topic_row = topic_info[topic_info['Topic'] == topic_id]
    count = topic_row.iloc[0]['Count'] if not topic_row.empty else 0
        
    topic_points.append(
        models.PointStruct(
            id=topic_id,
            vector={},
            payload={
                "topic_id": topic_id,
                "title": llm_title,
                "label": simple_label,  # Keep as backup
                "keywords": keywords,
                "depth": depth,
                "question_count": count,
                "is_synthetic": False,
                "topic_type": "original"
            }
        )
    )

# Generate titles for synthetic parent topics in the hierarchy
if hierarchical_topics is not None:
    print("Generating titles for synthetic parent topics...")
    
    # Find synthetic parent topics (topics that exist in hierarchy but not in original clustering)
    original_topic_ids = set(int(row["Topic"]) for _, row in topic_info.iterrows() if int(row["Topic"]) != -1)
    synthetic_topic_ids = all_topic_ids - original_topic_ids
    
    print(f"Found {len(synthetic_topic_ids)} synthetic parent topics to generate titles for")
    
    for topic_id in synthetic_topic_ids:
        # For synthetic topics, we need to infer content from their children
        child_topics = children_map.get(topic_id, [])
        
        # Collect questions and keywords from child topics
        child_questions = []
        child_keywords = []
        
        for child_id in child_topics:
            if child_id in topic_to_questions:
                child_questions.extend(topic_to_questions[child_id][:3])  # Take top 3 from each child
            
            child_topic_words = topic_model.get_topic(child_id)
            if child_topic_words and isinstance(child_topic_words, list):
                child_keywords.extend([word for word, _ in child_topic_words[:5]])  # Top 5 keywords from each child
        
        # If no child content, use the hierarchical topic name
        if not child_questions and not child_keywords:
            # Get the name from hierarchical_topics DataFrame
            parent_row = hierarchical_topics[hierarchical_topics['Parent_ID'] == topic_id]
            if not parent_row.empty:
                synthetic_title = parent_row.iloc[0]['Parent_Name']
            else:
                synthetic_title = f"Topic Group {topic_id}"
        else:
            # Generate title based on child content
            depth = topic_depths.get(topic_id, None)
            synthetic_title = generate_llm_title(
                topic_id, 
                child_questions[:5],  # Use top 5 questions from children
                child_keywords[:10],  # Use top 10 keywords from children
                topn=5, 
                depth=depth, 
                max_depth=max_depth if max_depth > 0 else None
            )
        
        topic_id_to_title[topic_id] = synthetic_title
        
        # Add to topic_points for database storage
        topic_points.append(
            models.PointStruct(
                id=topic_id,
                vector={},
                payload={
                    "topic_id": topic_id,
                    "title": synthetic_title,
                    "label": f"Synthetic parent topic {topic_id}",
                    "keywords": child_keywords[:10],
                    "depth": depth,
                    "question_count": 0,  # Synthetic topics don't have direct questions
                    "is_synthetic": True,
                    "topic_type": "synthetic_parent",
                    "child_topics": child_topics,
                    "child_count": len(child_topics)
                }
            )
        )

# Print summary of generated titles
print("\n" + "="*50)
print("GENERATED TOPIC TITLES")
print("="*50)
for point in topic_points:
    topic_id = point.payload["topic_id"]
    title = point.payload["title"]
    keywords = point.payload["keywords"][:5]  # Show first 5 keywords
    keyword_str = ", ".join(keywords) if keywords else "No keywords"
    
    # Get topic count from topic_info
    topic_row = topic_info[topic_info['Topic'] == topic_id]
    count = topic_row.iloc[0]['Count'] if not topic_row.empty else 0
    
    print(f"Topic {topic_id}: '{title}' ({count} questions)")
    print(f"  Keywords: {keyword_str}")
    print()

# Insert into Qdrant
if not DRY_RUN:
    client.upsert(
        collection_name=COLLECTION_T,
        points=topic_points
    )
    print(f"✅ Topics collection created with {len(topic_points)} topics (including synthetic parent topics)")
    
    # Also persist hierarchy relationships
    if hierarchical_topics is not None:
        print("Persisting hierarchy relationships...")
        hierarchy_updates = []
        
        for _, row in hierarchical_topics.iterrows():
            parent_id = row['Parent_ID']
            child_left_id = row['Child_Left_ID']
            child_right_id = row['Child_Right_ID']
            distance = row['Distance']
            
            # Update children with parent relationship
            for child_id in [child_left_id, child_right_id]:
                hierarchy_updates.append(
                    models.PointStruct(
                        id=child_id,
                        vector={},
                        payload={
                            "parent_topic_id": parent_id,
                            "hierarchy_distance": float(distance)
                        }
                    )
                )
        
        # Apply hierarchy updates in batches
        BATCH_SIZE = 500
        for i in range(0, len(hierarchy_updates), BATCH_SIZE):
            batch = hierarchy_updates[i:i+BATCH_SIZE]
            client.update_payload(
                collection_name=COLLECTION_T,
                payload={point.payload for point in batch},
                points=[point.id for point in batch]
            )
        
        print(f"✅ Hierarchy relationships persisted for {len(hierarchy_updates)} topic relationships")
else:
    print("🔍 DRY RUN: Would create topics collection with labels and keywords (skipped)")
    print(f"🔍 DRY RUN: Would insert {len(topic_points)} topic points")
    if hierarchical_topics is not None:
        print(f"🔍 DRY RUN: Would persist {len(hierarchical_topics)} hierarchy relationships")

# -------------------------------
# 5. Print topic hierarchy
# -------------------------------
def print_topic_hierarchy(topic_model, questions, topic_info, topic_id_to_title):
    """Print the hierarchical topic structure with LLM-generated titles"""
    print("\n" + "="*50)
    print("TOPIC HIERARCHY WITH LLM TITLES")
    print("="*50)
    
    try:
        # Generate hierarchical topics
        hierarchical_topics = topic_model.hierarchical_topics(questions)
        print(f"Generated {len(hierarchical_topics)} hierarchical relationships")
        
        # Get the default tree structure
        tree = topic_model.get_topic_tree(hierarchical_topics)
        
        # Replace topic names in tree with LLM titles
        tree_lines = tree.split('\n')
        enhanced_tree_lines = []
        
        for line in tree_lines:
            enhanced_line = line
            # Look for topic IDs in the line (format: "Topic: XX")
            import re
            topic_matches = re.findall(r'Topic:\s*(\d+)', line)
            
            for topic_id_str in topic_matches:
                topic_id = int(topic_id_str)
                if topic_id in topic_id_to_title:
                    llm_title = topic_id_to_title[topic_id]
                    # Replace the topic reference with LLM title
                    enhanced_line = enhanced_line.replace(f"Topic: {topic_id}", f"Topic {topic_id}: {llm_title}")
            
            enhanced_tree_lines.append(enhanced_line)
        
        print("\nTopic Tree Structure with LLM Titles:")
        print('\n'.join(enhanced_tree_lines))
        
    except Exception as e:
        print(f"Error generating topic tree: {e}")
        print("Falling back to basic topic info with LLM titles...")
        
        # Fallback: print basic topic information with LLM titles
        print("\nBasic Topic Information with LLM Titles:")
        for _, row in topic_info.iterrows():
            topic_id = int(row["Topic"])
            if topic_id == -1:
                continue
            
            count = row['Count']
            llm_title = topic_id_to_title.get(topic_id, "No title")
            
            topic_words = topic_model.get_topic(topic_id)
            if topic_words and isinstance(topic_words, list):
                keywords = [word for word, _ in topic_words][:5]
                keyword_str = ", ".join(keywords)
            else:
                keyword_str = "No keywords"
            
            print(f"Topic {topic_id}: '{llm_title}' ({count} questions)")
            print(f"  Keywords: {keyword_str}")
    
    print("="*50)

# Print the hierarchy with LLM titles
print_topic_hierarchy(topic_model, valid_questions, topic_info, topic_id_to_title)

# -------------------------------
# 6. Add hierarchy to database (optional)
# -------------------------------
def persist_hierarchy_to_db():
    """Persist the hierarchical structure to the topics collection"""
    hier = topic_model.hierarchical_topics(valid_questions)
    if not DRY_RUN:
        if 'Child_Left_ID' in hier.columns and 'Child_Right_ID' in hier.columns and 'Parent_ID' in hier.columns:
            for _, row in hier.iterrows():
                parent = row['Parent_ID']
                child_left = row['Child_Left_ID']
                child_right = row['Child_Right_ID']
                
                # Update both children with their parent
                for child in [child_left, child_right]:
                    client.update_payload(
                        collection_name=COLLECTION_T,
                        payload={"parent_topic_id": parent},
                        points=[child]
                    )
        print("✅ Hierarchical structure stored in topics collection")
    else:
        print("🔍 DRY RUN: Would persist hierarchical structure to topics collection (skipped)")
        print(f"🔍 DRY RUN: Would update {len(hier)} hierarchy relationships")

print("\n" + "="*50)
print("DATABASE SUMMARY")
print("="*50)
print(f"Total topics saved: {len(topic_points)}")
original_topics = [p for p in topic_points if not p.payload.get("is_synthetic", False)]
synthetic_topics = [p for p in topic_points if p.payload.get("is_synthetic", False)]
print(f"  - Original topics: {len(original_topics)}")
print(f"  - Synthetic parent topics: {len(synthetic_topics)}")
if hierarchical_topics is not None:
    print(f"Hierarchy relationships: {len(hierarchical_topics)}")
print("="*50)
