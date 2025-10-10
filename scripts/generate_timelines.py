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
    
    def get_user_comments(self, username: str) -> Optional[str]:
        """
        Get all comments for a specific user concatenated together.
        """
        query = """
        SELECT 
            username,
            COUNT(*) as comment_count,
            STRING_AGG(text, ' | ' ORDER BY created) as all_comments
        FROM detrans_comments 
        WHERE username = %s
        GROUP BY username
        """
        
        try:
            with self.db_connection.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, (username,))
                result = cursor.fetchone()
                
            if result:
                print(f"✅ Retrieved {result['comment_count']} comments for user: {username}")
                return result['all_comments']
            else:
                print(f"❌ No comments found for user: {username}")
                return None
                
        except Exception as e:
            print(f"❌ Database query failed: {e}")
            return None

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
            r'\b(pre-?teen|prepubescent|young\s+adult|adult\s+life|maturity)\b',

            # trauma and abuse markers
            r'\b(trauma|traumatic|traumatized|traumatizing)\b',
            r'\b(abuse|abused|abusive|abuser)\b',
            r'\b(rape|raped|sexual\s+assault|sexually\s+assaulted)\b',
            r'\b(molest|molested|molestation|sexual\s+abuse)\b',
            r'\b(domestic\s+violence|physical\s+abuse|emotional\s+abuse|psychological\s+abuse)\b',
            r'\b(bullying|bullied|harassment|harassed)\b',
            r'\b(grooming|groomed|predator|inappropriate\s+touching)\b',
            r'\b(ptsd|post-?traumatic\s+stress|flashbacks?|triggers?|triggered)\b',
            r'\b(self-?harm|cutting|suicide\s+attempt|suicidal)\b',
            r'\b(eating\s+disorder|anorexia|bulimia|body\s+dysmorphia)\b'
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
        # 4. DETRANSITION-SPECIFIC MARKERS
        # ----------------------------------------------------------------------
        detransition_patterns = [
            # Stopping/discontinuing
            r'\b(stopped|quit|discontinued|went\s+off|got\s+off|came\s+off)\s+(?:taking\s+)?(?:HRT|hormones?|testosterone|estrogen|T\b|E\b)\b',
            r'\b(detransition|detrans|de-transition|retransition|going\s+back)\b',
            r'\b(regret|regretting|wish\s+I\s+hadn\'t|mistake|wrong\s+path)\b',
            
            # Reversal processes
            r'\b(reversal|reverse|undoing|going\s+back|returning\s+to)\b',
            r'\b(voice\s+training|speech\s+therapy)\s+(?:to\s+)?(?:feminize|masculinize|change\s+back)\b',
            r'\b(laser\s+hair\s+removal|electrolysis)\s+(?:to\s+remove|for\s+facial\s+hair)\b',
            
            # Realization markers
            r'\b(realized|figured\s+out|came\s+to\s+understand|epiphany|awakening)\s+(?:that\s+)?(?:I\s+was|this\s+was)\s+(?:wrong|a\s+mistake|not\s+right)\b',
            r'\b(questioning|doubting|second\s+thoughts|having\s+doubts)\s+(?:my\s+)?(?:transition|identity|decision)\b',
        ]

        # ----------------------------------------------------------------------
        # 5. MENTAL HEALTH & COMORBIDITY MARKERS
        # ----------------------------------------------------------------------
        mental_health_patterns = [
            # Specific conditions often mentioned
            r'\b(autism|autistic|ASD|asperger|neurodivergent|ADHD|ADD)\b',
            r'\b(depression|depressed|anxiety|anxious|OCD|bipolar|BPD|borderline)\b',
            r'\b(dissociation|dissociative|depersonalization|derealization)\b',
            r'\b(therapy|therapist|counseling|counselor|psychologist|psychiatrist)\b',
            r'\b(medication|antidepressant|SSRIs?|mood\s+stabilizer)\b',
            
            # Body image issues
            r'\b(body\s+dysmorphia|dysmorphic|body\s+image|self-image)\b',
            r'\b(dysphoria|euphoria|gender\s+dysphoria|social\s+dysphoria|body\s+dysphoria)\b',
        ]

        # ----------------------------------------------------------------------
        # 6. SOCIAL/FAMILY MARKERS
        # ----------------------------------------------------------------------
        social_markers = [
            # Family dynamics
            r'\b(parents?|mom|dad|mother|father|family)\s+(?:didn\'t\s+)?(?:support|accept|understand|approve)\b',
            r'\b(came\s+out\s+to|told)\s+(?:my\s+)?(?:parents?|family|friends?|partner|spouse)\b',
            r'\b(disowned|kicked\s+out|cut\s+off|no\s+contact|estranged)\b',
            
            # Peer influence
            r'\b(friend\s+group|peer\s+pressure|influenced\s+by|encouraged\s+by)\b',
            r'\b(trans\s+friends?|queer\s+friends?|LGBT\s+community)\b',
            
            # Name/pronoun changes
            r'\b(changed\s+my\s+name|new\s+name|chosen\s+name|legal\s+name\s+change)\b',
            r'\b(pronouns?|they/them|he/him|she/her|preferred\s+pronouns?)\b',
        ]

        # ----------------------------------------------------------------------
        # 7. MEDICAL COMPLICATIONS/SIDE EFFECTS
        # ----------------------------------------------------------------------
        medical_complications = [
            # Hormone side effects
            r'\b(side\s+effects?|adverse\s+effects?|complications?|problems?)\s+(?:from|with|on)\s+(?:HRT|hormones?|testosterone|estrogen)\b',
            r'\b(blood\s+clots?|liver\s+damage|mood\s+swings?|acne|hair\s+loss|voice\s+changes?)\b',
            r'\b(hot\s+flashes?|night\s+sweats?|libido|sex\s+drive|fertility|infertility)\b',
            
            # Surgery complications
            r'\b(complications?|infection|healing\s+issues?|revision\s+surgery|botched)\b',
            r'\b(nerve\s+damage|sensation\s+loss|chronic\s+pain|scarring)\b',
        ]

        # ----------------------------------------------------------------------
        # 8. TRANSITION TIMING IMPROVEMENTS
        # ----------------------------------------------------------------------
        transition_timing_patterns = [
            # Specific transition phases
            r'\b(egg\s+crack|cracked|egg\s+moment)\b',  # Trans community term
            r'\b(first\s+time|initially|originally)\s+(?:identified|came\s+out|realized)\b',
            r'\b(always\s+knew|since\s+childhood|from\s+a\s+young\s+age)\b',
            
            # Rapid onset patterns
            r'\b(sudden|suddenly|rapid|quickly|fast|overnight)\s+(?:onset|change|realization|decision)\b',
            r'\b(within\s+(?:weeks?|months?)|in\s+a\s+matter\s+of)\b',
            
            # Gradual patterns
            r'\b(gradual|slowly|over\s+time|process|journey|evolution)\b',
        ]

        # ----------------------------------------------------------------------
        # 9. PROFESSIONAL/EDUCATIONAL CONTEXT
        # ----------------------------------------------------------------------
        professional_markers = [
            # Work/career impact
            r'\b(work|job|career|workplace|employer|colleagues?)\s+(?:transition|coming\s+out|discrimination)\b',
            r'\b(HR|human\s+resources|legal\s+name|documentation)\b',
            
            # Medical professionals
            r'\b(endocrinologist|gender\s+clinic|informed\s+consent|WPATH|gatekeeping)\b',
            r'\b(referral|assessment|evaluation|diagnosis|letter)\b',
        ]

        # ----------------------------------------------------------------------
        # 10. ONLINE / MEDIA INFLUENCE MARKERS
        # ----------------------------------------------------------------------
        # Online platforms and services
        SOCIAL_PLATFORMS = r"(?:reddit|tumblr|twitter|x\.com|tiktok|instagram|insta|youtube|yt|snapchat|discord|4chan|facebook|fb|pinterest|linkedin|twitch|telegram|whatsapp|signal)"
        REDDIT_SPECIFIC = r"(?:r/\w+|subreddit|/r/\w+)"
        PLATFORM_VARIANTS = r"(?:ig|snap|tt|fb|yt|insta)"
        ONLINE_SPACES = r"(?:community|server|forum|group|chat|channel|board|thread|post|feed|timeline|story|stories)"
        
        online_influence_patterns = [
            # Platform names and variants
            fr'\b({SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC}|{PLATFORM_VARIANTS})\b',

            # Discovery / influence verbs with platforms
            fr'\b(found|discovered|learned\s+about|saw|read|watched|joined|posted\s+(?:on|to)|started\s+using|got\s+into|stumbled\s+(?:upon|across)|came\s+across)\s+(?:the\s+)?(?:a\s+)?({SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC}|{ONLINE_SPACES})\b',
            
            # Prepositions indicating platform usage
            fr'\b(on|through|via|because\s+of|from|after\s+seeing|while\s+on|browsing)\s+(?:a\s+)?(?:the\s+)?({SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC}|{ONLINE_SPACES})\b',
            
            # Time-based platform engagement
            fr'\b(?:(?:first|last|past|initial)\s+)?({NUMBERS})\s*(?:years?|months?|weeks?|days?)\s+(?:on|using|browsing|in|lurking\s+on)\s+({SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC})\b',
            fr'\b(?:started|began|joined|got\s+on)\s+({SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC})\s+(?:(?:first|last|past|initial)\s+)?({NUMBERS})\s*(?:years?|months?|weeks?|days?)\s+ago\b',

            # Explicit online community context
            fr'\b(online|internet|social\s+media|digital)\s+({ONLINE_SPACES}|influence|content|algorithm|rabbit\s+hole)\b',
            fr'\b({ONLINE_SPACES})\s+(?:on|in)\s+({SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC})\b',
            
            # Trans-specific online spaces
            fr'\b(trans|transgender|detrans|lgbt|lgbtq\+?|queer|gender)\s+({ONLINE_SPACES}|{SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC})\b',
            fr'\b({SOCIAL_PLATFORMS}|{REDDIT_SPECIFIC})\s+(trans|transgender|detrans|lgbt|lgbtq\+?|queer|gender)\s+({ONLINE_SPACES})\b',
            
            # Algorithm and content discovery
            r'\b(algorithm|recommended|suggested|for\s+you\s+page|fyp|explore\s+page|trending|viral|feed)\b',
            r'\b(binge\s+watched|scrolled\s+through|deep\s+dive|rabbit\s+hole|echo\s+chamber)\b',
        ]

        # ----------------------------------------------------------------------
        # 11. GENDER IDENTITY MARKERS
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
        # 12. PROCESSING: EXTRACT & NORMALIZE
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

            # DETRANSITION TIMELINE
            for pattern in detransition_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'detransition_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # MENTAL HEALTH TIMELINE
            for pattern in mental_health_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'mental_health_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # SOCIAL TIMELINE
            for pattern in social_markers:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'social_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # MEDICAL COMPLICATIONS TIMELINE
            for pattern in medical_complications:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'medical_complications_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # TRANSITION TIMING TIMELINE
            for pattern in transition_timing_patterns:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'transition_timing_timeline',
                        'value': match.group(0).lower(),
                        'pattern': pattern,
                        'match_text': match.group(0),
                        'start_char': sent.start_char + match.start(),
                        'end_char': sent.start_char + match.end()
                    })

            # PROFESSIONAL TIMELINE
            for pattern in professional_markers:
                for match in re.finditer(pattern, sent_text, re.IGNORECASE):
                    temporal_markers.append({
                        'sentence': sent_text,
                        'type': 'professional_timeline',
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

    def test_user_extraction(self, username: str):
        """
        Test temporal extraction for a specific user and print results to console.
        """
        print(f"🧪 Testing temporal extraction for user: {username}")
        print("=" * 60)
        
        # Get user comments
        comments = self.get_user_comments(username)
        if not comments:
            return
        
        # Process the user
        result = self.process_user_comments(username, comments)
        
        # Print detailed results
        print(f"\n📊 Results for {username}:")
        print(f"  Total sentences: {result['total_sentences']}")
        print(f"  Temporal markers found: {len(result['temporal_markers'])}")
        print(f"  Temporal sentence count: {result['temporal_sentence_count']}")
        
        if result['temporal_markers']:
            print(f"\n🎯 Temporal markers by type:")
            marker_types = {}
            for marker in result['temporal_markers']:
                marker_type = marker['type']
                if marker_type not in marker_types:
                    marker_types[marker_type] = []
                marker_types[marker_type].append(marker)
            
            for marker_type, markers in marker_types.items():
                print(f"\n  {marker_type.upper()} ({len(markers)} markers):")
                for i, marker in enumerate(markers[:10]):  # Show first 10 of each type
                    print(f"    {i+1}. '{marker['match_text']}' in: \"{marker['sentence'][:100]}...\"")
                if len(markers) > 10:
                    print(f"    ... and {len(markers) - 10} more")
        else:
            print(f"\n❌ No temporal markers found for {username}")
        
        return result

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
        # Check if username provided as command line argument
        if len(sys.argv) > 1 and sys.argv[1] != "--dry-run":
            username = sys.argv[1]
            print(f"🎯 Testing mode: Processing user '{username}'")
            generator.test_user_extraction(username)
        else:
            # Run pipeline with first 50 users for testing
            print("🚀 Running full pipeline mode")
            results = generator.run_pipeline(limit_users=50)
            print("\n✅ Pipeline stages 1-3 completed successfully!")
        
    except KeyboardInterrupt:
        print("\n⚠️ Pipeline interrupted by user")
    except Exception as e:
        print(f"\n❌ Pipeline failed: {e}")
    finally:
        generator.close()

if __name__ == "__main__":
    main()
