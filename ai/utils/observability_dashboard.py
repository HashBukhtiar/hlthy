"""
HLTHY AI Coach Observability Dashboard
Real-time monitoring of validation violations, exercise substitutions, and system health
"""

import json
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Any
from pathlib import Path
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import hashlib

@dataclass
class ViolationEvent:
    """Violation event for tracking"""
    timestamp: str
    user_id: str
    violation_type: str
    invalid_exercise: str
    suggested_exercise: str
    context: Dict[str, Any]
    correction_successful: bool

@dataclass
class SubstitutionEvent:
    """Exercise substitution event"""
    timestamp: str
    user_id: str
    original_exercise: str
    substituted_exercise: str
    reason: str  # injury, equipment, experience
    user_context: Dict[str, Any]

@dataclass
class SystemMetric:
    """System performance metric"""
    timestamp: str
    metric_name: str
    value: float
    tags: Dict[str, str]

class ObservabilityDB:
    """SQLite database for observability data"""
    
    def __init__(self, db_path: str = "observability.db"):
        self.db_path = db_path
        self._init_db()
    
    def _init_db(self):
        """Initialize database tables"""
        conn = sqlite3.connect(self.db_path)
        try:
            # Violations table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS violations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    violation_type TEXT NOT NULL,
                    invalid_exercise TEXT NOT NULL,
                    suggested_exercise TEXT,
                    context TEXT,
                    correction_successful BOOLEAN
                )
            """)
            
            conn.execute("CREATE INDEX IF NOT EXISTS idx_violations_timestamp ON violations(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_violations_user_id ON violations(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_violations_type ON violations(violation_type)")
            
            # Substitutions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS substitutions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    original_exercise TEXT NOT NULL,
                    substituted_exercise TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    user_context TEXT
                )
            """)
            
            conn.execute("CREATE INDEX IF NOT EXISTS idx_substitutions_timestamp ON substitutions(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_substitutions_user_id ON substitutions(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_substitutions_reason ON substitutions(reason)")
            
            # System metrics table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    metric_name TEXT NOT NULL,
                    value REAL NOT NULL,
                    tags TEXT
                )
            """)
            
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON system_metrics(timestamp)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_metrics_name ON system_metrics(metric_name)")
            
            # User sessions table
            conn.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    session_start TEXT NOT NULL,
                    session_end TEXT,
                    message_count INTEGER DEFAULT 0,
                    violations_count INTEGER DEFAULT 0,
                    substitutions_count INTEGER DEFAULT 0
                )
            """)
            
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_start ON user_sessions(session_start)")
            
            conn.commit()
        finally:
            conn.close()
    
    def log_violation(self, event: ViolationEvent):
        """Log a validation violation"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("""
                INSERT INTO violations 
                (timestamp, user_id, violation_type, invalid_exercise, suggested_exercise, context, correction_successful)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event.timestamp,
                event.user_id,
                event.violation_type,
                event.invalid_exercise,
                event.suggested_exercise,
                json.dumps(event.context),
                event.correction_successful
            ))
            conn.commit()
        finally:
            conn.close()
    
    def log_substitution(self, event: SubstitutionEvent):
        """Log an exercise substitution"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("""
                INSERT INTO substitutions
                (timestamp, user_id, original_exercise, substituted_exercise, reason, user_context)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                event.timestamp,
                event.user_id,
                event.original_exercise,
                event.substituted_exercise,
                event.reason,
                json.dumps(event.user_context)
            ))
            conn.commit()
        finally:
            conn.close()
    
    def log_metric(self, metric: SystemMetric):
        """Log a system metric"""
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute("""
                INSERT INTO system_metrics
                (timestamp, metric_name, value, tags)
                VALUES (?, ?, ?, ?)
            """, (
                metric.timestamp,
                metric.metric_name,
                metric.value,
                json.dumps(metric.tags)
            ))
            conn.commit()
        finally:
            conn.close()

class ObservabilityDashboard:
    """Main dashboard class for monitoring system health"""
    
    def __init__(self):
        self.db = ObservabilityDB()
        self.cache = {}  # In-memory cache for hot data
        self.cache_ttl = 60  # seconds
    
    def log_validation_violation(self, user_id: str, violation_type: str, 
                                invalid_exercise: str, suggested_exercise: str = None,
                                context: Dict = None, correction_successful: bool = False):
        """Log a validation violation event"""
        event = ViolationEvent(
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            violation_type=violation_type,
            invalid_exercise=invalid_exercise,
            suggested_exercise=suggested_exercise or "",
            context=context or {},
            correction_successful=correction_successful
        )
        
        self.db.log_violation(event)
        print(f"🚨 Violation logged: {violation_type} for {invalid_exercise}")
    
    def log_exercise_substitution(self, user_id: str, original_exercise: str,
                                substituted_exercise: str, reason: str,
                                user_context: Dict = None):
        """Log an exercise substitution event"""
        event = SubstitutionEvent(
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            original_exercise=original_exercise,
            substituted_exercise=substituted_exercise,
            reason=reason,
            user_context=user_context or {}
        )
        
        self.db.log_substitution(event)
        print(f"🔄 Substitution logged: {original_exercise} → {substituted_exercise} ({reason})")
    
    def log_system_metric(self, metric_name: str, value: float, tags: Dict[str, str] = None):
        """Log a system performance metric"""
        metric = SystemMetric(
            timestamp=datetime.now().isoformat(),
            metric_name=metric_name,
            value=value,
            tags=tags or {}
        )
        
        self.db.log_metric(metric)
    
    def get_violation_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get violation summary for the last N hours"""
        cache_key = f"violations_{hours}"
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]["data"]
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        conn = sqlite3.connect(self.db.db_path)
        try:
            # Total violations
            total_violations = conn.execute(
                "SELECT COUNT(*) FROM violations WHERE timestamp > ?", (since,)
            ).fetchone()[0]
            
            # By violation type
            by_type = dict(conn.execute("""
                SELECT violation_type, COUNT(*) FROM violations 
                WHERE timestamp > ? GROUP BY violation_type
            """, (since,)).fetchall())
            
            # Most violated exercises
            most_violated = dict(conn.execute("""
                SELECT invalid_exercise, COUNT(*) FROM violations 
                WHERE timestamp > ? GROUP BY invalid_exercise 
                ORDER BY COUNT(*) DESC LIMIT 10
            """, (since,)).fetchall())
            
            # Correction success rate
            correction_stats = conn.execute("""
                SELECT 
                    COUNT(CASE WHEN correction_successful THEN 1 END) as successful,
                    COUNT(*) as total
                FROM violations WHERE timestamp > ?
            """, (since,)).fetchone()
            
            success_rate = (correction_stats[0] / max(1, correction_stats[1])) * 100
            
            summary = {
                "total_violations": total_violations,
                "by_type": by_type,
                "most_violated_exercises": most_violated,
                "correction_success_rate": f"{success_rate:.1f}%",
                "time_window_hours": hours
            }
            
            self._cache_data(cache_key, summary)
            return summary
            
        finally:
            conn.close()
    
    def get_substitution_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get substitution summary for the last N hours"""
        cache_key = f"substitutions_{hours}"
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]["data"]
        
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        conn = sqlite3.connect(self.db.db_path)
        try:
            # Total substitutions
            total_subs = conn.execute(
                "SELECT COUNT(*) FROM substitutions WHERE timestamp > ?", (since,)
            ).fetchone()[0]
            
            # By reason
            by_reason = dict(conn.execute("""
                SELECT reason, COUNT(*) FROM substitutions 
                WHERE timestamp > ? GROUP BY reason
            """, (since,)).fetchall())
            
            # Most substituted exercises
            most_subbed = dict(conn.execute("""
                SELECT original_exercise, COUNT(*) FROM substitutions 
                WHERE timestamp > ? GROUP BY original_exercise 
                ORDER BY COUNT(*) DESC LIMIT 10
            """, (since,)).fetchall())
            
            # Popular substitute exercises
            popular_subs = dict(conn.execute("""
                SELECT substituted_exercise, COUNT(*) FROM substitutions 
                WHERE timestamp > ? GROUP BY substituted_exercise 
                ORDER BY COUNT(*) DESC LIMIT 10
            """, (since,)).fetchall())
            
            summary = {
                "total_substitutions": total_subs,
                "by_reason": by_reason,
                "most_substituted_exercises": most_subbed,
                "popular_substitutes": popular_subs,
                "time_window_hours": hours
            }
            
            self._cache_data(cache_key, summary)
            return summary
            
        finally:
            conn.close()
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get current system health metrics"""
        cache_key = "system_health"
        if self._is_cache_valid(cache_key):
            return self.cache[cache_key]["data"]
        
        conn = sqlite3.connect(self.db.db_path)
        try:
            # Recent metrics (last 5 minutes)
            recent = (datetime.now() - timedelta(minutes=5)).isoformat()
            
            metrics = {}
            for metric_name, value in conn.execute("""
                SELECT metric_name, AVG(value) FROM system_metrics 
                WHERE timestamp > ? GROUP BY metric_name
            """, (recent,)).fetchall():
                metrics[metric_name] = value
            
            # Database size
            db_size = Path(self.db.db_path).stat().st_size / (1024 * 1024)  # MB
            
            # Recent activity (last hour)
            hour_ago = (datetime.now() - timedelta(hours=1)).isoformat()
            recent_violations = conn.execute(
                "SELECT COUNT(*) FROM violations WHERE timestamp > ?", (hour_ago,)
            ).fetchone()[0]
            
            recent_substitutions = conn.execute(
                "SELECT COUNT(*) FROM substitutions WHERE timestamp > ?", (hour_ago,)
            ).fetchone()[0]
            
            health = {
                "database_size_mb": round(db_size, 2),
                "recent_violations_per_hour": recent_violations,
                "recent_substitutions_per_hour": recent_substitutions,
                "system_metrics": metrics,
                "status": "healthy" if recent_violations < 100 else "attention_needed"
            }
            
            self._cache_data(cache_key, health)
            return health
            
        finally:
            conn.close()
    
    def get_user_analytics(self, hours: int = 168) -> Dict[str, Any]:  # 1 week default
        """Get user behavior analytics"""
        since = (datetime.now() - timedelta(hours=hours)).isoformat()
        
        conn = sqlite3.connect(self.db.db_path)
        try:
            # Top violating users
            top_violators = dict(conn.execute("""
                SELECT user_id, COUNT(*) FROM violations 
                WHERE timestamp > ? GROUP BY user_id 
                ORDER BY COUNT(*) DESC LIMIT 10
            """, (since,)).fetchall())
            
            # Users needing most substitutions
            top_substituters = dict(conn.execute("""
                SELECT user_id, COUNT(*) FROM substitutions 
                WHERE timestamp > ? GROUP BY user_id 
                ORDER BY COUNT(*) DESC LIMIT 10
            """, (since,)).fetchall())
            
            # Unique active users
            unique_users = conn.execute("""
                SELECT COUNT(DISTINCT user_id) FROM (
                    SELECT user_id FROM violations WHERE timestamp > ?
                    UNION
                    SELECT user_id FROM substitutions WHERE timestamp > ?
                )
            """, (since, since)).fetchone()[0]
            
            return {
                "unique_active_users": unique_users,
                "top_violating_users": top_violators,
                "top_substituting_users": top_substituters,
                "time_window_hours": hours
            }
            
        finally:
            conn.close()
    
    def _is_cache_valid(self, key: str) -> bool:
        """Check if cache entry is still valid"""
        if key not in self.cache:
            return False
        
        cache_time = datetime.fromisoformat(self.cache[key]["timestamp"])
        return (datetime.now() - cache_time).seconds < self.cache_ttl
    
    def _cache_data(self, key: str, data: Any):
        """Cache data with timestamp"""
        self.cache[key] = {
            "data": data,
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_dashboard_report(self, output_file: str = "dashboard_report.json"):
        """Generate comprehensive dashboard report"""
        print("📊 Generating observability dashboard report...")
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "system_health": self.get_system_health(),
            "violations_24h": self.get_violation_summary(24),
            "violations_7d": self.get_violation_summary(168),
            "substitutions_24h": self.get_substitution_summary(24),
            "substitutions_7d": self.get_substitution_summary(168),
            "user_analytics_7d": self.get_user_analytics(168)
        }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"💾 Dashboard report saved to: {output_file}")
        return report
    
    def print_dashboard_summary(self):
        """Print human-readable dashboard summary"""
        health = self.get_system_health()
        violations = self.get_violation_summary(24)
        substitutions = self.get_substitution_summary(24)
        
        print(f"\n🎯 HLTHY AI COACH DASHBOARD")
        print(f"{'='*50}")
        print(f"System Status: {health['status'].upper()}")
        print(f"Database Size: {health['database_size_mb']} MB")
        
        print(f"\n🚨 VIOLATIONS (24h)")
        print(f"Total: {violations['total_violations']}")
        print(f"Success Rate: {violations['correction_success_rate']}")
        if violations['by_type']:
            print("By Type:")
            for vtype, count in violations['by_type'].items():
                print(f"  • {vtype}: {count}")
        
        print(f"\n🔄 SUBSTITUTIONS (24h)")
        print(f"Total: {substitutions['total_substitutions']}")
        if substitutions['by_reason']:
            print("By Reason:")
            for reason, count in substitutions['by_reason'].items():
                print(f"  • {reason}: {count}")
        
        if violations['most_violated_exercises']:
            print(f"\n⚠️  MOST VIOLATED EXERCISES:")
            for exercise, count in list(violations['most_violated_exercises'].items())[:3]:
                print(f"  • {exercise}: {count} violations")
        
        if substitutions['most_substituted_exercises']:
            print(f"\n🔀 MOST SUBSTITUTED EXERCISES:")
            for exercise, count in list(substitutions['most_substituted_exercises'].items())[:3]:
                print(f"  • {exercise}: {count} substitutions")
        
        print(f"\n✅ Dashboard updated")

# Global dashboard instance
dashboard = ObservabilityDashboard()

def log_violation(user_id: str, violation_type: str, invalid_exercise: str, 
                 suggested_exercise: str = None, context: Dict = None, 
                 correction_successful: bool = False):
    """Global function to log violations"""
    dashboard.log_validation_violation(
        user_id, violation_type, invalid_exercise, 
        suggested_exercise, context, correction_successful
    )

def log_substitution(user_id: str, original_exercise: str, substituted_exercise: str,
                    reason: str, user_context: Dict = None):
    """Global function to log substitutions"""
    dashboard.log_exercise_substitution(
        user_id, original_exercise, substituted_exercise, reason, user_context
    )

def log_metric(metric_name: str, value: float, tags: Dict[str, str] = None):
    """Global function to log system metrics"""
    dashboard.log_system_metric(metric_name, value, tags)

if __name__ == "__main__":
    dashboard.print_dashboard_summary()
    dashboard.generate_dashboard_report()
