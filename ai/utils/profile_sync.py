"""
Memory to Profile Sync - Closed Loop Learning
Extracts durable facts from conversations and updates user profiles
"""

import re
from typing import Dict, List, Set
from datetime import datetime

# Try to import exercise database with fallback
try:
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
    from core.exercise_database import CANONICAL_EXERCISES, NAME_TO_ID_MAP
    CANONICAL_DATABASE_AVAILABLE = True
except ImportError:
    print("Warning: Exercise database not available for profile sync normalization")
    CANONICAL_DATABASE_AVAILABLE = False
    CANONICAL_EXERCISES = {}
    NAME_TO_ID_MAP = {}

class ProfileExtractor:
    """Extracts durable facts from chat for profile updates"""
    
    def __init__(self):
        self.dislike_patterns = [
            r"hate\s+(\w+(?:\s+\w+){0,2})",
            r"don't like\s+(\w+(?:\s+\w+){0,2})",
            r"can't stand\s+(\w+(?:\s+\w+){0,2})",
            r"avoid\s+(\w+(?:\s+\w+){0,2})",
            r"(\w+(?:\s+\w+){0,2})\s+sucks?",
            r"not a fan of\s+(\w+(?:\s+\w+){0,2})"
        ]
        
        self.injury_patterns = [
            r"my\s+(\w+)\s+(?:hurts?|is sore|pain)",
            r"(\w+)\s+(?:injury|problem|issue)",
            r"hurt my\s+(\w+)",
            r"(\w+)\s+is bothering me",
            r"recovering from\s+(\w+)\s+(?:injury|surgery)"
        ]
        
        self.equipment_patterns = [
            r"(?:no|don't have|missing)\s+([\w\s]+?)(?:\s+at|$)",
            r"gym (?:doesn't have|lacks)\s+([\w\s]+)",
            r"(?:got|have|bought)\s+(?:new|a)\s+([\w\s]+)"
        ]
        
        self.goal_patterns = [
            r"want to\s+(lose weight|gain muscle|get stronger|build muscle|cut fat)",
            r"goal is to\s+([\w\s]+)",
            r"trying to\s+(bulk|cut|maintain|recomp)",
            r"focusing on\s+(strength|hypertrophy|endurance|power)"
        ]

    def extract_dislikes(self, text: str) -> Set[str]:
        """Extract exercise dislikes from text"""
        dislikes = set()
        text_lower = text.lower()
        
        for pattern in self.dislike_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                # Normalize to exercise ID if possible
                normalized = self._normalize_to_exercise_id(match.strip())
                if normalized:
                    dislikes.add(normalized)
                else:
                    dislikes.add(match.strip())
        
        return dislikes

    def extract_injuries(self, text: str) -> List[Dict[str, str]]:
        """Extract injury mentions from text"""
        injuries = []
        text_lower = text.lower()
        
        for pattern in self.injury_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                body_part = match.strip()
                # Map common terms to standard injury types
                standard_part = self._normalize_body_part(body_part)
                if standard_part:
                    injuries.append({
                        "body_part": standard_part,
                        "status": "active" if "recovering" not in text_lower else "recovering",
                        "date_mentioned": datetime.now().isoformat()[:10]
                    })
        
        return injuries

    def extract_equipment_changes(self, text: str) -> List[Dict[str, str]]:
        """Extract equipment availability changes"""
        changes = []
        text_lower = text.lower()
        
        for pattern in self.equipment_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                equipment = match.strip()
                if len(equipment) > 2:  # Ignore very short matches
                    action = "removed" if any(neg in text_lower for neg in ["no", "don't have", "missing", "lacks"]) else "added"
                    changes.append({
                        "equipment": equipment,
                        "action": action,
                        "date": datetime.now().isoformat()[:10]
                    })
        
        return changes

    def extract_goal_changes(self, text: str) -> List[str]:
        """Extract goal mentions from text"""
        goals = []
        text_lower = text.lower()
        
        for pattern in self.goal_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                goal = match.strip()
                # Normalize goals
                if any(term in goal for term in ["lose", "cut", "fat"]):
                    goals.append("fat_loss")
                elif any(term in goal for term in ["gain", "muscle", "bulk", "hypertrophy"]):
                    goals.append("muscle_building")
                elif any(term in goal for term in ["strong", "strength", "power"]):
                    goals.append("strength")
                elif "endurance" in goal:
                    goals.append("endurance")
        
        return list(set(goals))  # Remove duplicates

    def _normalize_to_exercise_id(self, text: str) -> str:
        """Try to normalize text to canonical exercise ID"""
        if not CANONICAL_DATABASE_AVAILABLE:
            return None
            
        text_clean = text.lower().strip()
        
        # Direct lookup in NAME_TO_ID_MAP
        if text_clean in NAME_TO_ID_MAP:
            return NAME_TO_ID_MAP[text_clean]
        
        # Partial matching for common exercises
        for name, exercise_id in NAME_TO_ID_MAP.items():
            if text_clean in name or name in text_clean:
                return exercise_id
        
        return None

    def _normalize_body_part(self, body_part: str) -> str:
        """Normalize body part to standard injury type"""
        body_part_lower = body_part.lower()
        
        mapping = {
            "shoulder": "shoulder",
            "elbow": "elbow", 
            "back": "lower_back",
            "lower back": "lower_back",
            "lumbar": "lower_back",
            "knee": "knee",
            "hip": "hip",
            "neck": "neck",
            "wrist": "wrist",
            "ankle": "ankle"
        }
        
        for key, value in mapping.items():
            if key in body_part_lower:
                return value
        
        return None

    def extract_profile_updates(self, user_message: str, coach_response: str) -> Dict[str, any]:
        """Extract all profile updates from a conversation turn"""
        combined_text = f"{user_message} {coach_response}"
        
        updates = {
            "new_dislikes": list(self.extract_dislikes(user_message)),  # Only from user messages
            "injury_mentions": self.extract_injuries(combined_text),
            "equipment_changes": self.extract_equipment_changes(user_message),
            "goal_changes": self.extract_goal_changes(user_message),
            "timestamp": datetime.now().isoformat()
        }
        
        # Filter out empty updates
        return {k: v for k, v in updates.items() if v}

# Global extractor instance
profile_extractor = ProfileExtractor()

def sync_memory_to_profile(user_id: str, user_message: str, coach_response: str, profile_manager):
    """Sync conversation insights to user profile"""
    if not profile_manager:
        return
    
    try:
        # Extract updates
        updates = profile_extractor.extract_profile_updates(user_message, coach_response)
        
        if not updates:
            return  # Nothing to update
        
        print(f"🔄 Syncing profile updates for {user_id}: {list(updates.keys())}")
        
        # Apply updates to profile
        profile_changes = {}
        
        # Add new dislikes
        if "new_dislikes" in updates:
            profile_changes["disliked_exercises"] = updates["new_dislikes"]
            print(f"   📝 New dislikes: {updates['new_dislikes']}")
        
        # Update equipment availability
        if "equipment_changes" in updates:
            equipment_updates = []
            for change in updates["equipment_changes"]:
                equipment_updates.append({
                    "equipment": change["equipment"],
                    "available": change["action"] == "added",
                    "updated": change["date"]
                })
            profile_changes["equipment_updates"] = equipment_updates
            print(f"   🏋️ Equipment changes: {len(equipment_updates)} items")
        
        # Update goals
        if "goal_changes" in updates:
            profile_changes["primary_goals"] = updates["goal_changes"]
            print(f"   🎯 Goal changes: {updates['goal_changes']}")
        
        # Add injury mentions (don't auto-add as active injuries, just log)
        if "injury_mentions" in updates:
            profile_changes["injury_mentions"] = updates["injury_mentions"]
            print(f"   ⚠️  Injury mentions detected: {[i['body_part'] for i in updates['injury_mentions']]}")
        
        # Update the profile
        if profile_changes:
            success = profile_manager.update_profile_from_conversation(user_id, profile_changes)
            if success:
                print(f"✅ Profile sync successful for {user_id}")
            else:
                print(f"❌ Profile sync failed for {user_id}")
        
    except Exception as e:
        print(f"Error syncing memory to profile: {e}")

def extract_preference_updates(conversation_history: List[Dict[str, str]]) -> Dict[str, any]:
    """Extract preference updates from recent conversation history"""
    preferences = {
        "tone_preference": None,
        "length_preference": None,
        "exercise_style_preference": None
    }
    
    # Analyze last few messages for preference indicators
    recent_messages = conversation_history[-6:]  # Last 3 exchanges
    
    for msg in recent_messages:
        if msg.get("role") == "user":
            text = msg.get("text", "").lower()
            
            # Tone preferences
            if any(word in text for word in ["more technical", "detailed", "science"]):
                preferences["tone_preference"] = "technical"
            elif any(word in text for word in ["keep it simple", "brief", "short"]):
                preferences["tone_preference"] = "casual"
            elif any(word in text for word in ["motivate", "pump", "encouraging"]):
                preferences["tone_preference"] = "motivational"
            
            # Length preferences
            if any(word in text for word in ["too long", "shorter", "brief"]):
                preferences["length_preference"] = "brief"
            elif any(word in text for word in ["more detail", "explain more", "expand"]):
                preferences["length_preference"] = "detailed"
    
    return {k: v for k, v in preferences.items() if v}  # Filter None values
