"""
Program State and Progression Tracking
Stores last used loads/RPE per exercise and suggests progression
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from pathlib import Path

class ProgressionTracker:
    """Tracks exercise progression state outside of LLM"""
    
    def __init__(self, data_dir: str = "user_profiles"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.user_states = {}  # Cache for active user states
    
    def _get_user_file(self, user_id: str) -> Path:
        """Get file path for user's progression state"""
        return self.data_dir / f"{user_id}_progression.json"
    
    def load_user_state(self, user_id: str) -> Dict[str, any]:
        """Load user's exercise progression state"""
        if user_id in self.user_states:
            return self.user_states[user_id]
        
        user_file = self._get_user_file(user_id)
        if user_file.exists():
            try:
                with open(user_file, 'r') as f:
                    state = json.load(f)
                    self.user_states[user_id] = state
                    return state
            except Exception as e:
                print(f"Error loading progression state for {user_id}: {e}")
        
        # Default empty state
        default_state = {
            "last_updated": datetime.now().isoformat(),
            "exercise_history": {},  # exercise_id -> [sessions]
            "current_loads": {},     # exercise_id -> {"weight": 135, "rpe": 7, "date": "2024-01-01"}
            "progression_notes": []
        }
        self.user_states[user_id] = default_state
        return default_state
    
    def save_user_state(self, user_id: str):
        """Save user's progression state to disk"""
        if user_id not in self.user_states:
            return
        
        try:
            user_file = self._get_user_file(user_id)
            self.user_states[user_id]["last_updated"] = datetime.now().isoformat()
            
            with open(user_file, 'w') as f:
                json.dump(self.user_states[user_id], f, indent=2)
        except Exception as e:
            print(f"Error saving progression state for {user_id}: {e}")
    
    def record_exercise_performance(self, user_id: str, exercise_id: str, 
                                  weight: Optional[float], rpe: Optional[float],
                                  sets: int, reps: int):
        """Record exercise performance for progression tracking"""
        state = self.load_user_state(user_id)
        
        session_data = {
            "date": datetime.now().isoformat()[:10],  # YYYY-MM-DD
            "exercise_id": exercise_id,
            "weight": weight,
            "rpe": rpe,
            "sets": sets,
            "reps": reps
        }
        
        # Add to exercise history
        if exercise_id not in state["exercise_history"]:
            state["exercise_history"][exercise_id] = []
        
        state["exercise_history"][exercise_id].append(session_data)
        
        # Keep only last 10 sessions per exercise
        state["exercise_history"][exercise_id] = state["exercise_history"][exercise_id][-10:]
        
        # Update current load if provided
        if weight is not None and rpe is not None:
            state["current_loads"][exercise_id] = {
                "weight": weight,
                "rpe": rpe,
                "date": session_data["date"],
                "sets": sets,
                "reps": reps
            }
        
        self.save_user_state(user_id)
    
    def suggest_progression(self, user_id: str, exercise_id: str, 
                          target_sets: int, target_reps: int) -> Dict[str, any]:
        """Suggest progression based on last performance"""
        state = self.load_user_state(user_id)
        
        if exercise_id not in state["current_loads"]:
            return {
                "suggested_weight": "bodyweight" if "bodyweight" in exercise_id else "start_light",
                "suggested_rpe": "6-7",
                "progression_note": "No previous data - start with conservative load"
            }
        
        last_performance = state["current_loads"][exercise_id]
        last_weight = last_performance["weight"]
        last_rpe = last_performance["rpe"]
        last_date = last_performance["date"]
        
        # Check if exercise was done recently (within 7 days)
        try:
            last_session = datetime.fromisoformat(last_date)
            days_since = (datetime.now() - last_session).days
        except:
            days_since = 999
        
        # Progression logic based on RPE
        if last_rpe <= 6:
            # Too easy - significant increase
            weight_increase = max(2.5, last_weight * 0.05)  # 5% or 2.5 lbs minimum
            suggested_weight = last_weight + weight_increase
            progression_note = f"Previous RPE {last_rpe} - increasing load significantly"
        elif last_rpe <= 7:
            # Good for progression - moderate increase
            weight_increase = max(2.5, last_weight * 0.025)  # 2.5% or 2.5 lbs minimum
            suggested_weight = last_weight + weight_increase
            progression_note = f"Previous RPE {last_rpe} - standard progression"
        elif last_rpe <= 8:
            # Challenging but manageable - small increase or add reps
            if target_reps == last_performance.get("reps", target_reps):
                # Same reps - small weight increase
                weight_increase = 2.5
                suggested_weight = last_weight + weight_increase
                progression_note = f"Previous RPE {last_rpe} - small weight increase"
            else:
                # Keep weight, focus on reps/volume
                suggested_weight = last_weight
                progression_note = f"Previous RPE {last_rpe} - maintain weight, focus on reps"
        else:
            # RPE 9+ - maintain or reduce slightly
            suggested_weight = last_weight
            progression_note = f"Previous RPE {last_rpe} - maintain or reduce load, focus on form"
        
        # Adjust for time gap
        if days_since > 14:
            suggested_weight = max(suggested_weight * 0.9, last_weight - 10)
            progression_note += f" (reduced due to {days_since} day gap)"
        
        return {
            "suggested_weight": round(suggested_weight, 1) if isinstance(suggested_weight, float) else suggested_weight,
            "suggested_rpe": "7-8" if last_rpe <= 7 else "6-7",
            "progression_note": progression_note,
            "last_performance": f"{last_weight}lbs @ RPE{last_rpe} ({days_since} days ago)"
        }
    
    def get_progression_context_for_workout(self, user_id: str, exercise_ids: list) -> str:
        """Get progression context for workout planning"""
        context_lines = []
        
        for exercise_id in exercise_ids[:5]:  # Limit to 5 exercises to save tokens
            suggestion = self.suggest_progression(user_id, exercise_id, 3, 8)  # Default 3x8
            if "start_light" not in str(suggestion["suggested_weight"]):
                context_lines.append(
                    f"{exercise_id}: last {suggestion.get('last_performance', 'N/A')} "
                    f"→ suggest {suggestion['suggested_weight']}lbs @ {suggestion['suggested_rpe']}"
                )
        
        if context_lines:
            return f"PROGRESSION CONTEXT:\n" + "\n".join(context_lines) + "\n"
        return ""

# Global progression tracker instance
progression_tracker = ProgressionTracker()

def get_progression_suggestions(user_id: str, exercise_ids: list) -> str:
    """Helper function for workout planning with progression context"""
    return progression_tracker.get_progression_context_for_workout(user_id, exercise_ids)

def record_workout_performance(user_id: str, workout_data: dict):
    """Record workout performance from completed workout JSON"""
    if not workout_data or "segments" not in workout_data:
        return
    
    for segment in workout_data["segments"]:
        for exercise in segment.get("exercises", []):
            exercise_id = exercise.get("exerciseId")
            if not exercise_id:
                continue
            
            # Parse load information
            load_str = exercise.get("load", "")
            weight = None
            rpe = None
            
            # Extract weight and RPE from load string
            if "lbs" in load_str.lower():
                try:
                    weight = float(load_str.lower().split("lbs")[0].strip())
                except:
                    pass
            
            if "rpe" in load_str.lower():
                try:
                    rpe_part = load_str.lower().split("rpe")[-1].strip()
                    rpe = float(rpe_part.split()[0])
                except:
                    pass
            
            # Record performance
            progression_tracker.record_exercise_performance(
                user_id=user_id,
                exercise_id=exercise_id,
                weight=weight,
                rpe=rpe,
                sets=exercise.get("sets", 3),
                reps=exercise.get("reps", 8)
            )
