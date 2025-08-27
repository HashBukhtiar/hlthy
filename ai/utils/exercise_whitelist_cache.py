"""
Precomputed Exercise Whitelists
Caches allowed exercises per user context at login and invalidates on profile changes
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, List, Set, Tuple
from pathlib import Path

# Try to import exercise database with fallback
try:
    from core.exercise_database import get_all_allowed_exercises, CANONICAL_EXERCISES
    CANONICAL_DATABASE_AVAILABLE = True
except ImportError:
    try:
        from exercise_database import get_all_allowed_exercises, CANONICAL_EXERCISES
        CANONICAL_DATABASE_AVAILABLE = True
    except ImportError:
        print("Warning: Exercise database not available for whitelist cache")
        CANONICAL_DATABASE_AVAILABLE = False
        CANONICAL_EXERCISES = {}
        def get_all_allowed_exercises(user_context):
            return []

class ExerciseWhitelistCache:
    """Manages cached exercise whitelists per user context"""
    
    def __init__(self, cache_dir: str = "exercise_cache", cache_ttl_hours: int = 24):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.cache_ttl_hours = cache_ttl_hours
        self.cache = {}  # In-memory cache
        self.cache_file = self.cache_dir / "whitelist_cache.json"
        self._load_cache()
    
    def _load_cache(self):
        """Load cache from disk"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    data = json.load(f)
                    self.cache = data
                    self._cleanup_expired()
            except Exception as e:
                print(f"Error loading exercise cache: {e}")
                self.cache = {}
    
    def _save_cache(self):
        """Save cache to disk"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            print(f"Error saving exercise cache: {e}")
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        cutoff_time = datetime.now() - timedelta(hours=self.cache_ttl_hours)
        
        expired_keys = []
        for key, entry in self.cache.items():
            try:
                entry_time = datetime.fromisoformat(entry["timestamp"])
                if entry_time < cutoff_time:
                    expired_keys.append(key)
            except:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            print(f"🗑️  Cleaned up {len(expired_keys)} expired whitelist entries")
    
    def _get_context_hash(self, user_context: Dict[str, any]) -> str:
        """Create hash for user context"""
        # Create deterministic hash from user context
        context_str = json.dumps({
            "experience_level": user_context.get("experience_level", "beginner"),
            "active_injuries": sorted(user_context.get("active_injuries", [])),
            "equipment_available": sorted(user_context.get("equipment_available", []))
        }, sort_keys=True)
        
        return hashlib.sha256(context_str.encode()).hexdigest()[:16]
    
    def get_cached_whitelist(self, user_context: Dict[str, any]) -> List[str]:
        """Get cached exercise whitelist for user context"""
        self._cleanup_expired()
        
        context_hash = self._get_context_hash(user_context)
        if context_hash in self.cache:
            entry = self.cache[context_hash]
            entry["hits"] = entry.get("hits", 0) + 1
            entry["last_accessed"] = datetime.now().isoformat()
            print(f"📋 Whitelist cache hit for context {context_hash[:8]} (hits: {entry['hits']})")
            return entry["exercise_ids"]
        
        return None
    
    def cache_whitelist(self, user_context: Dict[str, any], exercise_ids: List[str]):
        """Cache exercise whitelist for user context"""
        context_hash = self._get_context_hash(user_context)
        
        # Compute additional metadata
        total_exercises = len(CANONICAL_EXERCISES)
        allowed_count = len(exercise_ids)
        risk_distribution = self._analyze_risk_distribution(exercise_ids)
        
        self.cache[context_hash] = {
            "exercise_ids": exercise_ids,
            "user_context": user_context,
            "timestamp": datetime.now().isoformat(),
            "hits": 0,
            "last_accessed": datetime.now().isoformat(),
            "metadata": {
                "total_exercises": total_exercises,
                "allowed_count": allowed_count,
                "filter_rate": f"{((total_exercises - allowed_count) / total_exercises * 100):.1f}%",
                "risk_distribution": risk_distribution
            }
        }
        
        # Limit cache size
        if len(self.cache) > 500:
            self._evict_least_used()
        
        self._save_cache()
        print(f"💾 Cached whitelist for context {context_hash[:8]} ({allowed_count} exercises)")
    
    def _analyze_risk_distribution(self, exercise_ids: List[str]) -> Dict[str, int]:
        """Analyze risk level distribution in whitelist"""
        distribution = {"low": 0, "moderate": 0, "high": 0, "extreme": 0}
        
        for exercise_id in exercise_ids:
            if exercise_id in CANONICAL_EXERCISES:
                risk_level = CANONICAL_EXERCISES[exercise_id].risk_level.value
                distribution[risk_level] = distribution.get(risk_level, 0) + 1
        
        return distribution
    
    def _evict_least_used(self):
        """Remove least used cache entries to maintain size limit"""
        # Sort by hits (ascending) then by last accessed
        sorted_entries = sorted(
            self.cache.items(),
            key=lambda x: (x[1].get("hits", 0), x[1]["last_accessed"])
        )
        
        # Remove bottom 20%
        to_remove = len(sorted_entries) // 5
        for key, _ in sorted_entries[:to_remove]:
            del self.cache[key]
        
        print(f"🗑️  Evicted {to_remove} least used cache entries")
    
    def invalidate_user_cache(self, user_id: str = None, user_context: Dict[str, any] = None):
        """Invalidate cache entries for specific user or context"""
        if user_context:
            # Invalidate specific context
            context_hash = self._get_context_hash(user_context)
            if context_hash in self.cache:
                del self.cache[context_hash]
                self._save_cache()
                print(f"🔄 Invalidated cache for context {context_hash[:8]}")
        else:
            # Invalidate all (nuclear option for profile changes)
            old_size = len(self.cache)
            self.cache.clear()
            self._save_cache()
            print(f"🔄 Invalidated entire exercise cache ({old_size} entries)")
    
    def precompute_common_contexts(self):
        """Precompute whitelists for common user contexts"""
        common_contexts = [
            # Beginner contexts
            {"experience_level": "beginner", "active_injuries": [], "equipment_available": ["dumbbells", "bodyweight"]},
            {"experience_level": "beginner", "active_injuries": [], "equipment_available": ["gym"]},
            {"experience_level": "beginner", "active_injuries": ["knee"], "equipment_available": ["gym"]},
            {"experience_level": "beginner", "active_injuries": ["shoulder"], "equipment_available": ["gym"]},
            {"experience_level": "beginner", "active_injuries": ["lower_back"], "equipment_available": ["gym"]},
            
            # Intermediate contexts  
            {"experience_level": "intermediate", "active_injuries": [], "equipment_available": ["gym"]},
            {"experience_level": "intermediate", "active_injuries": ["shoulder"], "equipment_available": ["gym"]},
            {"experience_level": "intermediate", "active_injuries": [], "equipment_available": ["dumbbells", "barbell"]},
            
            # Advanced contexts
            {"experience_level": "advanced", "active_injuries": [], "equipment_available": ["gym"]},
            {"experience_level": "advanced", "active_injuries": [], "equipment_available": ["powerlifting"]},
        ]
        
        print(f"🔄 Precomputing whitelists for {len(common_contexts)} common contexts...")
        
        for i, context in enumerate(common_contexts):
            if not self.get_cached_whitelist(context):
                exercise_ids = get_all_allowed_exercises(context)
                self.cache_whitelist(context, exercise_ids)
            
        print(f"✅ Precomputation complete")
    
    def get_cache_stats(self) -> Dict[str, any]:
        """Get cache statistics"""
        self._cleanup_expired()
        
        total_entries = len(self.cache)
        total_hits = sum(entry.get("hits", 0) for entry in self.cache.values())
        
        # Experience level distribution
        experience_dist = {}
        injury_dist = {}
        
        for entry in self.cache.values():
            context = entry["user_context"]
            exp_level = context.get("experience_level", "unknown")
            experience_dist[exp_level] = experience_dist.get(exp_level, 0) + 1
            
            injuries = context.get("active_injuries", [])
            for injury in injuries:
                injury_dist[injury] = injury_dist.get(injury, 0) + 1
        
        return {
            "total_entries": total_entries,
            "total_hits": total_hits,
            "hit_rate": f"{(total_hits / max(1, total_entries)) * 100:.1f}%",
            "experience_distribution": experience_dist,
            "injury_distribution": injury_dist,
            "cache_ttl_hours": self.cache_ttl_hours,
            "avg_allowed_exercises": sum(len(e["exercise_ids"]) for e in self.cache.values()) / max(1, total_entries)
        }

# Global cache instance
exercise_whitelist_cache = ExerciseWhitelistCache()

def get_cached_allowed_exercises(user_context: Dict[str, any]) -> List[str]:
    """Get allowed exercises with caching - main interface function"""
    # Try cache first
    cached = exercise_whitelist_cache.get_cached_whitelist(user_context)
    if cached:
        return cached
    
    # Compute and cache
    exercise_ids = get_all_allowed_exercises(user_context)
    exercise_whitelist_cache.cache_whitelist(user_context, exercise_ids)
    
    return exercise_ids

def invalidate_user_exercise_cache(user_id: str = None, user_context: Dict[str, any] = None):
    """Invalidate user's exercise cache on profile changes"""
    exercise_whitelist_cache.invalidate_user_cache(user_id, user_context)
