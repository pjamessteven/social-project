from qdrant_client import QdrantClient, models
from bertopic import BERTopic
import numpy as np
import pandas as pd
from collections import defaultdict

# -------------------------------
# 1. Connect to Qdrant
# -------------------------------
client = QdrantClient(
    url="http://localhost:6333",
    api_key=None 
)

COLLECTION_Q = "default_questions"
COLLECTION_T = "default_topics"

# -------------------------------
# 2. Load all questions + vectors
# -------------------------------
all_points = []
next_page = None

while True:
    points, next_page = client.scroll(
        collection_name=COLLECTION_Q,
        limit=1000,
        with_payload=True,
        with_vectors=True,
        offset=next_page,
    )
    all_points.extend(points)
    if next_page is None:
        break

print(f"Loaded {len(all_points)} vectors from Qdrant")

ids = [p.id for p in all_points]
questions = [p.payload["text"] for p in all_points]
embeddings = np.array([p.vector for p in all_points])

# -------------------------------
# 3. Run BERTopic with precomputed embeddings
# -------------------------------
topic_model = BERTopic(embedding_model=None, verbose=True)
topics, probs = topic_model.fit_transform(questions, embeddings)

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
"""
BATCH_SIZE = 500
for i in range(0, len(updates), BATCH_SIZE):
    client.upsert(
        collection_name=COLLECTION_Q,
        points=updates[i:i+BATCH_SIZE]
    )
"""
print("✅ Questions updated with topic_id")

# -------------------------------
# 4. Build topics collection
# -------------------------------
# Create collection if not exists
try:
    client.get_collection(COLLECTION_T)
except:
    client.create_collection(
        collection_name=COLLECTION_T,
        vectors_config=models.VectorParams(size=0, distance="Cosine")  # no vectors needed
    )

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
client.upsert(
    collection_name=COLLECTION_T,
    points=topic_points
)

print("✅ Topics collection created with labels and keywords")

# -------------------------------
# 5. Add hierarchy (optional)
# -------------------------------
hier = topic_model.hierarchical_topics(questions)
for child, parent in hier:
    client.update_payload(
        collection_name=COLLECTION_T,
        payload={"parent_topic_id": parent},
        points=[child]
    )

print("✅ Hierarchical structure stored in topics collection")
