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

# Extract embeddings with dimension validation
vectors = []
for p in all_points:
    if p.vector is not None:
        # Handle both list and dict vector formats
        if isinstance(p.vector, dict):
            # If vector is a dict, extract the actual vector array
            vector_data = p.vector.get('vector', p.vector.get('data', None))
        else:
            vector_data = p.vector
        
        if vector_data is not None:
            vectors.append(vector_data)

if not vectors:
    print("❌ No valid vectors found in points.")
    sys.exit(1)

# Check vector dimensions
vector_dims = [len(v) for v in vectors]
unique_dims = set(vector_dims)
print(f"Found vector dimensions: {unique_dims}")

if len(unique_dims) > 1:
    print(f"❌ Inconsistent vector dimensions found: {unique_dims}")
    print("Using only vectors with the most common dimension...")
    
    # Find most common dimension
    from collections import Counter
    dim_counts = Counter(vector_dims)
    most_common_dim = dim_counts.most_common(1)[0][0]
    print(f"Most common dimension: {most_common_dim} ({dim_counts[most_common_dim]} vectors)")
    
    # Filter to only vectors with the most common dimension
    valid_vector_indices = [i for i, dim in enumerate(vector_dims) if dim == most_common_dim]
    vectors = [vectors[i] for i in valid_vector_indices]
    
    # Also filter the corresponding points
    filtered_points = [all_points[i] for i in valid_vector_indices]
    all_points = filtered_points
    
    print(f"Filtered to {len(vectors)} vectors with consistent dimension {most_common_dim}")

try:
    embeddings = np.array(vectors)
    print(f"✅ Created embeddings array with shape: {embeddings.shape}")
except Exception as e:
    print(f"❌ Error creating embeddings array: {e}")
    print("First few vector shapes:", [np.array(v).shape for v in vectors[:5]])
    sys.exit(1)

# Re-extract IDs and questions after potential filtering
ids = [p.id for p in all_points]
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
def generate_llm_title(topic_id, questions, keywords, topn=5):
    """Generate a descriptive title for a topic using LLM"""
    try:
        # Get the most relevant questions (up to topn)
        sample_questions = questions[:topn]
        keywords_str = ", ".join(keywords[:10])  # Use top 10 keywords
        
        prompt = f"""Based on the following questions and keywords from a topic cluster, generate a concise, descriptive title (2-6 words) that captures the main theme:

Questions:
{chr(10).join(f"- {q}" for q in sample_questions)}

Keywords: {keywords_str}

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
        
        print(f"Generated title for topic {topic_id}: {title}")
        return title
        
    except Exception as e:
        print(f"Error generating LLM title for topic {topic_id}: {e}")
        # Fallback to simple label
        return generate_simple_label(topic_id, questions, topn=2)

def generate_simple_label(topic_id, questions, topn=3):
    """Fallback: simple version using first few questions"""
    sample_qs = questions[:topn]
    return " | ".join(sample_qs)

# Generate topic documents with LLM-generated titles
print("Generating LLM titles for topics...")
topic_points = []
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
    
    # Generate LLM title using questions and keywords
    llm_title = generate_llm_title(topic_id, rep_questions, keywords, topn=5)
    
    # Keep the simple label as backup
    simple_label = generate_simple_label(topic_id, rep_questions, topn=2)
    
    topic_points.append(
        models.PointStruct(
            id=topic_id,
            vector={},
            payload={
                "topic_id": topic_id,
                "title": llm_title,
                "label": simple_label,  # Keep as backup
                "keywords": keywords
            }
        )
    )

# Insert into Qdrant
if not DRY_RUN:
    client.upsert(
        collection_name=COLLECTION_T,
        points=topic_points
    )
    print("✅ Topics collection created with labels and keywords")
else:
    print("🔍 DRY RUN: Would create topics collection with labels and keywords (skipped)")
    print(f"🔍 DRY RUN: Would insert {len(topic_points)} topic points")

# -------------------------------
# 5. Print topic hierarchy
# -------------------------------
def print_topic_hierarchy(topic_model, questions, topic_info):
    """Print the hierarchical topic structure using BERTopic's get_topic_tree method"""
    print("\n" + "="*50)
    print("TOPIC HIERARCHY")
    print("="*50)
    
    try:
        # Generate hierarchical topics
        hierarchical_topics = topic_model.hierarchical_topics(questions)
        print(f"Generated {len(hierarchical_topics)} hierarchical relationships")
        
        # Use BERTopic's built-in tree visualization
        tree = topic_model.get_topic_tree(hierarchical_topics)
        print("\nTopic Tree Structure:")
        print(tree)
        
    except Exception as e:
        print(f"Error generating topic tree: {e}")
        print("Falling back to basic topic info...")
        
        # Fallback: just print basic topic information
        print("\nBasic Topic Information:")
        for _, row in topic_info.iterrows():
            topic_id = int(row["Topic"])
            if topic_id == -1:
                continue
            
            count = row['Count']
            topic_words = topic_model.get_topic(topic_id)
            if topic_words and isinstance(topic_words, list):
                keywords = [word for word, _ in topic_words][:5]
                keyword_str = ", ".join(keywords)
            else:
                keyword_str = "No keywords"
            
            print(f"Topic {topic_id}: {count} questions - {keyword_str}")
    
    print("="*50)

# Print the hierarchy
print_topic_hierarchy(topic_model, valid_questions, topic_info)

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

# Uncomment the line below to persist hierarchy to database
# persist_hierarchy_to_db()
