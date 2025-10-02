from qdrant_client import QdrantClient, models
from openai import OpenAI
import time
import os
import random
from dotenv import load_dotenv                                                                                                                                          
load_dotenv('../.env')                                                                                                                                                           

# --- Setup clients ---
qdrant = QdrantClient("http://localhost:6333", prefer_grpc=False)
openai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

COLLECTION = "default_topics"
COLLECTION_WITH_VECTORS = "default_topics_with_vectors"  # New collection for embeddings
BATCH_SIZE = 100  # adjust depending on your resources

def generate_embedding(text: str, max_retries=5):
    """Generate a vector embedding for the given text with exponential backoff."""
    for attempt in range(max_retries):
        try:
            response = openai.embeddings.create(
                input=text,
                model="text-embedding-3-small"  # or "text-embedding-3-large"
            )
            return response.data[0].embedding
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            
            # Check if it's a rate limit error
            if "rate_limit" in str(e).lower() or "429" in str(e):
                # Exponential backoff with jitter for rate limits
                wait_time = (2 ** attempt) + random.uniform(0, 1)
                print(f"Rate limit hit, waiting {wait_time:.1f}s before retry {attempt + 1}/{max_retries}")
                time.sleep(wait_time)
            else:
                # For other errors, shorter wait
                wait_time = 1 + random.uniform(0, 0.5)
                print(f"API error: {e}, retrying in {wait_time:.1f}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(wait_time)

def check_collection_info():
    """Check the collection configuration to understand vector setup."""
    try:
        collection_info = qdrant.get_collection(COLLECTION)
        print(f"Collection info: {collection_info}")
        return collection_info
    except Exception as e:
        print(f"Error getting collection info: {e}")
        return None

def create_vector_collection():
    """Create a new collection with proper vector configuration."""
    try:
        # Check if collection already exists
        try:
            qdrant.get_collection(COLLECTION_WITH_VECTORS)
            print(f"Collection {COLLECTION_WITH_VECTORS} already exists")
            return
        except:
            pass  # Collection doesn't exist, create it
        
        print(f"Creating collection {COLLECTION_WITH_VECTORS} with vector configuration...")
        qdrant.create_collection(
            collection_name=COLLECTION_WITH_VECTORS,
            vectors_config=models.VectorParams(
                size=1536,  # text-embedding-3-small dimension
                distance=models.Distance.COSINE
            )
        )
        print(f"Successfully created collection {COLLECTION_WITH_VECTORS}")
    except Exception as e:
        print(f"Error creating collection: {e}")
        raise

def update_all_points():
    # Check collection configuration first
    collection_info = check_collection_info()
    if collection_info:
        vectors_config = collection_info.config.params.vectors
        print(f"Vectors config: {vectors_config}")
    
    # Create the new collection with vectors
    create_vector_collection()
    
    # First, get total count for progress tracking
    print("Getting total point count...")
    count_result = qdrant.count(collection_name=COLLECTION)
    total_points = count_result.count
    print(f"Total points to process: {total_points}")
    
    offset = None
    total_updated = 0
    start_time = time.time()

    while True:
        # Step 1: Scroll through points in batches
        points, next_offset = qdrant.scroll(
            collection_name=COLLECTION,
            with_vectors=False,   # skip fetching vectors
            with_payload=True,    # need payload to get text
            limit=BATCH_SIZE,
            offset=offset
        )

        if not points:
            break

        updates = []
        for pt in points:
            text = pt.payload.get("title")
            if not text:
                continue

            try:
                # Step 2: Generate embedding
                emb = generate_embedding(text)

                # Step 3: Build update structure
                # Use unnamed vector for the new collection
                updates.append(
                    models.PointStruct(
                        id=pt.id,
                        vector=emb,  # Use unnamed vector
                        payload=pt.payload  # keep payload unchanged
                    )
                )
            except Exception as e:
                print(f"Error embedding point {pt.id}: {e}")
                # Continue with other points in the batch
                continue

        # Step 4: Upsert vectors to the new collection
        if updates:
            try:
                qdrant.upsert(
                    collection_name=COLLECTION_WITH_VECTORS,
                    points=updates
                )
                total_updated += len(updates)
                
                # Calculate progress and ETA
                progress_pct = (total_updated / total_points) * 100
                elapsed_time = time.time() - start_time
                if total_updated > 0:
                    avg_time_per_point = elapsed_time / total_updated
                    remaining_points = total_points - total_updated
                    eta_seconds = remaining_points * avg_time_per_point
                    eta_minutes = eta_seconds / 60
                    print(f"Updated {len(updates)} points | Progress: {total_updated}/{total_points} ({progress_pct:.1f}%) | ETA: {eta_minutes:.1f} min")
                else:
                    print(f"Updated {len(updates)} points (total: {total_updated})")
            except Exception as e:
                print(f"Error upserting batch to Qdrant: {e}")
                print("Continuing with next batch...")

        # Move to next batch
        offset = next_offset
        if offset is None:
            break

        # Throttle between batches to be respectful to APIs
        time.sleep(1.0)

    print(f"Finished. Total points updated with vectors: {total_updated}")

if __name__ == "__main__":
    update_all_points()
