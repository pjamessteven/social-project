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
            # Build parent-child relationships using ALL topics in hierarchy (not just final topics)
            children_to_parent = {}
            all_hierarchy_topics = set()
            
            for _, row in hierarchical_topics.iterrows():
                parent = row['Parent_ID']
                child_left = row['Child_Left_ID']
                child_right = row['Child_Right_ID']
                
                # Add all relationships - don't filter by final topics yet
                children_to_parent[child_left] = parent
                children_to_parent[child_right] = parent
                all_hierarchy_topics.update([parent, child_left, child_right])
            
            print(f"Found {len(children_to_parent)} parent-child relationships")
            print(f"All topics in hierarchy: {len(all_hierarchy_topics)}")
            
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
            
            # Calculate depths for ALL topics in the hierarchy first
            for topic_id in all_hierarchy_topics:
                depth = get_depth(topic_id)
                max_depth = max(max_depth, depth)
            
            print(f"Calculated depths for {len(topic_depths)} topics, max_depth = {max_depth}")
            print(f"Sample topic depths: {dict(list(topic_depths.items())[:10])}")
            
        else:
            print("No hierarchical structure found or empty hierarchy")
            # Assign all topics depth 0
            current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
            current_topics.discard(-1)
            for topic_id in current_topics:
                topic_depths[topic_id] = 0
        
        print(f"Final topic depths: max_depth = {max_depth}, total topics with depth = {len(topic_depths)}")
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
    
    topic_model.reduce_topics(valid_questions, nr_topics=10)
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
            vectors_config={}  # no vectors needed for topics collection
        )
else:
    print("🔍 DRY RUN: Would create/check topics collection (skipped)")

topic_info = topic_model.get_topic_info()

# Collect representative questions per topic
topic_to_questions = defaultdict(list)
for q, t in zip(valid_questions, topics):
    topic_to_questions[t].append(q)

# Generate labels using LLM
def generate_llm_title(topic_id, questions, keywords, depth=0, max_depth=1, topn=10, parent_title=None):
    """Generate a descriptive title for a topic using LLM with depth awareness"""
    try:
        # Get the most relevant questions (up to topn)
        sample_questions = questions[:topn]
        keywords_str = ", ".join(keywords[:10])  # Use top 10 keywords
        
        # Add context about parent topic if available
        parent_context = ""
        if parent_title and depth > 0:
            parent_context = f"\nParent topic: {parent_title}\nGenerate a title that is more specific than the parent topic."
        
        # Determine granularity based on depth
        if max_depth <= 1:
            granularity_instruction = "Generate a broad, general title that covers the main theme."
        elif depth == 0:
            granularity_instruction = "Generate a broad, high-level title that encompasses major themes."
        elif depth == max_depth:
            granularity_instruction = "Generate a very specific, detailed title that captures precise subtopics and distinguishes this from sibling topics."
        else:
            granularity_instruction = f"Generate a moderately specific title (depth {depth}/{max_depth}) that is more specific than parent topics but broader than leaf topics."
        
        prompt = f"""Based on the following questions and keywords from a topic cluster, generate a concise, descriptive title (2-6 words) that captures the main theme:

Questions:
{chr(10).join(f"- {q}" for q in sample_questions)}

Keywords: {keywords_str}

Hierarchy Context:
- Current depth: {depth} (0 = top level)
- Maximum depth: {max_depth}
- {granularity_instruction}{parent_context}

Focus on what makes this topic distinct from its siblings and parent. Avoid generic terms.
Respond with only the title, do not include any notes.
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

def generate_differentiated_title(topic_id, questions, keywords, depth, max_depth, sibling_titles=None, parent_title=None):
    """Generate a title that's differentiated from sibling topics"""
    # Generate initial title
    initial_title = generate_llm_title(topic_id, questions, keywords, depth, max_depth, parent_title=parent_title)
    
    # If we have sibling titles, try to differentiate
    if sibling_titles and len(sibling_titles) > 0:
        differentiation_prompt = f"""
The initial title "{initial_title}" might be too similar to sibling topics: {', '.join(sibling_titles)}

Based on the same questions and keywords, generate a more distinctive title that clearly differentiates this topic from its siblings while remaining accurate.

Questions: {chr(10).join(f"- {q}" for q in questions[:5])}
Keywords: {', '.join(keywords[:8])}

Distinctive title:"""
        
        try:
            response = openai_client.chat.completions.create(
                model="deepseek/deepseek-chat-v3.1",
                messages=[{"role": "user", "content": differentiation_prompt}],
                max_tokens=50,
                temperature=0.4
            )
            differentiated_title = response.choices[0].message.content.strip().strip('"\'')
            print(f"Differentiated title for topic {topic_id}: {differentiated_title}")
            return differentiated_title
        except Exception as e:
            print(f"Error generating differentiated title for topic {topic_id}: {e}")
            return initial_title
    
    return initial_title

def generate_simple_label(topic_id, questions, topn=3):
    """Fallback: simple version using first few questions"""
    sample_qs = questions[:topn]
    return " | ".join(sample_qs)


# Map initial hierarchy depths to reduced topics
print("Mapping hierarchy depths to reduced topics...")
final_topic_depths = {}

# Get the topic mapping from original to reduced
topic_mapping = topic_model.topic_mapper_.get_mappings()
print(f"Topic mapping available: {topic_mapping is not None}")

if topic_mapping and initial_topic_depths:
    print(f"Initial topic depths available: {len(initial_topic_depths)} topics")
    print(f"Topic mapping entries: {len(topic_mapping)}")
    
    # Map depths from original topics to reduced topics
    mapped_count = 0
    for original_topic, reduced_topic in topic_mapping.items():
        if original_topic in initial_topic_depths:
            if reduced_topic not in final_topic_depths:
                final_topic_depths[reduced_topic] = initial_topic_depths[original_topic]
                mapped_count += 1
            else:
                # If multiple original topics map to same reduced topic, take minimum depth
                final_topic_depths[reduced_topic] = min(final_topic_depths[reduced_topic], initial_topic_depths[original_topic])
    
    print(f"Successfully mapped {mapped_count} topic depths from original to reduced topics")
    
    # Also include synthetic topics that weren't reduced
    for topic_id, depth in initial_topic_depths.items():
        if topic_id not in topic_mapping and topic_id not in final_topic_depths:
            # This is likely a synthetic topic that wasn't reduced
            final_topic_depths[topic_id] = depth
            print(f"Added synthetic topic {topic_id} with depth {depth}")
    
    # Debug: print some sample depths
    if final_topic_depths:
        sample_depths = dict(list(final_topic_depths.items())[:10])
        print(f"Sample final topic depths: {sample_depths}")
        depth_values = list(final_topic_depths.values())
        print(f"Depth values range: min={min(depth_values)}, max={max(depth_values)}")
    
    # Recalculate max_depth based on the mapped depths
    max_depth = max(final_topic_depths.values()) if final_topic_depths else 0
    print(f"Calculated max_depth from mapped depths: {max_depth}")
else:
    print("No topic mapping or initial depths available, assigning depth 0 to all topics")
    # Fallback: assign all current topics depth 0
    current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
    current_topics.discard(-1)
    for topic_id in current_topics:
        final_topic_depths[topic_id] = 0
    max_depth = 0

# Ensure all current topics have a depth assigned
current_topics = set(topic_model.get_topic_info()['Topic'].tolist())
current_topics.discard(-1)
for topic_id in current_topics:
    if topic_id not in final_topic_depths:
        final_topic_depths[topic_id] = 0
        print(f"Assigned default depth 0 to topic {topic_id}")

print(f"Final topic depths: max_depth = {max_depth}, topics with depth = {len(final_topic_depths)}")

# Use final_topic_depths instead of topic_depths for the rest of the code
topic_depths = final_topic_depths

# Generate topic documents with LLM-generated titles
print("Generating LLM titles for topics...")

# First, build the complete hierarchy structure including synthetic topics
def build_complete_hierarchy():
    """Build complete hierarchy including synthetic parent topics"""
    hier = topic_model.hierarchical_topics(valid_questions)
    
    # Get all topics that exist after reduction (leaf topics)
    leaf_topics = set(topic_model.get_topic_info()['Topic'].tolist())
    leaf_topics.discard(-1)  # Remove outlier topic
    
    # Get all topics mentioned in the hierarchy (before reduction)
    all_hierarchy_topics = set()
    parent_to_children = defaultdict(list)
    child_to_parent = {}
    
    print(f"Hierarchy dataframe shape: {hier.shape}")
    print(f"Hierarchy columns: {hier.columns.tolist()}")
    print(f"Final leaf topics after reduction: {sorted(list(leaf_topics))}")
    
    if len(hier) > 0 and 'Child_Left_ID' in hier.columns and 'Child_Right_ID' in hier.columns and 'Parent_ID' in hier.columns:
        print(f"Processing {len(hier)} hierarchy relationships...")
        
        for _, row in hier.iterrows():
            # Convert to int to ensure consistent types
            parent = int(row['Parent_ID'])
            child_left = int(row['Child_Left_ID'])
            child_right = int(row['Child_Right_ID'])
            
            # Track all topics in hierarchy
            all_hierarchy_topics.update([parent, child_left, child_right])
            
            # Track parent-child relationships (using original topic IDs)
            parent_to_children[parent].extend([child_left, child_right])
            child_to_parent[child_left] = parent
            child_to_parent[child_right] = parent
        
        print(f"All topics in original hierarchy: {len(all_hierarchy_topics)}")
        print(f"Built parent_to_children mapping with {len(parent_to_children)} parents")
        
        # Identify synthetic topics: those in hierarchy but not in final leaf topics
        synthetic_topics = all_hierarchy_topics - leaf_topics
        print(f"Synthetic topics (in hierarchy but not final): {sorted(list(synthetic_topics))}")
        
        # Debug: show some parent-child relationships
        sample_relationships = dict(list(parent_to_children.items())[:5])
        print(f"Sample parent_to_children: {sample_relationships}")
        
        # Verify that synthetic topics actually have children
        valid_synthetic_topics = set()
        for synthetic_topic in synthetic_topics:
            if synthetic_topic in parent_to_children:
                children = parent_to_children[synthetic_topic]
                print(f"Synthetic topic {synthetic_topic} has children: {children}")
                valid_synthetic_topics.add(synthetic_topic)
            else:
                print(f"Warning: Synthetic topic {synthetic_topic} has no children in hierarchy")
        
        synthetic_topics = valid_synthetic_topics
        
    else:
        print("No valid hierarchy data found")
        synthetic_topics = set()
    
    print(f"Found {len(leaf_topics)} leaf topics and {len(synthetic_topics)} valid synthetic parent topics")
    print(f"Sample leaf topics: {list(leaf_topics)[:10]}")
    print(f"Valid synthetic topics: {sorted(list(synthetic_topics))}")
    
    return leaf_topics, synthetic_topics, parent_to_children, child_to_parent

def map_to_reduced_topic(original_topic_id):
    """Map an original topic ID to its reduced topic ID"""
    topic_mapping = topic_model.topic_mapper_.get_mappings()
    if topic_mapping and original_topic_id in topic_mapping:
        return topic_mapping[original_topic_id]
    
    # For topics not in mapping, check if they exist in the final model
    final_topics = set(topic_model.get_topic_info()['Topic'].tolist())
    final_topics.discard(-1)
    
    if original_topic_id in final_topics:
        return original_topic_id  # This topic survived reduction unchanged
    else:
        return None  # This topic was reduced away or is synthetic

def get_aggregated_questions_for_synthetic_topic(topic_id, parent_to_children, leaf_topics, max_questions=10):
    """Get hierarchical representative questions for a synthetic topic based on depth"""
    depth = topic_depths.get(topic_id, 0)
    
    # Adjust selection strategy based on depth
    if depth == 0:  # Root level - very broad
        questions_per_leaf = 1  # Fewer questions per leaf for broader coverage
        max_questions = 15
    elif depth == max_depth:  # Deepest level - most specific
        questions_per_leaf = 8  # More questions per leaf for specificity
        max_questions = 15
    else:  # Middle levels
        questions_per_leaf = 4
        max_questions = 15
    
    def get_questions_by_distance(topic_id, max_distance=None):
        """Get questions organized by distance from current topic"""
        questions_by_distance = defaultdict(list)
        
        def collect_questions(current_topic, distance=0, visited=None):
            if visited is None:
                visited = set()
            
            current_topic = int(current_topic)
            if current_topic in visited:
                return
            visited.add(current_topic)
            
            if max_distance is not None and distance > max_distance:
                return
                
            if current_topic in leaf_topics:
                # This is a leaf - get its questions
                reduced_topic = map_to_reduced_topic(current_topic)
                if reduced_topic and reduced_topic in topic_to_questions:
                    questions_by_distance[distance].extend(topic_to_questions[reduced_topic][:questions_per_leaf])
            elif current_topic in parent_to_children:
                # Recurse to children
                for child in parent_to_children[current_topic]:
                    collect_questions(int(child), distance + 1, visited.copy())
        
        collect_questions(topic_id)
        return questions_by_distance
    
    print(f"Finding hierarchical questions for synthetic topic {topic_id} (depth {depth}/{max_depth})...")
    
    # Get questions organized by distance
    if depth == 0:
        # Root level: sample from all distances but prefer closer ones
        questions_by_distance = get_questions_by_distance(topic_id)
        all_questions = []
        for distance in sorted(questions_by_distance.keys()):
            # Take fewer questions from more distant topics
            take_count = max(1, max_questions // (2 ** distance))
            all_questions.extend(questions_by_distance[distance][:take_count])
            print(f"  Distance {distance}: took {min(take_count, len(questions_by_distance[distance]))} questions")
    else:
        # Deeper levels: focus on immediate children only
        max_distance = 1 if depth >= max_depth - 1 else 2
        questions_by_distance = get_questions_by_distance(topic_id, max_distance)
        all_questions = []
        for distance in sorted(questions_by_distance.keys()):
            all_questions.extend(questions_by_distance[distance])
            print(f"  Distance {distance}: took {len(questions_by_distance[distance])} questions")
    
    print(f"Synthetic topic {topic_id} collected {len(all_questions)} hierarchical questions")
    return all_questions[:max_questions]

def get_aggregated_keywords_for_synthetic_topic(topic_id, parent_to_children, leaf_topics):
    """Get depth-aware aggregated keywords for a synthetic topic"""
    depth = topic_depths.get(topic_id, 0)
    
    def get_all_descendant_leaves(topic_id):
        # Ensure topic_id is int for consistent comparison
        topic_id = int(topic_id)
        descendants = []
        if topic_id in leaf_topics:
            # This is a leaf topic
            descendants.append(topic_id)
        elif topic_id in parent_to_children:
            for child in parent_to_children[topic_id]:
                descendants.extend(get_all_descendant_leaves(int(child)))
        return descendants
    
    # Get all leaf descendants
    descendant_leaves = get_all_descendant_leaves(topic_id)
    
    # Collect keywords from all descendant leaf topics
    keyword_counts = defaultdict(float)
    keywords_found = 0
    for leaf_topic in descendant_leaves:
        # Map the original leaf topic to its reduced topic ID
        reduced_topic = map_to_reduced_topic(leaf_topic)
        if reduced_topic is not None:
            topic_words = topic_model.get_topic(reduced_topic)
            if topic_words and isinstance(topic_words, list):
                for word, score in topic_words[:10]:  # Top 10 keywords from each leaf
                    keyword_counts[word] += score
                keywords_found += len(topic_words[:10])
            else:
                print(f"  No keywords found for reduced topic {reduced_topic}")
        else:
            print(f"  Skipped leaf topic {leaf_topic} (no valid reduced topic)")
    
    print(f"Synthetic topic {topic_id} aggregated {keywords_found} keywords from {len(descendant_leaves)} leaves")
    
    # Filter keywords based on depth
    if depth == 0:
        # Root level: prefer broader, more general terms
        # Filter out very specific terms
        filtered_keywords = {}
        for word, score in keyword_counts.items():
            # Skip very specific terms at root level
            if not any(specific in word.lower() for specific in ['specific', 'particular', 'exact', '_']):
                filtered_keywords[word] = score
        keyword_counts = filtered_keywords
        print(f"  Root level: filtered to {len(keyword_counts)} broader keywords")
        
    elif depth == max_depth:
        # Deepest level: prefer more specific terms
        # Boost scores for compound words or specific terms
        for word in keyword_counts:
            if '_' in word or len(word) > 8:  # Compound or longer words tend to be more specific
                keyword_counts[word] *= 1.5
        print(f"  Deep level: boosted specific keyword scores")
    
    # Sort by aggregated score and return top keywords
    sorted_keywords = sorted(keyword_counts.items(), key=lambda x: x[1], reverse=True)
    return [word for word, _ in sorted_keywords[:15]]  # Top 15 aggregated keywords

# Build complete hierarchy
leaf_topics, synthetic_topics, parent_to_children, child_to_parent = build_complete_hierarchy()

topic_points = []

# Process leaf topics (actual document clusters)
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
    simple_label = generate_simple_label(topic_id, rep_questions, topn=15)
    
    topic_points.append(
        models.PointStruct(
            id=topic_id,
            vector={},
            payload={
                "topic_id": topic_id,
                "title": llm_title,
                "label": simple_label,
                "keywords": keywords,
                "depth": depth,
                "max_depth": max_depth,
                "is_synthetic": False,
                "question_count": len(rep_questions)
            }
        )
    )

# Process synthetic parent topics with sibling awareness
print(f"Processing {len(synthetic_topics)} synthetic parent topics...")

# Group synthetic topics by parent to handle siblings together
topics_by_parent = defaultdict(list)
for synthetic_topic_id in synthetic_topics:
    parent_id = None
    # Find parent of this synthetic topic
    for parent, children in parent_to_children.items():
        if synthetic_topic_id in children:
            parent_id = parent
            break
    topics_by_parent[parent_id].append(synthetic_topic_id)

# Process each group of siblings together
for parent_id, sibling_topics in topics_by_parent.items():
    sibling_titles = []
    
    for synthetic_topic_id in sibling_topics:
        # Get aggregated questions from all descendant leaf topics
        aggregated_questions = get_aggregated_questions_for_synthetic_topic(
            synthetic_topic_id, parent_to_children, leaf_topics, max_questions=15
        )
        
        # Get aggregated keywords from all descendant leaf topics
        aggregated_keywords = get_aggregated_keywords_for_synthetic_topic(
            synthetic_topic_id, parent_to_children, leaf_topics
        )
        
        # Get depth for this synthetic topic
        depth = topic_depths.get(synthetic_topic_id, 0)
        
        # Get parent title if available
        parent_title = None
        if parent_id is not None:
            # Look for parent title in already processed topics
            for point in topic_points:
                if point.id == parent_id:
                    parent_title = point.payload.get("title")
                    break
        
        # Generate differentiated LLM title for synthetic topic
        llm_title = generate_differentiated_title(
            synthetic_topic_id, aggregated_questions, aggregated_keywords, 
            depth, max_depth, sibling_titles, parent_title
        )
        
        sibling_titles.append(llm_title)  # Add to sibling titles for next iteration
        
        # Generate simple label from aggregated questions
        simple_label = generate_simple_label(synthetic_topic_id, aggregated_questions, topn=15)
        
        topic_points.append(
            models.PointStruct(
                id=synthetic_topic_id,
                vector={},
                payload={
                    "topic_id": synthetic_topic_id,
                    "title": llm_title,
                    "label": simple_label,
                    "keywords": aggregated_keywords,
                    "depth": depth,
                    "max_depth": max_depth,
                    "is_synthetic": True,
                    "question_count": len(aggregated_questions),
                    "child_topics": parent_to_children.get(synthetic_topic_id, [])
                }
            )
        )

print(f"Generated {len(topic_points)} total topics ({len(leaf_topics)} leaf + {len(synthetic_topics)} synthetic)")

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
            # Get list of existing topic IDs in the collection (now includes synthetic topics)
            existing_topic_ids = set()
            for point in topic_points:
                existing_topic_ids.add(point.id)
            
            print(f"Found {len(existing_topic_ids)} existing topics in collection (including synthetic)")
            
            updated_count = 0
            for _, row in hier.iterrows():
                parent = row['Parent_ID']
                child_left = row['Child_Left_ID']
                child_right = row['Child_Right_ID']
                
                # Update both children with their parent - now both should exist in collection
                for child in [child_left, child_right]:
                    if child in existing_topic_ids:
                        try:
                            client.set_payload(
                                collection_name=COLLECTION_T,
                                payload={"parent_topic_id": int(parent)},
                                points=[int(child)]
                            )
                            updated_count += 1
                        except Exception as e:
                            print(f"Warning: Failed to update topic {child} with parent {parent}: {e}")
                    else:
                        print(f"Warning: Topic {child} not found in collection")
            
            print(f"✅ Hierarchical structure stored: updated {updated_count} topics with parent relationships")
        else:
            print("No hierarchical columns found in hierarchy data")
    else:
        print("🔍 DRY RUN: Would persist hierarchical structure to topics collection (skipped)")
        print(f"🔍 DRY RUN: Would update {len(hier)} hierarchy relationships")

# Persist hierarchy to database
persist_hierarchy_to_db()
