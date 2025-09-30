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

# Calculate topic hierarchy depth information
def calculate_topic_depths(topic_model, questions):
    """Calculate the depth of each topic in the hierarchy"""
    try:
        hierarchical_topics = topic_model.hierarchical_topics(questions)
        print(f"Hierarchical topics shape: {hierarchical_topics.shape}")
        print(f"Hierarchical topics columns: {hierarchical_topics.columns.tolist()}")
        
        # Build depth mapping
        topic_depths = {}
        max_depth = 0
        
        if len(hierarchical_topics) > 0 and 'Child_Left_ID' in hierarchical_topics.columns and 'Child_Right_ID' in hierarchical_topics.columns:
            # Build parent-child relationships
            children_to_parent = {}
            for _, row in hierarchical_topics.iterrows():
                parent = row['Parent_ID']
                child_left = row['Child_Left_ID']
                child_right = row['Child_Right_ID']
                
                # Only add relationships for topics that actually exist in the final model
                if child_left in topic_model.topic_labels_ and child_right in topic_model.topic_labels_:
                    children_to_parent[child_left] = parent
                    children_to_parent[child_right] = parent
            
            print(f"Found {len(children_to_parent)} parent-child relationships")
            
            # Calculate depths by traversing up the hierarchy
            def get_depth(topic_id):
                if topic_id in topic_depths:
                    return topic_depths[topic_id]
                
                if topic_id not in children_to_parent:
                    # This is a root topic
                    topic_depths[topic_id] = 0
                    return 0
                
                parent_depth = get_depth(children_to_parent[topic_id])
                depth = parent_depth + 1
                topic_depths[topic_id] = depth
                return depth
            
            # Calculate depth for all current topics (after reduction)
            current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
            current_topics.discard(-1)  # Remove outlier topic
            
            for topic_id in current_topics:
                if topic_id in children_to_parent or any(topic_id == parent for parent in children_to_parent.values()):
                    depth = get_depth(topic_id)
                    max_depth = max(max_depth, depth)
                else:
                    # Topic not in hierarchy, assign depth 0
                    topic_depths[topic_id] = 0
            
            print(f"Topic depths calculated: {dict(list(topic_depths.items())[:5])}...")  # Show first 5
        else:
            print("No hierarchical structure found or empty hierarchy")
            # Assign all topics depth 0
            current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
            current_topics.discard(-1)
            for topic_id in current_topics:
                topic_depths[topic_id] = 0
        
        print(f"Calculated topic depths: max_depth = {max_depth}, total topics with depth = {len(topic_depths)}")
        return topic_depths, max_depth
        
    except Exception as e:
        print(f"Error calculating topic depths: {e}")
        print("Assigning all topics depth 0 as fallback")
        # Fallback: assign all topics depth 0
        topic_depths = {}
        current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
        current_topics.discard(-1)
        for topic_id in current_topics:
            topic_depths[topic_id] = 0
        return topic_depths, 0


# -------------------------------
# 3. Run BERTopic with precomputed embeddings
# -------------------------------
print("Running BERTopic clustering...")
try:
    # Filter to only valid questions and their corresponding embeddings
    valid_questions = [questions[i] for i in valid_indices]
    valid_embeddings = embeddings[valid_indices]
    valid_ids = [ids[i] for i in valid_indices]
     #hdbscan_model=HDBSCAN(min_cluster_size=100), 
    topic_model = BERTopic(embedding_model=None, verbose=True)

    topics, probs = topic_model.fit_transform(valid_questions, valid_embeddings)

    print(f"Initial topics before reduction: {len(set(topics))}")
    
    # Calculate hierarchy BEFORE reducing topics
    print("Calculating topic hierarchy before reduction...")
    initial_topic_depths, initial_max_depth = calculate_topic_depths(topic_model, valid_questions)
    
    topic_model.reduce_topics(valid_questions, nr_topics=100)
    print(f"Topics after reduction: {len(set(topic_model.topics_))}")

    # Type guard to satisfy type checker
    if topic_model.topics_ is None:
        raise ValueError("Model topics_ is None after fitting")

    topics: List[int] = list(topic_model.topics_)

    print(f"✅ BERTopic completed. Found {len(set(topics))} topics")
except Exception as e:
    print(f"❌ Error during BERTopic clustering: {e}")
    sys.exit(1)

# Assign topic_id to each valid question using set_payload to preserve existing data
if not DRY_RUN:
    BATCH_SIZE = 500
    for i in range(0, len(valid_ids), BATCH_SIZE):
        batch_ids = valid_ids[i:i+BATCH_SIZE]
        batch_topics = topics[i:i+BATCH_SIZE]
        
        # Update each point individually to add topic_id without overwriting existing payload
        for qid, topic_id in zip(batch_ids, batch_topics):
            client.set_payload(
                collection_name=COLLECTION_Q,
                payload={"topic_id": int(topic_id)},
                points=[qid]
            )
        
        print(f"Updated batch {i//BATCH_SIZE + 1}: {len(batch_ids)} questions with topic_id")
    
    print("✅ Questions updated with topic_id (preserving original data)")
else:
    print("🔍 DRY RUN: Would update questions with topic_id using set_payload (skipped)")

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
def generate_llm_title(topic_id, questions, keywords, depth=0, max_depth=1, topn=5):
    """Generate a descriptive title for a topic using LLM with depth awareness"""
    try:
        # Get the most relevant questions (up to topn)
        sample_questions = questions[:topn]
        keywords_str = ", ".join(keywords[:10])  # Use top 10 keywords
        
        # Determine granularity based on depth
        if max_depth <= 1:
            granularity_instruction = "Generate a broad, general title that covers the main theme."
        elif depth == 0:
            granularity_instruction = "Generate a broad, high-level title that covers the main theme."
        elif depth == max_depth:
            granularity_instruction = "Generate a very specific, detailed title that captures the precise subtopic."
        else:
            granularity_instruction = f"Generate a moderately specific title (depth {depth} of {max_depth}) that balances breadth and specificity."
        
        prompt = f"""Based on the following questions and keywords from a topic cluster, generate a concise, descriptive title (2-6 words) that captures the main theme:

Questions:
{chr(10).join(f"- {q}" for q in sample_questions)}

Keywords: {keywords_str}

Topic Hierarchy Context:
- Current depth: {depth} (0 = top level)
- Maximum depth: {max_depth}
- Granularity guidance: {granularity_instruction}

Generate a clear, specific title that someone browsing topics would understand. Focus on the main subject matter, not generic phrases. Adjust the specificity based on the hierarchy depth provided.

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
        
        print(f"Generated title for topic {topic_id} (depth {depth}/{max_depth}): {title}")
        return title
        
    except Exception as e:
        print(f"Error generating LLM title for topic {topic_id}: {e}")
        # Fallback to simple label
        return generate_simple_label(topic_id, questions, topn=2)

def generate_simple_label(topic_id, questions, topn=3):
    """Fallback: simple version using first few questions"""
    sample_qs = questions[:topn]
    return " | ".join(sample_qs)


# Map initial hierarchy depths to reduced topics
print("Mapping hierarchy depths to reduced topics...")
topic_depths = {}

# Get the topic mapping from original to reduced
topic_mapping = topic_model.topic_mapper_.get_mappings()
print(f"Topic mapping available: {topic_mapping is not None}")

if topic_mapping and initial_topic_depths:
    # Map depths from original topics to reduced topics
    for original_topic, reduced_topic in topic_mapping.items():
        if original_topic in initial_topic_depths:
            if reduced_topic not in topic_depths:
                topic_depths[reduced_topic] = initial_topic_depths[original_topic]
            else:
                # If multiple original topics map to same reduced topic, take minimum depth
                topic_depths[reduced_topic] = min(topic_depths[reduced_topic], initial_topic_depths[original_topic])
    
    print(f"Mapped {len(topic_depths)} topic depths from original to reduced topics")
    
    # Recalculate max_depth based on the mapped depths
    max_depth = max(topic_depths.values()) if topic_depths else 0
else:
    print("No topic mapping available, assigning depth 0 to all topics")
    # Fallback: assign all current topics depth 0
    current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
    current_topics.discard(-1)
    for topic_id in current_topics:
        topic_depths[topic_id] = 0
    max_depth = 0

# Ensure all current topics have a depth assigned
current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
current_topics.discard(-1)
for topic_id in current_topics:
    if topic_id not in topic_depths:
        topic_depths[topic_id] = 0

print(f"Final topic depths: max_depth = {max_depth}, topics with depth = {len(topic_depths)}")

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
    
    # Get depth for this topic (default to 0 if not found)
    depth = topic_depths.get(topic_id, 0)
    
    # Generate LLM title using questions, keywords, and hierarchy depth
    llm_title = generate_llm_title(topic_id, rep_questions, keywords, depth, max_depth, topn=5)
    
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
                "keywords": keywords,
                "depth": depth,
                "max_depth": max_depth
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
                    client.set_payload(
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
