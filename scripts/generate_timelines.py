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
        Stage 3: Temporal Tagging (Enhanced)
        Extract age, life-stage, and transition timeline markers
        with detailed coverage for medical, social, and chronological milestones.
        """

        if not text or pd.isna(text):
            return []

        doc = self.nlp(text)
        temporal_markers = []

        # ----------------------------------------------------------------------
        # 1. AGE-BASED MARKERS
        # ----------------------------------------------------------------------
        age_patterns = [
            r"\b[iI]'?m\s+(\d{1,2})\b",
            r'\bI\s*(?:am|was|were)\s+(\d{1,2})\b',
            r'\bat\s+(\d{1,2})\b',
            r'\bwhen\s+I\s+was\s+(\d{1,2})\b',
            r'\b(\d{1,2})\s*years?\s*old\b',
            r'\b(?:turned?|turning)\s+(\d{1,2})\b',
            r'\b(?:aged?)\s*(\d{1,2})\b',
            r'\b(\d{1,2})\s*y\.?o\.?\b',
            r'\b(\d{1,2})\b(?=\s*(?:yr|yrs|year|years)\b)',
        ]

        # ----------------------------------------------------------------------
        # 2. LIFE-STAGE / EDUCATIONAL MILESTONES
        # ----------------------------------------------------------------------
        life_stage_patterns = [
            # school / university levels
            r'\b(freshman|sophomore|junior|senior)\s+(?:year|grade)\b',
            r'\bgrade\s+(\d{1,2})\b',
            r'\b(\d{1,2})(?:th|rd|nd|st)\s+grade\b',
            r'\b(elementary|middle|high)\s+school\b',
            r'\b(college|university|polytechnic|trade\s+school)\b',
            r'\b(kindergarten|preschool)\b',
            r'\b(first|second|third|fourth|fifth)\s+year\b',
            r'\b(fall|spring|summer|winter)\s+(?:of\s+)?(?:my\s+)?(?:first|second|third|fourth)\s+year\b',
            r'\bsemester\s+(\d+)\b',
            r'\bgap\s+year\b',

            # developmental stages
            r'\b(puberty|teenage|adolescen[ct]|childhood|early\s+twenties|mid\s+twenties|late\s+twenties)\b',
            r'\b(pre-?teen|prepubescent|young\s+adult|adult\s+life|maturity)\b'
        ]

        # ----------------------------------------------------------------------
        # 3. MEDICAL / TRANSITION TIMELINES
        # ----------------------------------------------------------------------

        # Number patterns - both written and numeric forms
        NUMBERS = r"(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d+(?:\.\d+)?)"
        
        HORMONES = r"(?:HRT|hormones?|testosterone|T\b|test|estrogen|estradiol|E\b|blockers?|puberty\s+blockers|GnRH)"
        SURGERIES = r"(?:surgery|surgeries|op|operation|top\s+surgery|bottom\s+surgery|FFS|BA|GCS|GRS|vaginoplasty|mastectomy|phalloplasty|phaloplasty|hysterectomy|facial|orchi|orchiectomy)"
        TRANSITION_TERMS = r"(?:transition|trans\s+journey|was\s+out|came\s+out|coming\s+out|egg|socially|social\s+transition|medical\s+transition)"
        DURATION = fr"(?:(?:first|last|past|initial)\s+)?({NUMBERS})\s*(years?|months?|weeks?|days?)"

        medical_patterns = [
            # Hormone start / initiation
            fr'\b(started|began|went\s+on|got\s+on|initiated)\s+{HORMONES}\b',

            # Duration on hormones / blockers
            fr'\b(on|started|been\s+on)\s+{HORMONES}\s+for\s+{DURATION}\b',
            fr'\b{DURATION}\s+(?:on|into)\s+{HORMONES}\b',

            # Relative timing (before/after starting)
            fr'\b{DURATION}\s+(?:before|after)\s+(?:starting|start|started|beginning|transitioning|on|going\s+on)\s+(?:{HORMONES}|{SURGERIES}|{TRANSITION_TERMS})\b',
            fr'\b(before|after)\s+(?:starting|beginning|going\s+on)\s+(?:{HORMONES}|{TRANSITION_TERMS})\b',

            # Countdown-style “T-2 years”
            fr'\b[TE][-\s]*{DURATION}\b',

            # Surgery / Post-op
            fr'\b(post|after)\s+{SURGERIES}\b',
            fr'\b{DURATION}\s+(?:post|after|since)\s+{SURGERIES}\b',
            fr'\bday\s+(\d+)\s+(?:post-op|after\s+surgery)\b',

            # Dosage / microdosing
            r'\b(\d+(?:\.\d+)?)\s*(mg|ml|pumps?|units?)\s*(?:daily|weekly|biweekly|monthly)\b',
            r'\bmicro\s*dose|microdosing\b',

            # Blockers / discontinuation
            fr'\b(on|started|began)\s+(?:puberty\s+blockers|GnRH)\b',
            fr'\bstopped|discontinued\s+{HORMONES}\b',

            # Transition phase keywords
            r'\b(pre-?transition|early\s+transition|mid\s+transition|late\s+transition|post-?transition)\b',
            fr'\b(?:(?:first|last|past|initial)\s+)?({NUMBERS})\s+days?\s+(?:on|into)\s+{HORMONES}\b',
            fr'\b(?:(?:first|last|past|initial)\s+)?({NUMBERS})\s+months?\s+(?:on|into)\s+{HORMONES}\b',
            fr'\b(?:(?:first|last|past|initial)\s+)?({NUMBERS})\s+years?\s+(?:on|into)\s+{HORMONES}\b',
            fr'\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+year\s+(?:on|into)\s+{HORMONES}\b'
        ]

        # ----------------------------------------------------------------------
        # 4. ONLINE / MEDIA INFLUENCE MARKERS
        # ----------------------------------------------------------------------
        online_influence_patterns = [
            # Platform names and shorthand
            r'\b(reddit|r/\w+|tumblr|twitter|x\.com|tiktok|instagram|insta|youtube|yt|snapchat|discord|4chan|facebook|fb|pinterest)\b',

            # Discovery / influence verbs around them
            r'\b(found|discovered|learned\s+about|saw|read|watched|joined|posted\s+on|started\s+using)\s+(?:the\s+)?(reddit|tumblr|tiktok|discord|subreddit|community|server|forum)\b',
            r'\b(on|through|via|because\s+of)\s+(?:a\s+)?(reddit|tiktok|tumblr|discord|youtube|instagram)\b',

            # Explicit "online community" or "internet" context
            r'\b(online|internet|social\s+media|community|server|forum|group|subreddit|timeline|feed)\b',
            r'\b(trans\s+subreddit|detrans\s+subreddit|trans\s+discord|trans\s+tumblr|trans\s+tiktok|lgbt\s+community)\b',
        ]

        # ----------------------------------------------------------------------
        # 5. GENDER IDENTITY MARKERS
        # ----------------------------------------------------------------------
        gender_identity_patterns = [
            # Common umbrella terms
            r'\b(trans|transgender|transsexual|genderqueer|gender\s+fluid|nonbinary|non-binary|enby|nb|agender|bigender|demiboy|demigirl|androgyne|neutrois)\b',

            # Discovery phrases
            r'\b(realized|figured\s+out|understood|knew|came\s+to\s+terms|identified)\s+(?:that\s+)?(?:I\s+was|I\'m|I\s+am)\s+(?:a\s+)?(trans|nonbinary|genderqueer|enby|trans\s+woman|trans\s+man|demiboy|demigirl)\b',

            # Pronoun change indicators
            r'\b(started|began|changed)\s+(?:using|going\s+by)\s+(?:they/them|he/him|she/her|xe/xem|ze/hir|fae/faer|any\s+pronouns|no\s+pronouns)\b',

            # Identity exploration context
            r'\bquestioning\s+(?:my\s+)?gender\b',
            r'\bidentif(?:y|ied)\s+as\s+(?:trans|nonbinary|genderqueer|enby|agender)\b',
        ]

        # ----------------------------------------------------------------------
        # 4. PROCESSING: EXTRACT & NORMALIZE
        # ----------------------------------------------------------------------
        for sent in doc.sents:
            sent_text = sent.text.strip()
            if not sent_text:
                continue

            # AGE
            for pattern in age_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    try:
                        age = int(match.group(1))
                        if 5 <= age <= 60:
                            temporal_markers.append({
                                'sentence': sent_text,
                                'type': 'age',
                                'value': age,
                                'pattern': pattern,
                                'match_text': match.group(0),
                                'start_char': sent.start_char + match.start(),
                                'end_char': sent.start_char + match.end()
                            })
                    except Exception:
                        continue

            # LIFE STAGE
            for pattern in life_stage_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'life_stage',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # MEDICAL / TRANSITION TIMELINE
            for pattern in medical_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'medical_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # GENDER IDENTITY TIMELINE
            for pattern in gender_identity_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'gender_identity_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # ONLINE INFLUENCE TIMELINE
            for pattern in online_influence_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'online_influence_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

        return temporal_markers

    def process_user_comments(self, username: str, comments: str) -> Dict[str, any]:
        """
        Process a single user's comments through normalization and temporal tagging.
        """
        print(f"Processing user: {username}")

        # Stage 2: Normalize
        normalized = self.normalize_text(comments)
        normalized_text = normalized['normalized_text'] if isinstance(normalized, dict) else comments

        # Stage 3: Extract temporal markers from normalized text
        temporal_markers = self.extract_temporal_markers(normalized_text)

        return {
            'username': username,
            'normalized': normalized,
            'temporal_markers': temporal_markers,
            'temporal_sentence_count': len([m for m in temporal_markers if m['type'] in ('age', 'medical_timeline')]),
            'total_sentences': len(normalized.get('sentences', []))
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
