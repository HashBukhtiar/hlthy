"""
Pure AI-Based Profile Extraction using Gemini
Replaces regex-based extraction with intelligent semantic understanding

NO REGEX. NO HARDCODING. PURE AI INTELLIGENCE.
"""

import json
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional
import google.generativeai as genai

logger = logging.getLogger(__name__)


class GeminiProfileExtractor:
    """Pure AI-based profile extraction - no regex, pure intelligence"""
    
    def __init__(self, gemini_model=None):
        """
        Initialize with Gemini model
        
        Args:
            gemini_model: Optional pre-configured Gemini model. If None, creates new one.
        """
        if gemini_model:
            self.model = gemini_model
        else:
            # Configure Gemini with API key
            api_key = os.getenv('GEMINI_API_KEY')
            if not api_key:
                raise ValueError("GEMINI_API_KEY environment variable not set")
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    def extract_claims(self, message: str, user_profile) -> Dict:
        """
        Extract profile claims using Gemini AI
        
        Args:
            message: User's message text
            user_profile: Current user profile object
            
        Returns:
            Dict with claims_found, pending_confirmations, phase
        """
        
        # Build context from user profile
        profile_context = self._build_profile_context(user_profile)
        
        prompt = f"""Analyze this fitness user's message and extract profile information.

User message: "{message}"

Current profile context:
{profile_context}

Extract ANY of these claim types:

1. **exercise_dislike**: User doesn't like specific exercises or movement patterns
   Examples: 
   - "I hate burpees" → extract "burpees"
   - "don't like pressing movements" → extract "pressing movements" (movement pattern)
   - "overhead work bothers me" → extract "overhead exercises"
   - "nothing explosive" → extract "explosive exercises"

2. **injury**: Current pain or physical issues
   Examples: 
   - "knee hurts" → extract knee injury
   - "shoulder acting up" → extract shoulder injury
   - "lower back pain" → extract lower_back injury
   - NOTE: Ignore past tense ("had knee pain last year")

3. **equipment**: Available equipment or limitations
   Examples: 
   - "I have dumbbells" → extract available: dumbbells
   - "no barbell" → extract missing: barbell
   - "bodyweight only" → extract limitation: bodyweight_only

4. **experience_level**: User's lifting experience (NEW)
   Examples:
   - "I'm a beginner" → extract "beginner"
   - "been lifting 5 years" → extract "advanced"
   - "intermediate lifter" → extract "intermediate"
   - "just started" → extract "beginner"
   VALUES: "beginner", "intermediate", "advanced"

5. **training_frequency**: How many days per week they train (NEW)
   Examples:
   - "I train 5 times a week" → extract 5
   - "workout 3 days" → extract 3
   - "gym 6x per week" → extract 6
   VALUE: Extract number (1-7)

6. **primary_goal**: Main fitness objective (NEW)
   Examples:
   - "build muscle" → extract "hypertrophy"
   - "lose weight" → extract "weight_loss"
   - "get stronger" → extract "strength"
   - "improve endurance" → extract "endurance"
   VALUES: "hypertrophy", "strength", "endurance", "weight_loss", "general_fitness"

7. **preference**: Training style preferences or specific likes (NEW)
   Examples:
   - "I love hammer strength machines" → extract "loves hammer strength machines"
   - "prefer free weights" → extract "prefers free weights"
   - "like short workouts" → extract "likes short workouts"
   Store as free-form text (natural language)

For EACH claim provide:
- type: claim type from above
- value: the specific thing (exercise name, body part, equipment, etc.)
- confidence: 0.0-1.0 (how confident this is a real claim)
- reasoning: brief explanation why you extracted this
- needs_confirmation: true (always ask user to confirm)

IMPORTANT RULES:
- Only extract if confidence >= 0.5
- Use past tense as signal for LOW confidence ("I had knee pain" = ignore)
- Be specific with values ("burpees" not "burpees exercise")
- For movement patterns, extract as-is ("pressing movements", "overhead work")
- Ignore casual mentions, only extract explicit statements
- If multiple claims in one message, extract ALL of them

Return ONLY valid JSON (no markdown, no code blocks, no explanation):
{{
  "claims": [
    {{
      "type": "exercise_dislike",
      "value": "burpees",
      "confidence": 0.95,
      "reasoning": "User explicitly stated they hate burpees",
      "needs_confirmation": true
    }}
  ]
}}

If no claims found: {{"claims": []}}"""

        try:
            logger.info(f"🤖 Extracting claims from: '{message[:50]}...'")
            
            response = self.model.generate_content(prompt)
            text = response.text.strip()
            
            # Remove markdown code blocks if present
            if text.startswith('```'):
                lines = text.split('\n')
                text = '\n'.join([l for l in lines if not l.strip().startswith('```')])
                if text.startswith('json'):
                    text = text[4:].strip()
            
            # Parse JSON response
            result = json.loads(text.strip())
            claims = result.get('claims', [])
            
            logger.info(f"✅ Gemini extracted {len(claims)} claims")
            for claim in claims:
                logger.info(f"  - {claim['type']}: {claim['value']} (confidence: {claim['confidence']})")
            
            return {
                "phase": "extract",
                "claims_found": len(claims),
                "claims_extracted": len(claims),
                "pending_confirmations": claims
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse Gemini JSON response: {e}")
            logger.error(f"Response text: {text[:200]}")
            return {"phase": "extract", "claims_found": 0, "error": f"JSON parse error: {str(e)}"}
            
        except Exception as e:
            logger.error(f"❌ Gemini extraction failed: {e}")
            return {"phase": "extract", "claims_found": 0, "error": str(e)}
    
    def generate_confirmation(self, claims: List[Dict]) -> str:
        """
        Generate natural confirmation message using Gemini AI
        
        Args:
            claims: List of extracted claims
            
        Returns:
            Natural, conversational confirmation message
        """
        
        if not claims:
            return "I didn't quite catch that. Could you rephrase?"
        
        # Build claims summary for prompt
        claims_text = "\n".join([
            f"- {claim['type']}: {claim['value']} (reasoning: {claim['reasoning']})"
            for claim in claims
        ])
        
        prompt = f"""You are a friendly fitness coach confirming information with a user.

Extracted claims:
{claims_text}

Generate a natural, warm confirmation message that:
1. Acknowledges what they said
2. Lists the key points clearly (if multiple)
3. Asks if they want you to remember it
4. Sounds conversational and supportive
5. Is brief (2-3 sentences max)
6. Uses "I" and "you" naturally

Good examples:
- "Got it! So you're not a fan of burpees? Should I keep that in mind for your workouts?"
- "I hear you on the knee pain. Want me to adjust recommendations to protect it?"
- "So you have dumbbells at home - should I plan workouts around those?"
- "Understood! You don't like pressing movements and overhead work bothers your shoulder. Should I avoid those types of exercises?"

Generate ONLY the confirmation message (no JSON, no formatting, no quotes):"""

        try:
            logger.info(f"🤖 Generating confirmation for {len(claims)} claims")
            
            response = self.model.generate_content(prompt)
            message = response.text.strip()
            
            # Clean up any quotes or formatting
            message = message.strip('"\'')
            
            logger.info(f"✅ Generated confirmation: {message[:100]}...")
            return message
            
        except Exception as e:
            logger.error(f"❌ Confirmation generation failed: {e}, using fallback")
            
            # Fallback to simple template
            if len(claims) == 1:
                claim = claims[0]
                return f"Just to confirm: {claim['reasoning'].lower()}. Is that right?"
            else:
                items = [c['value'] for c in claims]
                return f"Just to confirm I understood you correctly about {', '.join(items)}. Should I remember these?"
    
    def commit_claims(self, claims: List[Dict], user_profile) -> bool:
        """
        Commit confirmed claims to user profile
        
        Args:
            claims: List of confirmed claims to commit
            user_profile: User profile object to update
            
        Returns:
            True if successful, False otherwise
        """
        
        try:
            logger.info(f"💾 Committing {len(claims)} claims to profile")
            
            for claim in claims:
                claim_type = claim['type']
                value = claim['value']
                
                if claim_type == 'exercise_dislike':
                    # Add to dislikes list
                    if not hasattr(user_profile, 'dislikes') or user_profile.dislikes is None:
                        user_profile.dislikes = []
                    
                    if value not in user_profile.dislikes:
                        user_profile.dislikes.append(value)
                        logger.info(f"✅ Committed dislike: {value}")
                    else:
                        logger.info(f"⏭️ Dislike already exists: {value}")
                
                elif claim_type == 'injury':
                    # Add injury with metadata
                    if not hasattr(user_profile, 'injuries'):
                        user_profile.injuries = []
                    
                    # Check if injury already exists
                    existing = [i for i in user_profile.injuries if i.get('body_part') == value]
                    if not existing:
                        injury_record = {
                            'body_part': value,
                            'reported_at': datetime.now().isoformat(),
                            'confidence': claim.get('confidence', 0.8),
                            'status': 'active',
                            'reasoning': claim.get('reasoning', '')
                        }
                        user_profile.injuries.append(injury_record)
                        logger.info(f"✅ Committed injury: {value}")
                    else:
                        logger.info(f"⏭️ Injury already exists: {value}")
                
                elif claim_type == 'equipment':
                    # Update equipment availability
                    if not hasattr(user_profile, 'available_equipment') or user_profile.available_equipment is None:
                        user_profile.available_equipment = {}
                    
                    # Parse equipment and set availability
                    equipment_name = value.lower().replace(' ', '_')
                    user_profile.available_equipment[equipment_name] = True
                    logger.info(f"✅ Committed equipment: {value}")
                
                elif claim_type == 'goal':
                    # Set primary goal (legacy support)
                    if not hasattr(user_profile, 'goals'):
                        user_profile.goals = {}
                    user_profile.goals['primary'] = value
                    logger.info(f"✅ Committed goal: {value}")
                
                elif claim_type == 'preference':
                    # Add preference (legacy support)
                    if not hasattr(user_profile, 'preferences_old'):
                        user_profile.preferences_old = {}
                    pref_key = value.lower().replace(' ', '_')
                    user_profile.preferences_old[pref_key] = True
                    logger.info(f"✅ Committed preference: {value}")
                
                # NEW: Experience Level
                elif claim_type == 'experience_level':
                    user_profile.experience_level = value
                    logger.info(f"✅ Committed experience level: {value}")
                
                # NEW: Training Frequency
                elif claim_type == 'training_frequency':
                    try:
                        user_profile.training_frequency = int(value)
                        logger.info(f"✅ Committed training frequency: {value} days/week")
                    except (ValueError, TypeError):
                        logger.warning(f"⚠️ Invalid training frequency: {value}")
                
                # NEW: Primary Goal
                elif claim_type == 'primary_goal':
                    if not user_profile.primary_goals:
                        user_profile.primary_goals = []
                    if value not in user_profile.primary_goals:
                        user_profile.primary_goals.append(value)
                        logger.info(f"✅ Committed primary goal: {value}")
                    else:
                        logger.info(f"⏭️ Primary goal already exists: {value}")
                
                # NEW: Preference (free-form text)
                elif claim_type == 'preference':
                    if not user_profile.preferences:
                        user_profile.preferences = []
                    if value not in user_profile.preferences:
                        user_profile.preferences.append(value)
                        logger.info(f"✅ Committed preference: {value}")
                    else:
                        logger.info(f"⏭️ Preference already exists: {value}")
            
            logger.info(f"✅ Successfully committed all {len(claims)} claims")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to commit claims: {e}")
            return False
    
    def _build_profile_context(self, user_profile) -> str:
        """Build context string from user profile"""
        
        try:
            dislikes = getattr(user_profile, 'dislikes', None) or []
            injuries = getattr(user_profile, 'injuries', None) or []
            equipment = getattr(user_profile, 'available_equipment', None) or {}
            
            context = f"""- Dislikes: {', '.join(dislikes) if dislikes else 'None'}
- Injuries: {', '.join([i.get('body_part', 'unknown') if isinstance(i, dict) else str(i) for i in injuries]) if injuries else 'None'}
- Equipment: {', '.join([k for k, v in equipment.items() if v]) if equipment else 'Unknown'}"""
            
            return context
        except Exception as e:
            logger.warning(f"Could not build profile context: {e}")
            return "- No profile context available"


# Global instance for easy access
_global_extractor = None

def get_extractor(gemini_model=None) -> GeminiProfileExtractor:
    """Get or create global extractor instance"""
    global _global_extractor
    if _global_extractor is None:
        _global_extractor = GeminiProfileExtractor(gemini_model)
    return _global_extractor
