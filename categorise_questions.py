from qdrant_client import QdrantClient, models
from bertopic import BERTopic
import numpy as np
import pandas as pd
from collections import defaultdict
import sys

# -------------------------------
# 1. Parse command line arguments and connect to Qdrant
# -------------------------------
DRY_RUN = "--dry-run" in sys.argv

if DRY_RUN:
    print("🔍 DRY RUN MODE: No database writes will be performed")
else:
    print("💾 LIVE MODE: Database writes will be performed")

client = QdrantClient(
    url="http://localhost:6333",
    api_key=None 
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
            limit=50000,
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
        sys.exit(1)

print(f"✅ Loaded {len(all_points)} vectors from Qdrant")

if len(all_points) == 0:
    print("❌ No points found in collection. Exiting.")
    sys.exit(1)

print("Extracting data from points...")
ids = [p.id for p in all_points]
questions = [p.payload.get("text", "") for p in all_points if p.payload and "text" in p.payload]
embeddings = np.array([p.vector for p in all_points if p.vector is not None])

print(f"Extracted {len(ids)} IDs, {len(questions)} questions, {len(embeddings)} embeddings")

if len(questions) == 0:
    print("❌ No questions found in payloads. Check that points have 'text' field.")
    sys.exit(1)

if len(embeddings) == 0:
    print("❌ No embeddings found. Check that points have vectors.")
    sys.exit(1)

# -------------------------------
# 3. Run BERTopic with precomputed embeddings
# -------------------------------
print("Running BERTopic clustering...")
try:
    topic_model = BERTopic(embedding_model=None, verbose=True)
    topics, probs = topic_model.fit_transform(questions, embeddings)
    print(f"✅ BERTopic completed. Found {len(set(topics))} topics")
except Exception as e:
    print(f"❌ Error during BERTopic clustering: {e}")
    sys.exit(1)

# Assign topic_id to each question
updates = []
for idx, qid in enumerate(ids):
    updates.append(
        models.PointStruct(
            id=qid,
            vector=None,
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
            vectors_config=models.VectorParams(size=0, distance="Cosine")  # no vectors needed
        )
else:
    print("🔍 DRY RUN: Would create/check topics collection (skipped)")

topic_info = topic_model.get_topic_info()

# Collect representative questions per topic
topic_to_questions = defaultdict(list)
for q, t in zip(questions, topics):
    topic_to_questions[t].append(q)

# Generate labels (simple version: use first few questions)
def generate_label(topic_id, questions, topn=3):
    sample_qs = questions[:topn]
    return " | ".join(sample_qs)

# Generate topic documents
topic_points = []
for _, row in topic_info.iterrows():
    topic_id = int(row["Topic"])
    if topic_id == -1:
        continue  # -1 = outliers

    rep_questions = topic_to_questions[topic_id]
    label = generate_label(topic_id, rep_questions, topn=2)

    keywords = [word for word, _ in topic_model.get_topic(topic_id)]
    topic_points.append(
        models.PointStruct(
            id=topic_id,
            vector=None,
            payload={
                "topic_id": topic_id,
                "label": label,
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
    """Print the hierarchical topic structure without persisting to database"""
    print("\n" + "="*50)
    print("TOPIC HIERARCHY")
    print("="*50)
    
    hier = topic_model.hierarchical_topics(questions)
    
    # Build parent-child mapping
    children_map = defaultdict(list)
    for child, parent in hier:
        children_map[parent].append(child)
    
    # Find root topics (topics that are not children of any other topic)
    all_children = set(child for child, parent in hier)
    all_parents = set(parent for child, parent in hier)
    roots = all_parents - all_children
    
    def print_topic_tree(topic_id, level=0):
        indent = "  " * level
        
        # Get topic info
        topic_row = topic_info[topic_info['Topic'] == topic_id]
        if not topic_row.empty:
            count = topic_row.iloc[0]['Count']
            keywords = [word for word, _ in topic_model.get_topic(topic_id)][:5]
            keyword_str = ", ".join(keywords) if keywords else "No keywords"
            
            print(f"{indent}Topic {topic_id}: {count} questions")
            print(f"{indent}  Keywords: {keyword_str}")
        else:
            print(f"{indent}Topic {topic_id}: (no info)")
        
        # Print children recursively
        for child in sorted(children_map[topic_id]):
            print_topic_tree(child, level + 1)
    
    # Print hierarchy starting from roots
    for root in sorted(roots):
        print_topic_tree(root)
        print()
    
    print(f"Total hierarchy relationships: {len(hier)}")
    print("="*50)

# Print the hierarchy
print_topic_hierarchy(topic_model, questions, topic_info)

# -------------------------------
# 6. Add hierarchy to database (optional)
# -------------------------------
def persist_hierarchy_to_db():
    """Persist the hierarchical structure to the topics collection"""
    hier = topic_model.hierarchical_topics(questions)
    if not DRY_RUN:
        for child, parent in hier:
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
