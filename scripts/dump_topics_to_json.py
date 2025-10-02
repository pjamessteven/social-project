#!/usr/bin/env python3
"""
Script to dump topics from two Qdrant collections and create a hierarchical JSON structure.
"""

import json
import os
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue

def connect_to_qdrant():
    """Connect to Qdrant instance"""
    url = os.getenv("QDRANT_URL", "http://localhost:6333")
    return QdrantClient(url=url)

def fetch_collection_data(client, collection_name):
    """Fetch all points from a collection with is_synthetic=false"""
    try:
        # Get all points where is_synthetic is false
        response = client.scroll(
            collection_name=collection_name,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="is_synthetic",
                        match=MatchValue(value=False)
                    )
                ]
            ),
            limit=10000,  # Adjust as needed
            with_payload=True,
            with_vectors=False
        )
        
        points = response[0]  # First element is the list of points
        return [point.payload for point in points if point.payload]
    
    except Exception as e:
        print(f"Error fetching data from {collection_name}: {e}")
        return []

def process_topics(topics_data):
    """Process default_topics data"""
    processed_topics = {}
    
    for topic in topics_data:
        topic_id = topic.get('topic_id')
        if topic_id is not None:
            # Split label by | character to get individual questions
            label = topic.get('label', '')
            questions = [q.strip() for q in label.split('|') if q.strip()]
            
            processed_topics[topic_id] = {
                'title': topic.get('title', ''),
                'topic_id': topic_id,
                'question_count': topic.get('question_count', 0),
                'questions': questions
            }
    
    return processed_topics

def process_categories(categories_data):
    """Process default_topic_categories data"""
    processed_categories = []
    
    for category in categories_data:
        processed_category = {
            'category_id': category.get('topic_id', ''),
            'title': category.get('title', ''),
            'question_count': category.get('question_count', 0),
            'children_ids': []
        }
        
        # Extract topic_ids from children array
        children = category.get('children', [])
        if isinstance(children, list):
            for child in children:
                if isinstance(child, dict) and 'topic_id' in child:
                    processed_category['children_ids'].append(child['topic_id'])
        
        processed_categories.append(processed_category)
    
    return processed_categories

def create_hierarchical_structure(topics, categories):
    """Create hierarchical JSON structure with topics as children of categories"""
    result = []
    
    for category in categories:
        category_obj = {
            'title': category['title'],
            'question_count': category['question_count'],
            'children': []
        }
        
        # Add matching topics as children
        for topic_id in category['children_ids']:
            if topic_id in topics:
                category_obj['children'].append(topics[topic_id])
        
        # Sort children (topics) by question_count in descending order
        category_obj['children'].sort(key=lambda x: x['question_count'], reverse=True)
        
        result.append(category_obj)
    
    # Sort categories by question_count in descending order
    result.sort(key=lambda x: x['question_count'], reverse=True)
    
    return result

def main():
    """Main function to dump topics to JSON"""
    print("Connecting to Qdrant...")
    client = connect_to_qdrant()
    
    print("Fetching default_topics data...")
    topics_data = fetch_collection_data(client, "default_topics")
    print(f"Found {len(topics_data)} non-synthetic topics")
    
    print("Fetching default_topic_categories data...")
    categories_data = fetch_collection_data(client, "default_topic_categories")
    print(f"Found {len(categories_data)} non-synthetic categories")
    
    print("Processing data...")
    topics = process_topics(topics_data)
    categories = process_categories(categories_data)
    
    print("Creating hierarchical structure...")
    hierarchical_data = create_hierarchical_structure(topics, categories)
    
    # Output to JSON file
    output_file = "topics_hierarchy.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(hierarchical_data, f, indent=2, ensure_ascii=False)
    
    print(f"Data dumped to {output_file}")
    print(f"Total categories: {len(hierarchical_data)}")
    
    # Print summary
    total_topics = sum(len(cat['children']) for cat in hierarchical_data)
    print(f"Total topics mapped: {total_topics}")

if __name__ == "__main__":
    main()
