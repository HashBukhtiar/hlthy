"""
Memory to Profile Sync - Closed Loop Learning with Extract→Confirm→Commit Workflow
Extracts durable facts from conversations and updates user profiles with confidence tracking
"""

import re
import json
from typing import Dict, List, Set, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, asdict
from enum import Enum

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


class ExtractionConfidence(Enum):
    """Confidence levels for extracted information"""
    LOW = 0.3
    MEDIUM = 0.6
    HIGH = 0.9
    EXPLICIT = 1.0


@dataclass
class ExtractedClaim:
    """Represents an extracted claim awaiting confirmation"""
    claim_id: str
    type: str  # "dislike", "injury", "equipment", "goal", "preference"
    raw_text: str
    normalized_value: str
    confidence: float
    context: str
    extracted_at: str
    requires_confirmation: bool = True
    confirmed: bool = False
    committed: bool = False
    
    def to_confirmation_question(self) -> str:
        """Generate natural confirmation question for this claim"""
        if self.type == "dislike":
            return f"It sounds like you don't enjoy {self.normalized_value}. Should I remember to avoid suggesting it?"
        elif self.type == "injury":
            return f"I noticed you mentioned {self.normalized_value} pain/issues. Should I adjust recommendations accordingly?"
        elif self.type == "equipment":
            action = "have access to" if "added" in self.context else "no longer have"
            return f"Just to confirm - you {action} {self.normalized_value}, right?"
        elif self.type == "goal":
            return f"It seems like {self.normalized_value} is important to you. Should I prioritize this in your plans?"
        elif self.type == "preference":
            return f"I want to make sure I'm communicating the way you prefer - {self.normalized_value}. Is that right?"
        return f"Did I understand correctly: {self.normalized_value}?"


class ConfidenceBasedExtractor:
    """Enhanced extractor with confidence scoring and confirmation workflow"""
    
    def __init__(self):
        # Enhanced patterns with confidence indicators
        self.dislike_patterns = [
            (r"hate\s+(\w+(?:\s+\w+){0,2})", ExtractionConfidence.HIGH),
            (r"can't stand\s+(\w+(?:\s+\w+){0,2})", ExtractionConfidence.HIGH),
            (r"don't like\s+(\w+(?:\s+\w+){0,2})", ExtractionConfidence.HIGH),
            (r"avoid\s+(\w+(?:\s+\w+){0,2})", ExtractionConfidence.MEDIUM),
            (r"(\w+(?:\s+\w+){0,2})\s+sucks?", ExtractionConfidence.MEDIUM),
            (r"not a fan of\s+(\w+(?:\s+\w+){0,2})", ExtractionConfidence.MEDIUM),
            (r"skip\s+(\w+(?:\s+\w+){0,2})", ExtractionConfidence.LOW)
        ]
        
        self.injury_patterns = [
            (r"my\s+(\w+)\s+(?:hurts?|is sore|pain|bothering)", ExtractionConfidence.HIGH),
            (r"(\w+)\s+(?:injury|problem|issue)", ExtractionConfidence.HIGH),
            (r"hurt my\s+(\w+)", ExtractionConfidence.HIGH),
            (r"(\w+)\s+is bothering me", ExtractionConfidence.MEDIUM),
            (r"(\w+)\s+has been bothering me", ExtractionConfidence.MEDIUM),
            (r"recovering from\s+(\w+)\s+(?:injury|surgery)", ExtractionConfidence.EXPLICIT),
            (r"(\w+)\s+feels?\s+(?:tight|stiff|uncomfortable)", ExtractionConfidence.MEDIUM)
        ]
        
        self.equipment_patterns = [
            (r"(?:no|don't have|missing)\s+([\w\s]+?)(?:\s+at|$)", ExtractionConfidence.HIGH),
            (r"gym (?:doesn't have|lacks)\s+([\w\s]+)", ExtractionConfidence.HIGH),
            (r"(?:got|have|bought)\s+(?:new|a)\s+([\w\s]+)", ExtractionConfidence.MEDIUM),
            (r"wish I had\s+([\w\s]+)", ExtractionConfidence.LOW)
        ]
        
        self.goal_patterns = [
            (r"want to\s+(lose weight|gain muscle|get stronger|build muscle|cut fat)", ExtractionConfidence.HIGH),
            (r"goal is to\s+([\w\s]+)", ExtractionConfidence.EXPLICIT),
            (r"trying to\s+(lose|gain|build|cut|get)\s+([\w\s]+)", ExtractionConfidence.MEDIUM),
            (r"focused on\s+([\w\s]+)", ExtractionConfidence.MEDIUM)
        ]
        
        self.preference_patterns = [
            (r"prefer\s+([\w\s]+)", ExtractionConfidence.HIGH),
            (r"like it when\s+([\w\s]+)", ExtractionConfidence.MEDIUM),
            (r"keep it\s+(brief|short|detailed|simple)", ExtractionConfidence.HIGH)
        ]
        
        # Pending claims storage
        self.pending_claims: Dict[str, List[ExtractedClaim]] = {}
    
    def extract_with_confidence(self, text: str, context: str = "") -> List[ExtractedClaim]:
        """Extract claims with confidence scoring"""
        import uuid
        claims = []
        text_lower = text.lower()
        
        # Extract dislikes
        for pattern, confidence in self.dislike_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                exercise = match.strip()
                if len(exercise) > 2:
                    normalized_id = self._normalize_to_exercise_id(exercise)
                    normalized = normalized_id or exercise
                    
                    claim = ExtractedClaim(
                        claim_id=str(uuid.uuid4()),
                        type="dislike",
                        raw_text=match,
                        normalized_value=normalized,
                        confidence=confidence.value,
                        context=context,
                        extracted_at=datetime.now().isoformat(),
                        requires_confirmation=confidence != ExtractionConfidence.EXPLICIT
                    )
                    claims.append(claim)
        
        # Extract injuries
        for pattern, confidence in self.injury_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                body_part = match.strip()
                normalized = self._normalize_body_part(body_part)
                if normalized:
                    claim = ExtractedClaim(
                        claim_id=str(uuid.uuid4()),
                        type="injury",
                        raw_text=match,
                        normalized_value=normalized,
                        confidence=confidence.value,
                        context=context,
                        extracted_at=datetime.now().isoformat(),
                        requires_confirmation=confidence != ExtractionConfidence.EXPLICIT
                    )
                    claims.append(claim)
        
        # Extract equipment changes
        for pattern, confidence in self.equipment_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                equipment = match.strip()
                if len(equipment) > 2:
                    action = "removed" if any(neg in text_lower for neg in ["no", "don't have", "missing", "lacks"]) else "added"
                    
                    claim = ExtractedClaim(
                        claim_id=str(uuid.uuid4()),
                        type="equipment",
                        raw_text=match,
                        normalized_value=equipment,
                        confidence=confidence.value,
                        context=f"action:{action}",
                        extracted_at=datetime.now().isoformat(),
                        requires_confirmation=confidence != ExtractionConfidence.EXPLICIT
                    )
                    claims.append(claim)
        
        # Extract goals
        for pattern, confidence in self.goal_patterns:
            matches = re.findall(pattern, text_lower, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    goal = " ".join(match).strip()
                else:
                    goal = match.strip()
                
                normalized = self._normalize_goal(goal)
                if normalized:
                    claim = ExtractedClaim(
                        claim_id=str(uuid.uuid4()),
                        type="goal",
                        raw_text=str(match),
                        normalized_value=normalized,
                        confidence=confidence.value,
                        context=context,
                        extracted_at=datetime.now().isoformat(),
                        requires_confirmation=confidence != ExtractionConfidence.EXPLICIT
                    )
                    claims.append(claim)
        
        return claims
    
    def add_pending_claims(self, user_id: str, claims: List[ExtractedClaim]):
        """Add claims to pending confirmation queue"""
        if user_id not in self.pending_claims:
            self.pending_claims[user_id] = []
        
        # Filter out high-confidence claims that don't need confirmation
        for claim in claims:
            if claim.requires_confirmation:
                self.pending_claims[user_id].append(claim)
            else:
                # Auto-commit high confidence claims
                claim.confirmed = True
                claim.committed = True
                self.pending_claims[user_id].append(claim)
    
    def get_pending_confirmations(self, user_id: str, limit: int = 2) -> List[ExtractedClaim]:
        """Get next claims needing confirmation"""
        if user_id not in self.pending_claims:
            return []
        
        unconfirmed = [
            claim for claim in self.pending_claims[user_id]
            if not claim.confirmed and claim.requires_confirmation
        ]
        
        # Sort by confidence (ask about higher confidence claims first)
        unconfirmed.sort(key=lambda x: x.confidence, reverse=True)
        return unconfirmed[:limit]
    
    def confirm_claim(self, user_id: str, claim_id: str, confirmed: bool) -> bool:
        """Mark claim as confirmed or rejected"""
        if user_id not in self.pending_claims:
            return False
        
        for claim in self.pending_claims[user_id]:
            if claim.claim_id == claim_id:
                claim.confirmed = confirmed
                return True
        return False
    
    def get_claims_for_commit(self, user_id: str) -> List[ExtractedClaim]:
        """Get confirmed claims ready for profile commit"""
        if user_id not in self.pending_claims:
            return []
        
        return [
            claim for claim in self.pending_claims[user_id]
            if claim.confirmed and not claim.committed
        ]
    
    def mark_claims_committed(self, user_id: str, claim_ids: List[str]):
        """Mark claims as committed to profile"""
        if user_id not in self.pending_claims:
            return
        
        for claim in self.pending_claims[user_id]:
            if claim.claim_id in claim_ids:
                claim.committed = True
    
    def cleanup_old_claims(self, user_id: str, days_old: int = 7):
        """Remove old committed or rejected claims"""
        if user_id not in self.pending_claims:
            return
        
        from datetime import datetime, timezone, timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)
        
        self.pending_claims[user_id] = [
            claim for claim in self.pending_claims[user_id]
            if not claim.committed or 
               datetime.fromisoformat(claim.extracted_at) > cutoff
        ]
    
    # Legacy methods for backward compatibility
    def extract_dislikes(self, text: str) -> Set[str]:
        """Extract exercise dislikes from text (legacy method)"""
        claims = self.extract_with_confidence(text)
        dislike_claims = [c for c in claims if c.type == "dislike"]
        return {claim.normalized_value for claim in dislike_claims}

    def extract_injuries(self, text: str) -> List[Dict[str, str]]:
        """Extract injury mentions from text (legacy method)"""
        claims = self.extract_with_confidence(text)
        injury_claims = [c for c in claims if c.type == "injury"]
        
        return [
            {
                "body_part": claim.normalized_value,
                "status": "active",
                "date_mentioned": datetime.now().isoformat()[:10]
            }
            for claim in injury_claims
        ]

    def extract_equipment_changes(self, text: str) -> List[Dict[str, str]]:
        """Extract equipment availability changes (legacy method)"""
        claims = self.extract_with_confidence(text)
        equipment_claims = [c for c in claims if c.type == "equipment"]
        
        return [
            {
                "equipment": claim.normalized_value,
                "action": claim.context.split(":")[-1],
                "date": datetime.now().isoformat()[:10]
            }
            for claim in equipment_claims
        ]

    def extract_goal_changes(self, text: str) -> List[str]:
        """Extract goal mentions from text (legacy method)"""
        claims = self.extract_with_confidence(text)
        goal_claims = [c for c in claims if c.type == "goal"]
        return [claim.normalized_value for claim in goal_claims]

    def extract_profile_updates(self, user_message: str, coach_response: str) -> Dict[str, any]:
        """Extract all profile updates from a conversation turn (legacy method)"""
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
    
    # Normalization methods
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
        
        return body_part  # Return original if no mapping found
    
    def _normalize_goal(self, goal_text: str) -> str:
        """Normalize goal text to standard goal types"""
        goal_lower = goal_text.lower()
        
        if any(term in goal_lower for term in ["lose", "cut", "fat", "weight loss"]):
            return "fat_loss"
        elif any(term in goal_lower for term in ["gain", "muscle", "bulk", "hypertrophy", "mass"]):
            return "muscle_building"
        elif any(term in goal_lower for term in ["strong", "strength", "power"]):
            return "strength"
        elif "endurance" in goal_lower:
            return "endurance"
        elif any(term in goal_lower for term in ["tone", "lean", "definition"]):
            return "body_composition"
        
        return goal_text  # Return original if no mapping found
        
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
confidence_extractor = ConfidenceBasedExtractor()

# Legacy compatibility
profile_extractor = confidence_extractor


class EnhancedProfileSync:
    """Enhanced profile sync with extract→confirm→commit workflow"""
    
    def __init__(self, extractor: ConfidenceBasedExtractor, profile_manager=None):
        self.extractor = extractor
        self.profile_manager = profile_manager
    
    def process_conversation_turn(self, user_id: str, user_message: str, 
                                 coach_response: str) -> Dict[str, any]:
        """Process conversation turn with extract→confirm→commit workflow"""
        
        # EXTRACT phase - extract claims from conversation
        extracted_claims = self.extractor.extract_with_confidence(
            text=user_message, 
            context=f"conversation_turn_{datetime.now().isoformat()}"
        )
        
        if not extracted_claims:
            return {"phase": "extract", "claims_found": 0}
        
        # Add to pending claims
        self.extractor.add_pending_claims(user_id, extracted_claims)
        
        # Get any claims ready for confirmation
        pending_confirmations = self.extractor.get_pending_confirmations(user_id, limit=2)
        
        # Get any confirmed claims ready for commit
        ready_for_commit = self.extractor.get_claims_for_commit(user_id)
        
        # COMMIT phase - apply confirmed claims to profile
        committed_claims = []
        if ready_for_commit and self.profile_manager:
            committed_claims = self._commit_claims_to_profile(user_id, ready_for_commit)
        
        # Helper to convert confidence float to label
        def confidence_to_label(conf: float) -> str:
            if conf >= 0.8:
                return "HIGH"
            elif conf >= 0.5:
                return "MEDIUM"
            else:
                return "LOW"
        
        return {
            "phase": "extract_confirm_commit",
            "claims_extracted": len(extracted_claims),
            "pending_confirmations": [
                {
                    "claim_id": claim.claim_id,
                    "type": claim.type,  # e.g., "dislike", "injury", "equipment_limitation"
                    "value": claim.normalized_value if claim.type != "injury" else {
                        "body_part": claim.normalized_value,
                        "severity": "moderate"
                    },
                    "confidence": confidence_to_label(claim.confidence),  # e.g., "HIGH", "MEDIUM", "LOW"
                    "needs_confirmation": claim.requires_confirmation,
                    "question": claim.to_confirmation_question()
                }
                for claim in pending_confirmations
            ],
            "claims_committed": len(committed_claims),
            "committed_details": committed_claims
        }
    
    def confirm_user_claims(self, user_id: str, confirmations: Dict[str, bool]) -> Dict[str, any]:
        """CONFIRM phase - user confirms or rejects claims"""
        confirmed_count = 0
        
        for claim_id, confirmed in confirmations.items():
            if self.extractor.confirm_claim(user_id, claim_id, confirmed):
                confirmed_count += 1
        
        # Check if any newly confirmed claims are ready for commit
        ready_for_commit = self.extractor.get_claims_for_commit(user_id)
        committed_claims = []
        
        if ready_for_commit and self.profile_manager:
            committed_claims = self._commit_claims_to_profile(user_id, ready_for_commit)
        
        return {
            "phase": "confirm",
            "claims_confirmed": confirmed_count,
            "claims_committed": len(committed_claims),
            "committed_details": committed_claims
        }
    
    def _commit_claims_to_profile(self, user_id: str, claims: List[ExtractedClaim]) -> List[Dict]:
        """COMMIT phase - apply confirmed claims to user profile"""
        committed_details = []
        claim_ids_to_mark = []
        
        for claim in claims:
            try:
                if claim.type == "dislike":
                    # Add to disliked exercises
                    success = self._add_dislike_to_profile(user_id, claim.normalized_value)
                    if success:
                        committed_details.append({
                            "type": "dislike_added",
                            "value": claim.normalized_value,
                            "confidence": claim.confidence
                        })
                        claim_ids_to_mark.append(claim.claim_id)
                
                elif claim.type == "injury":
                    # Add injury with confidence scoring
                    severity = max(1, int(claim.confidence * 10))  # Convert confidence to 1-10 severity
                    success = self._add_injury_to_profile(user_id, claim.normalized_value, severity, claim.confidence)
                    if success:
                        committed_details.append({
                            "type": "injury_added",
                            "value": claim.normalized_value,
                            "severity": severity,
                            "confidence": claim.confidence
                        })
                        claim_ids_to_mark.append(claim.claim_id)
                
                elif claim.type == "equipment":
                    # Update equipment availability
                    action = claim.context.split(":")[-1]
                    success = self._update_equipment_in_profile(user_id, claim.normalized_value, action == "added")
                    if success:
                        committed_details.append({
                            "type": "equipment_updated",
                            "value": claim.normalized_value,
                            "available": action == "added",
                            "confidence": claim.confidence
                        })
                        claim_ids_to_mark.append(claim.claim_id)
                
                elif claim.type == "goal":
                    # Update goals
                    success = self._update_goal_in_profile(user_id, claim.normalized_value)
                    if success:
                        committed_details.append({
                            "type": "goal_updated",
                            "value": claim.normalized_value,
                            "confidence": claim.confidence
                        })
                        claim_ids_to_mark.append(claim.claim_id)
                
                elif claim.type == "preference":
                    # Update communication preferences
                    success = self._update_preference_in_profile(user_id, claim.normalized_value)
                    if success:
                        committed_details.append({
                            "type": "preference_updated",
                            "value": claim.normalized_value,
                            "confidence": claim.confidence
                        })
                        claim_ids_to_mark.append(claim.claim_id)
                
            except Exception as e:
                print(f"Error committing claim {claim.claim_id}: {e}")
        
        # Mark claims as committed
        if claim_ids_to_mark:
            self.extractor.mark_claims_committed(user_id, claim_ids_to_mark)
        
        return committed_details
    
    def _add_dislike_to_profile(self, user_id: str, exercise: str) -> bool:
        """Add exercise dislike to profile"""
        if hasattr(self.profile_manager, 'get_profile'):
            profile = self.profile_manager.get_profile(user_id)
            if profile:
                if exercise not in profile.disliked_exercises:
                    profile.disliked_exercises.append(exercise)
                    return self.profile_manager.save_profile(profile)
        return False
    
    def _add_injury_to_profile(self, user_id: str, body_part: str, severity: int, confidence: float) -> bool:
        """Add injury to profile with confidence tracking"""
        if hasattr(self.profile_manager, 'add_injury'):
            return self.profile_manager.add_injury(
                user_id=user_id,
                injury_type=body_part,
                affected_area=body_part,
                severity=severity,
                source="conversational_extraction",
                confidence=confidence
            )
        return False
    
    def _update_equipment_in_profile(self, user_id: str, equipment: str, available: bool) -> bool:
        """Update equipment availability in profile"""
        if hasattr(self.profile_manager, 'get_profile'):
            profile = self.profile_manager.get_profile(user_id)
            if profile:
                if available and equipment not in profile.preferred_equipment:
                    profile.preferred_equipment.append(equipment)
                elif not available and equipment in profile.preferred_equipment:
                    profile.preferred_equipment.remove(equipment)
                return self.profile_manager.save_profile(profile)
        return False
    
    def _update_goal_in_profile(self, user_id: str, goal: str) -> bool:
        """Update primary goal in profile"""
        if hasattr(self.profile_manager, 'get_profile'):
            profile = self.profile_manager.get_profile(user_id)
            if profile and profile.goals:
                profile.goals.primary_goal = goal
                return self.profile_manager.save_profile(profile)
        return False
    
    def _update_preference_in_profile(self, user_id: str, preference: str) -> bool:
        """Update communication preference in profile"""
        if hasattr(self.profile_manager, 'get_profile'):
            profile = self.profile_manager.get_profile(user_id)
            if profile:
                # Map preference to appropriate field
                if any(term in preference.lower() for term in ["brief", "short"]):
                    profile.reply_length = "brief"
                elif any(term in preference.lower() for term in ["detail", "long"]):
                    profile.reply_length = "detailed"
                elif any(term in preference.lower() for term in ["technical", "science"]):
                    profile.coaching_tone = "technical"
                elif any(term in preference.lower() for term in ["casual", "friendly"]):
                    profile.coaching_tone = "supportive"
                
                return self.profile_manager.save_profile(profile)
        return False


# Enhanced global sync instance
enhanced_profile_sync = EnhancedProfileSync(confidence_extractor)

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
