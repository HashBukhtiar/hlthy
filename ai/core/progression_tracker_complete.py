"""
Progression Tracker - Enhanced progression tracking with segment awareness
"""
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import json


@dataclass
class ProgressionRecord:
    """Individual progression record for an exercise"""
    exercise_id: str
    date: datetime
    sets: List[Dict[str, Any]]  # [{'reps': 10, 'weight': 135, 'rpe': 7}]
    notes: str = ""
    form_rating: Optional[int] = None  # 1-10 scale
    perceived_difficulty: Optional[int] = None  # 1-10 scale
    
    def calculate_volume(self) -> float:
        """Calculate total volume (sets * reps * weight)"""
        total_volume = 0
        for set_data in self.sets:
            reps = set_data.get('reps', 0)
            weight = set_data.get('weight', 0)
            total_volume += reps * weight
        return total_volume
    
    def get_max_weight(self) -> float:
        """Get maximum weight used in this session"""
        if not self.sets:
            return 0
        return max(set_data.get('weight', 0) for set_data in self.sets)
    
    def get_total_reps(self) -> int:
        """Get total reps performed"""
        return sum(set_data.get('reps', 0) for set_data in self.sets)
    
    def estimate_1rm(self) -> float:
        """Estimate 1RM using Brzycki formula"""
        max_weight = self.get_max_weight()
        if max_weight == 0:
            return 0
        
        # Find the set with max weight
        max_weight_set = max(self.sets, key=lambda x: x.get('weight', 0))
        reps = max_weight_set.get('reps', 1)
        
        if reps == 1:
            return max_weight
        elif reps <= 10:
            # Brzycki formula: 1RM = weight / (1.0278 - (0.0278 * reps))
            return max_weight / (1.0278 - (0.0278 * reps))
        else:
            # For higher reps, use Epley formula
            return max_weight * (1 + reps / 30)


@dataclass
class ProgressionMetrics:
    """Aggregate progression metrics for an exercise"""
    exercise_id: str
    total_sessions: int
    total_volume: float
    volume_trend: float  # % change over last 4 weeks
    max_weight: float
    weight_trend: float  # % change over last 4 weeks
    estimated_1rm: float
    form_consistency: float  # Average form rating
    recent_performance: List[ProgressionRecord]
    
    def get_progression_status(self) -> str:
        """Get overall progression status"""
        if self.volume_trend > 10:
            return "Excellent Progress"
        elif self.volume_trend > 5:
            return "Good Progress"
        elif self.volume_trend > 0:
            return "Steady Progress"
        elif self.volume_trend > -5:
            return "Maintenance"
        else:
            return "Declining"
    
    def get_recommendations(self) -> List[str]:
        """Get progression recommendations"""
        recommendations = []
        
        if self.volume_trend < 0:
            recommendations.append("Consider deload week or form check")
        elif self.volume_trend > 15:
            recommendations.append("Great progress! Consider progressive overload")
        
        if self.form_consistency < 7:
            recommendations.append("Focus on form improvement before increasing weight")
        
        if self.total_sessions < 3:
            recommendations.append("Need more data for reliable progression tracking")
        
        return recommendations


class ProgressionTracker:
    """
    Enhanced progression tracker with segment-aware analytics
    """
    
    def __init__(self, storage_path: str = "progression_data"):
        self.storage_path = storage_path
        self.progression_records: Dict[str, List[ProgressionRecord]] = {}
        self.user_profiles: Dict[str, Dict] = {}
        
        # Load existing data
        self._load_data()
    
    def log_workout_session(self, user_id: str, workout_data: Dict[str, Any]) -> bool:
        """
        Log a complete workout session
        
        Args:
            user_id: User identifier
            workout_data: Complete workout data with exercises and performance
            
        Returns:
            Success status
        """
        try:
            session_date = datetime.now()
            
            if user_id not in self.progression_records:
                self.progression_records[user_id] = {}
            
            # Process each exercise in the workout
            exercises = workout_data.get('exercises', [])
            for exercise in exercises:
                exercise_id = exercise.get('exercise_id')
                if not exercise_id:
                    continue
                
                # Extract performance data
                sets_data = exercise.get('sets', [])
                if not sets_data:
                    continue
                
                # Create progression record
                record = ProgressionRecord(
                    exercise_id=exercise_id,
                    date=session_date,
                    sets=sets_data,
                    notes=exercise.get('notes', ''),
                    form_rating=exercise.get('form_rating'),
                    perceived_difficulty=exercise.get('difficulty')
                )
                
                # Store record
                if exercise_id not in self.progression_records[user_id]:
                    self.progression_records[user_id][exercise_id] = []
                
                self.progression_records[user_id][exercise_id].append(record)
            
            # Update user profile
            self._update_user_profile(user_id, workout_data, session_date)
            
            # Save data
            self._save_data()
            
            return True
            
        except Exception as e:
            print(f"Error logging workout session: {e}")
            return False
    
    def get_exercise_progression(self, user_id: str, exercise_id: str, 
                               weeks_back: int = 12) -> Optional[ProgressionMetrics]:
        """
        Get progression metrics for a specific exercise
        
        Args:
            user_id: User identifier
            exercise_id: Exercise to analyze
            weeks_back: How many weeks of data to analyze
            
        Returns:
            ProgressionMetrics or None if insufficient data
        """
        if user_id not in self.progression_records:
            return None
        
        if exercise_id not in self.progression_records[user_id]:
            return None
        
        # Get records within time window
        cutoff_date = datetime.now() - timedelta(weeks=weeks_back)
        all_records = self.progression_records[user_id][exercise_id]
        recent_records = [r for r in all_records if r.date >= cutoff_date]
        
        if len(recent_records) < 2:
            return None
        
        # Calculate metrics
        total_sessions = len(recent_records)
        total_volume = sum(r.calculate_volume() for r in recent_records)
        max_weight = max(r.get_max_weight() for r in recent_records)
        
        # Calculate trends (last 4 weeks vs previous 4 weeks)
        mid_point = datetime.now() - timedelta(weeks=4)
        recent_period = [r for r in recent_records if r.date >= mid_point]
        older_period = [r for r in recent_records if r.date < mid_point]
        
        volume_trend = 0
        weight_trend = 0
        
        if recent_period and older_period:
            recent_avg_volume = sum(r.calculate_volume() for r in recent_period) / len(recent_period)
            older_avg_volume = sum(r.calculate_volume() for r in older_period) / len(older_period)
            
            if older_avg_volume > 0:
                volume_trend = ((recent_avg_volume - older_avg_volume) / older_avg_volume) * 100
            
            recent_max_weight = max(r.get_max_weight() for r in recent_period)
            older_max_weight = max(r.get_max_weight() for r in older_period)
            
            if older_max_weight > 0:
                weight_trend = ((recent_max_weight - older_max_weight) / older_max_weight) * 100
        
        # Form consistency
        form_ratings = [r.form_rating for r in recent_records if r.form_rating is not None]
        form_consistency = sum(form_ratings) / len(form_ratings) if form_ratings else 0
        
        # Estimated 1RM (use most recent record)
        estimated_1rm = recent_records[-1].estimate_1rm() if recent_records else 0
        
        return ProgressionMetrics(
            exercise_id=exercise_id,
            total_sessions=total_sessions,
            total_volume=total_volume,
            volume_trend=volume_trend,
            max_weight=max_weight,
            weight_trend=weight_trend,
            estimated_1rm=estimated_1rm,
            form_consistency=form_consistency,
            recent_performance=recent_records[-5:]  # Last 5 sessions
        )
    
    def get_user_progression_summary(self, user_id: str, 
                                   weeks_back: int = 8) -> Dict[str, Any]:
        """
        Get comprehensive progression summary for user
        
        Args:
            user_id: User identifier
            weeks_back: Weeks of data to analyze
            
        Returns:
            Comprehensive progression summary
        """
        if user_id not in self.progression_records:
            return {'error': 'No progression data found'}
        
        # Get progression for all exercises
        exercise_progressions = {}
        all_exercises = list(self.progression_records[user_id].keys())
        
        for exercise_id in all_exercises:
            progression = self.get_exercise_progression(user_id, exercise_id, weeks_back)
            if progression:
                exercise_progressions[exercise_id] = progression
        
        if not exercise_progressions:
            return {'error': 'Insufficient data for progression analysis'}
        
        # Calculate overall metrics
        total_sessions = len(set(
            record.date.strftime('%Y-%m-%d')
            for exercise_records in self.progression_records[user_id].values()
            for record in exercise_records
            if record.date >= datetime.now() - timedelta(weeks=weeks_back)
        ))
        
        # Find best and worst performing exercises
        sorted_by_trend = sorted(
            exercise_progressions.items(),
            key=lambda x: x[1].volume_trend,
            reverse=True
        )
        
        best_performers = sorted_by_trend[:3]
        worst_performers = sorted_by_trend[-3:]
        
        # Overall progression status
        avg_volume_trend = sum(p.volume_trend for p in exercise_progressions.values()) / len(exercise_progressions)
        
        if avg_volume_trend > 5:
            overall_status = "Excellent Progress"
        elif avg_volume_trend > 0:
            overall_status = "Good Progress"
        elif avg_volume_trend > -5:
            overall_status = "Maintenance Phase"
        else:
            overall_status = "Needs Attention"
        
        return {
            'user_id': user_id,
            'analysis_period': f'{weeks_back} weeks',
            'overall_status': overall_status,
            'total_sessions': total_sessions,
            'exercises_tracked': len(exercise_progressions),
            'average_volume_trend': avg_volume_trend,
            'best_performers': [
                {
                    'exercise_id': ex_id,
                    'volume_trend': metrics.volume_trend,
                    'status': metrics.get_progression_status()
                }
                for ex_id, metrics in best_performers
            ],
            'needs_attention': [
                {
                    'exercise_id': ex_id,
                    'volume_trend': metrics.volume_trend,
                    'recommendations': metrics.get_recommendations()
                }
                for ex_id, metrics in worst_performers
                if metrics.volume_trend < 0
            ],
            'exercise_details': {
                ex_id: {
                    'total_sessions': metrics.total_sessions,
                    'volume_trend': metrics.volume_trend,
                    'weight_trend': metrics.weight_trend,
                    'form_consistency': metrics.form_consistency,
                    'status': metrics.get_progression_status(),
                    'recommendations': metrics.get_recommendations()
                }
                for ex_id, metrics in exercise_progressions.items()
            }
        }
    
    def suggest_progressions(self, user_id: str, exercise_id: str) -> Dict[str, Any]:
        """
        Suggest specific progressions for an exercise
        
        Args:
            user_id: User identifier
            exercise_id: Exercise to analyze
            
        Returns:
            Progression suggestions
        """
        progression = self.get_exercise_progression(user_id, exercise_id)
        if not progression:
            return {'error': 'Insufficient data for progression suggestions'}
        
        suggestions = {
            'exercise_id': exercise_id,
            'current_status': progression.get_progression_status(),
            'suggestions': []
        }
        
        # Get latest performance
        latest_record = progression.recent_performance[-1] if progression.recent_performance else None
        if not latest_record:
            return suggestions
        
        latest_max_weight = latest_record.get_max_weight()
        latest_total_reps = latest_record.get_total_reps()
        latest_sets = len(latest_record.sets)
        
        # Weight progression suggestions
        if progression.form_consistency >= 8 and progression.volume_trend > 0:
            weight_increase = latest_max_weight * 0.025  # 2.5% increase
            suggestions['suggestions'].append({
                'type': 'weight_increase',
                'description': f'Increase weight by {weight_increase:.1f} lbs',
                'rationale': 'Good form and volume progression'
            })
        
        # Volume progression suggestions
        if progression.weight_trend < 5 and progression.form_consistency >= 7:
            suggestions['suggestions'].append({
                'type': 'volume_increase',
                'description': f'Add 1 set or 2-3 reps per set',
                'rationale': 'Focus on volume before weight increase'
            })
        
        # Form improvement suggestions
        if progression.form_consistency < 7:
            suggestions['suggestions'].append({
                'type': 'form_focus',
                'description': 'Focus on form improvement with current weight',
                'rationale': 'Form consistency below optimal range'
            })
        
        # Deload suggestions
        if progression.volume_trend < -10:
            deload_weight = latest_max_weight * 0.9  # 10% reduction
            suggestions['suggestions'].append({
                'type': 'deload',
                'description': f'Reduce weight to {deload_weight:.1f} lbs for 1-2 weeks',
                'rationale': 'Declining performance indicates need for recovery'
            })
        
        return suggestions
    
    def detect_plateaus(self, user_id: str, weeks_threshold: int = 4) -> List[Dict[str, Any]]:
        """
        Detect exercises that have plateaued
        
        Args:
            user_id: User identifier
            weeks_threshold: Number of weeks to consider for plateau detection
            
        Returns:
            List of plateaued exercises with suggestions
        """
        if user_id not in self.progression_records:
            return []
        
        plateaued_exercises = []
        
        for exercise_id in self.progression_records[user_id].keys():
            progression = self.get_exercise_progression(user_id, exercise_id, weeks_threshold * 2)
            if not progression or progression.total_sessions < 3:
                continue
            
            # Detect plateau: minimal progress for the threshold period
            if abs(progression.volume_trend) < 2 and abs(progression.weight_trend) < 2:
                plateau_info = {
                    'exercise_id': exercise_id,
                    'plateau_duration': f'{weeks_threshold}+ weeks',
                    'volume_trend': progression.volume_trend,
                    'weight_trend': progression.weight_trend,
                    'suggestions': [
                        'Try different rep ranges',
                        'Change exercise variation',
                        'Focus on progressive overload',
                        'Consider deload week'
                    ]
                }
                plateaued_exercises.append(plateau_info)
        
        return plateaued_exercises
    
    def get_strength_standards_comparison(self, user_id: str, exercise_id: str,
                                        user_weight: float) -> Dict[str, Any]:
        """
        Compare user performance to strength standards
        
        Args:
            user_id: User identifier
            exercise_id: Exercise to compare
            user_weight: User's bodyweight
            
        Returns:
            Strength standards comparison
        """
        progression = self.get_exercise_progression(user_id, exercise_id)
        if not progression:
            return {'error': 'No progression data available'}
        
        # Simplified strength standards (would be expanded with real data)
        strength_standards = {
            'barbell_bench_press': {
                'novice': 0.75,      # multiplier of bodyweight
                'intermediate': 1.0,
                'advanced': 1.25,
                'elite': 1.5
            },
            'barbell_squat': {
                'novice': 1.0,
                'intermediate': 1.25,
                'advanced': 1.75,
                'elite': 2.0
            },
            'barbell_deadlift': {
                'novice': 1.25,
                'intermediate': 1.75,
                'advanced': 2.25,
                'elite': 2.5
            }
        }
        
        if exercise_id not in strength_standards:
            return {'error': f'No strength standards available for {exercise_id}'}
        
        standards = strength_standards[exercise_id]
        user_1rm = progression.estimated_1rm
        user_ratio = user_1rm / user_weight if user_weight > 0 else 0
        
        # Determine user's level
        current_level = 'beginner'
        for level, ratio in standards.items():
            if user_ratio >= ratio:
                current_level = level
        
        # Calculate progress to next level
        level_order = ['novice', 'intermediate', 'advanced', 'elite']
        current_index = level_order.index(current_level) if current_level in level_order else -1
        
        next_level = None
        progress_to_next = 0
        
        if current_index >= 0 and current_index < len(level_order) - 1:
            next_level = level_order[current_index + 1]
            next_ratio = standards[next_level]
            progress_to_next = (user_ratio / next_ratio) * 100 if next_ratio > 0 else 0
        
        return {
            'exercise_id': exercise_id,
            'user_1rm': user_1rm,
            'user_bodyweight': user_weight,
            'strength_ratio': user_ratio,
            'current_level': current_level,
            'next_level': next_level,
            'progress_to_next_level': progress_to_next,
            'standards': standards
        }
    
    def _update_user_profile(self, user_id: str, workout_data: Dict[str, Any], 
                           session_date: datetime):
        """Update user profile with workout data"""
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = {
                'total_workouts': 0,
                'first_workout': session_date.isoformat(),
                'last_workout': session_date.isoformat(),
                'focus_distribution': {},
                'equipment_used': set()
            }
        
        profile = self.user_profiles[user_id]
        profile['total_workouts'] += 1
        profile['last_workout'] = session_date.isoformat()
        
        # Track focus distribution
        focus = workout_data.get('focus', 'unknown')
        if focus not in profile['focus_distribution']:
            profile['focus_distribution'][focus] = 0
        profile['focus_distribution'][focus] += 1
        
        # Track equipment usage
        for exercise in workout_data.get('exercises', []):
            equipment = exercise.get('equipment', [])
            if isinstance(equipment, list):
                profile['equipment_used'].update(equipment)
            elif equipment:
                profile['equipment_used'].add(equipment)
        
        # Convert set to list for JSON serialization
        profile['equipment_used'] = list(profile['equipment_used'])
    
    def _load_data(self):
        """Load progression data from storage"""
        # Implementation would load from file/database
        # For now, initialize empty
        pass
    
    def _save_data(self):
        """Save progression data to storage"""
        # Implementation would save to file/database
        # For now, just pass
        pass
