import os
import sys
import pandas as pd
import spacy
import re
from datetime import datetime
from typing import List, Dict, Tuple, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TimelineGenerator:
    def __init__(self):
        """Initialize the timeline generator with database connection and spaCy model."""
        self.db_connection = None
        self.nlp = None
        self._setup_database()
        self._setup_spacy()
    
    def _setup_database(self):
        """Setup database connection."""
        try:
            self.db_connection = psycopg2.connect(
                host=os.getenv('DB_HOST', 'localhost'),
                database=os.getenv('DB_NAME'),
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD'),
                port=os.getenv('DB_PORT', 5432)
            )
            print("✅ Database connection established")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            sys.exit(1)
    
    def _setup_spacy(self):
        """Setup spaCy model for NLP processing."""
        try:
            # Try to load the model, download if not available
            try:
                self.nlp = spacy.load("en_core_web_sm")
            except OSError:
                print("📥 Downloading spaCy English model...")
                os.system("python -m spacy download en_core_web_sm")
                self.nlp = spacy.load("en_core_web_sm")
            
            print("✅ spaCy model loaded")
        except Exception as e:
            print(f"❌ spaCy setup failed: {e}")
            sys.exit(1)
    
    def get_users_by_comment_count(self, limit: Optional[int] = None) -> pd.DataFrame:
        """
        Stage 1: Ingestion
        Get users ranked by comment count with all their comments concatenated.
        """
        query = """
        SELECT 
            username,
            COUNT(*) as comment_count,
            STRING_AGG(text, ' | ' ORDER BY created) as all_comments
        FROM detrans_comments 
        WHERE username IS NOT NULL
        GROUP BY username
        ORDER BY comment_count DESC
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        try:
            with self.db_connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query)
                results = cursor.fetchall()
                
            df = pd.DataFrame(results)
            print(f"✅ Retrieved {len(df)} users with comments")
            return df
            
        except Exception as e:
            print(f"❌ Database query failed: {e}")
            return pd.DataFrame()
    
    def normalize_text(self, text: str) -> Dict[str, any]:
        """
        Stage 2: Normalisation
        Process text with spaCy: sentence splitting, lemmatization, stop-word removal, anonymization.
        """
        if not text or pd.isna(text):
            return {
                'sentences': [],
                'lemmatized_text': '',
                'anonymized_text': '',
                'token_count': 0
            }
        
        # Process with spaCy
        doc = self.nlp(text)
        
        # Sentence splitting
        sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        
        # Lemmatization and stop-word removal
        lemmatized_tokens = []
        for token in doc:
            if not token.is_stop and not token.is_punct and not token.is_space:
                lemmatized_tokens.append(token.lemma_.lower())
        
        lemmatized_text = ' '.join(lemmatized_tokens)
        
        # Anonymization - replace names and pronouns
        anonymized_text = text
        for ent in doc.ents:
            if ent.label_ == "PERSON":
                anonymized_text = anonymized_text.replace(ent.text, "[PERSON]")
        
        # Replace common pronouns with gender-neutral alternatives
        pronoun_replacements = {
            r'\bhe\b': '[PERSON]',
            r'\bhim\b': '[PERSON]',
            r'\bhis\b': '[PERSON]\'s',
            r'\bshe\b': '[PERSON]',
            r'\bher\b': '[PERSON]',
            r'\bhers\b': '[PERSON]\'s',
        }
        
        for pattern, replacement in pronoun_replacements.items():
            anonymized_text = re.sub(pattern, replacement, anonymized_text, flags=re.IGNORECASE)
        
        return {
            'sentences': sentences,
            'lemmatized_text': lemmatized_text,
            'anonymized_text': anonymized_text,
            'token_count': len([t for t in doc if not t.is_space])
        }
    
    def extract_temporal_markers(self, text: str) -> List[Dict[str, any]]:
        """
        Stage 3: Temporal Tagging
        Extract age-bounded sentences and temporal markers.
        """
        if not text or pd.isna(text):
            return []
        
        doc = self.nlp(text)
        temporal_markers = []
        
        # Age patterns
        age_patterns = [
            r'\bat\s+(\d{1,2})\b',  # "at 14"
            r'\bwhen\s+I\s+was\s+(\d{1,2})\b',  # "when I was 14"
            r'\b(\d{1,2})\s+years?\s+old\b',  # "14 years old"
            r'\baged?\s+(\d{1,2})\b',  # "age 14" or "aged 14"
        ]
        
        # School/life stage patterns
        life_stage_patterns = [
            r'\b(freshman|sophomore|junior|senior)\s+year\b',
            r'\b(elementary|middle|high)\s+school\b',
            r'\b(college|university)\b',
            r'\b(kindergarten|preschool)\b',
        ]
        
        # Medical timeline patterns
        medical_patterns = [
            r'\bT[-\s]*(\d+)\s+(years?|months?|weeks?)\b',  # "T-3 years", "T 2 months"
            r'\b(\d+)\s+(years?|months?|weeks?)\s+on\s+T\b',  # "3 years on T"
            r'\b(\d+)\s+(years?|months?|weeks?)\s+(before|after)\s+(surgery|transition)\b',
        ]
        
        # Process each sentence
        for sent in doc.sents:
            sent_text = sent.text.strip()
            if not sent_text:
                continue
            
            # Check for age patterns
            for pattern in age_patterns:
                matches = re.finditer(pattern, sent_text, re.IGNORECASE)
                for match in matches:
                    age = int(match.group(1))
                    if 5 <= age <= 50:  # Reasonable age range
                        temporal_markers.append({
                            'sentence': sent_text,
                            'type': 'age',
                            'value': age,
                            'pattern': pattern,
                            'match_text': match.group(0),
                            'start_char': sent.start_char + match.start(),
                            'end_char': sent.start_char + match.end()
                        })
            
            # Check for life stage patterns
            for pattern in life_stage_patterns:
                matches = re.finditer(pattern, sent_text, re.IGNORECASE)
                for match in matches:
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'life_stage',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })
            
            # Check for medical timeline patterns
            for pattern in medical_patterns:
                matches = re.finditer(pattern, sent_text, re.IGNORECASE)
                for match in matches:
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'medical_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })
        
        return temporal_markers
    
    def process_user_comments(self, username: str, comments: str) -> Dict[str, any]:
        """
        Process a single user's comments through stages 2-3.
        """
        print(f"Processing user: {username}")
        
        # Stage 2: Normalization
        normalized = self.normalize_text(comments)
        
        # Stage 3: Temporal tagging
        temporal_markers = self.extract_temporal_markers(comments)
        
        return {
            'username': username,
            'normalized': normalized,
            'temporal_markers': temporal_markers,
            'temporal_sentence_count': len([m for m in temporal_markers if m['type'] == 'age']),
            'total_sentences': len(normalized['sentences'])
        }
    
    def run_pipeline(self, limit_users: Optional[int] = 10):
        """
        Run the complete pipeline for stages 1-3.
        """
        print("🚀 Starting Timeline Generation Pipeline")
        print("=" * 50)
        
        # Stage 1: Get user data
        print("\n📊 Stage 1: Data Ingestion")
        users_df = self.get_users_by_comment_count(limit=limit_users)
        
        if users_df.empty:
            print("❌ No user data retrieved")
            return
        
        print(f"Top 5 users by comment count:")
        for _, row in users_df.head().iterrows():
            print(f"  {row['username']}: {row['comment_count']} comments")
        
        # Process each user through stages 2-3
        print(f"\n🔄 Processing {len(users_df)} users through normalization and temporal tagging...")
        
        processed_users = []
        for idx, row in users_df.iterrows():
            try:
                result = self.process_user_comments(row['username'], row['all_comments'])
                processed_users.append(result)
                
                # Print progress every 10 users
                if (idx + 1) % 10 == 0:
                    print(f"  Processed {idx + 1}/{len(users_df)} users")
                    
            except Exception as e:
                print(f"❌ Error processing {row['username']}: {e}")
                continue
        
        # Summary statistics
        print(f"\n📈 Pipeline Summary:")
        print(f"  Users processed: {len(processed_users)}")
        
        total_temporal_sentences = sum(u['temporal_sentence_count'] for u in processed_users)
        total_sentences = sum(u['total_sentences'] for u in processed_users)
        
        print(f"  Total sentences: {total_sentences}")
        print(f"  Temporal sentences: {total_temporal_sentences}")
        print(f"  Temporal coverage: {total_temporal_sentences/total_sentences*100:.1f}%")
        
        # Show users with most temporal markers
        temporal_users = sorted(processed_users, key=lambda x: x['temporal_sentence_count'], reverse=True)
        print(f"\n🎯 Users with most temporal markers:")
        for user in temporal_users[:5]:
            print(f"  {user['username']}: {user['temporal_sentence_count']} temporal sentences")
        
        return processed_users
    
    def close(self):
        """Clean up resources."""
        if self.db_connection:
            self.db_connection.close()
            print("✅ Database connection closed")

def main():
    """Main function to run the timeline generation pipeline."""
    generator = TimelineGenerator()
    
    try:
        # Run pipeline with first 50 users for testing
        results = generator.run_pipeline(limit_users=50)
        
        # You can save results or continue with stages 4-10 here
        print("\n✅ Pipeline stages 1-3 completed successfully!")
        
    except KeyboardInterrupt:
        print("\n⚠️ Pipeline interrupted by user")
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
    finally:
        generator.close()

if __name__ == "__main__":
    main()
