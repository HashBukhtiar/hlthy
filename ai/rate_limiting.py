"""
Rate Limiting and Prompt Caching
Implements daily message caps per user and caches identical prompts
"""

import json
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from pathlib import Path

class RateLimiter:
    """Manages daily message caps per user"""
    
    def __init__(self, data_dir: str = "rate_limiting", daily_limit: int = 50):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.daily_limit = daily_limit
        self.user_usage = {}  # Cache for active usage
    
    def _get_usage_file(self, user_id: str) -> Path:
        return self.data_dir / f"{user_id}_usage.json"
    
    def _load_user_usage(self, user_id: str) -> Dict[str, any]:
        """Load user's usage data"""
        if user_id in self.user_usage:
            return self.user_usage[user_id]
        
        usage_file = self._get_usage_file(user_id)
        if usage_file.exists():
            try:
                with open(usage_file, 'r') as f:
                    usage = json.load(f)
                    self.user_usage[user_id] = usage
                    return usage
            except Exception as e:
                print(f"Error loading usage for {user_id}: {e}")
        
        # Default usage structure
        default_usage = {
            "today": datetime.now().strftime("%Y-%m-%d"),
            "count": 0,
            "total_tokens": 0,
            "history": []
        }
        self.user_usage[user_id] = default_usage
        return default_usage
    
    def _save_user_usage(self, user_id: str):
        """Save user's usage data"""
        if user_id not in self.user_usage:
            return
        
        try:
            usage_file = self._get_usage_file(user_id)
            with open(usage_file, 'w') as f:
                json.dump(self.user_usage[user_id], f, indent=2)
        except Exception as e:
            print(f"Error saving usage for {user_id}: {e}")
    
    def check_rate_limit(self, user_id: str) -> Tuple[bool, int, str]:
        """Check if user has exceeded rate limit. Returns (allowed, remaining, reset_time)"""
        usage = self._load_user_usage(user_id)
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Reset counter if it's a new day
        if usage["today"] != today:
            usage["today"] = today
            usage["count"] = 0
            usage["total_tokens"] = 0
            self._save_user_usage(user_id)
        
        allowed = usage["count"] < self.daily_limit
        remaining = max(0, self.daily_limit - usage["count"])
        
        # Calculate reset time (tomorrow at midnight)
        tomorrow = datetime.now() + timedelta(days=1)
        reset_time = tomorrow.strftime("%Y-%m-%d 00:00:00")
        
        return allowed, remaining, reset_time
    
    def record_usage(self, user_id: str, route: str, input_tokens: int = 0, output_tokens: int = 0):
        """Record API usage for user"""
        usage = self._load_user_usage(user_id)
        
        usage["count"] += 1
        usage["total_tokens"] += input_tokens + output_tokens
        
        # Add to history (keep last 10 entries)
        usage["history"].append({
            "timestamp": datetime.now().isoformat(),
            "route": route,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens
        })
        usage["history"] = usage["history"][-10:]
        
        self._save_user_usage(user_id)
    
    def get_usage_stats(self, user_id: str) -> Dict[str, any]:
        """Get usage statistics for user"""
        usage = self._load_user_usage(user_id)
        allowed, remaining, reset_time = self.check_rate_limit(user_id)
        
        return {
            "daily_limit": self.daily_limit,
            "used_today": usage["count"],
            "remaining": remaining,
            "tokens_used": usage["total_tokens"],
            "reset_time": reset_time,
            "recent_history": usage["history"][-5:]  # Last 5 requests
        }

class PromptCache:
    """Caches identical recent prompts and responses"""
    
    def __init__(self, data_dir: str = "prompt_cache", max_age_hours: int = 24):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.max_age_hours = max_age_hours
        self.cache = {}  # In-memory cache
        self.cache_file = self.data_dir / "prompt_cache.json"
        self._load_cache()
    
    def _load_cache(self):
        """Load cache from disk"""
        if self.cache_file.exists():
            try:
                with open(self.cache_file, 'r') as f:
                    self.cache = json.load(f)
                self._cleanup_expired()
            except Exception as e:
                print(f"Error loading prompt cache: {e}")
                self.cache = {}
    
    def _save_cache(self):
        """Save cache to disk"""
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(self.cache, f, indent=2)
        except Exception as e:
            print(f"Error saving prompt cache: {e}")
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        cutoff_time = datetime.now() - timedelta(hours=self.max_age_hours)
        
        expired_keys = []
        for key, entry in self.cache.items():
            try:
                entry_time = datetime.fromisoformat(entry["timestamp"])
                if entry_time < cutoff_time:
                    expired_keys.append(key)
            except:
                expired_keys.append(key)  # Remove malformed entries
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            print(f"🗑️  Cleaned up {len(expired_keys)} expired cache entries")
    
    def _hash_prompt(self, prompt: str, user_id: str = None) -> str:
        """Create hash for prompt caching"""
        # Include user_id in hash to avoid cross-user contamination
        cache_key = f"{user_id or 'anonymous'}:{prompt}"
        return hashlib.sha256(cache_key.encode()).hexdigest()[:16]
    
    def get_cached_response(self, prompt: str, user_id: str = None) -> Optional[str]:
        """Get cached response if available"""
        self._cleanup_expired()
        
        prompt_hash = self._hash_prompt(prompt, user_id)
        if prompt_hash in self.cache:
            entry = self.cache[prompt_hash]
            print(f"📋 Cache hit for user {user_id} (age: {self._get_age_str(entry['timestamp'])})")
            entry["hits"] = entry.get("hits", 0) + 1
            entry["last_accessed"] = datetime.now().isoformat()
            self._save_cache()
            return entry["response"]
        
        return None
    
    def cache_response(self, prompt: str, response: str, route: str, user_id: str = None):
        """Cache prompt-response pair"""
        prompt_hash = self._hash_prompt(prompt, user_id)
        
        self.cache[prompt_hash] = {
            "prompt_preview": prompt[:100] + "..." if len(prompt) > 100 else prompt,
            "response": response,
            "route": route,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat(),
            "hits": 0,
            "last_accessed": datetime.now().isoformat()
        }
        
        # Limit cache size (keep most recent 1000 entries)
        if len(self.cache) > 1000:
            # Remove oldest entries
            sorted_entries = sorted(self.cache.items(), 
                                  key=lambda x: x[1]["timestamp"])
            for key, _ in sorted_entries[:-1000]:
                del self.cache[key]
        
        self._save_cache()
        print(f"💾 Cached response for user {user_id}, route: {route}")
    
    def _get_age_str(self, timestamp_str: str) -> str:
        """Get human-readable age of cache entry"""
        try:
            timestamp = datetime.fromisoformat(timestamp_str)
            age = datetime.now() - timestamp
            if age.seconds < 3600:
                return f"{age.seconds // 60}m"
            else:
                return f"{age.seconds // 3600}h"
        except:
            return "unknown"
    
    def get_cache_stats(self) -> Dict[str, any]:
        """Get cache statistics"""
        self._cleanup_expired()
        
        total_entries = len(self.cache)
        total_hits = sum(entry.get("hits", 0) for entry in self.cache.values())
        
        # Route distribution
        routes = {}
        for entry in self.cache.values():
            route = entry.get("route", "unknown")
            routes[route] = routes.get(route, 0) + 1
        
        return {
            "total_entries": total_entries,
            "total_hits": total_hits,
            "hit_rate": f"{(total_hits / max(1, total_entries)) * 100:.1f}%",
            "route_distribution": routes,
            "max_age_hours": self.max_age_hours
        }

# Global instances
rate_limiter = RateLimiter(daily_limit=50)  # 50 messages per day per user
prompt_cache = PromptCache(max_age_hours=24)  # 24-hour cache
