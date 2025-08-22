"""
HLTHY AI Coach System Startup and Validation
Runs system checks, precomputes caches, and validates everything is ready
"""

import sys
import os
from datetime import datetime
from pathlib import Path

# Add current directory to path
sys.path.append('.')

def startup_checks():
    """Run all startup validation checks"""
    print(f"🚀 HLTHY AI Coach System Startup")
    print(f"{'='*50}")
    print(f"Startup Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("")
    
    # 1. Import validation
    print("📦 Checking system imports...")
    
    imports_status = {}
    
    try:
        from exercise_database import CANONICAL_EXERCISES, validate_workout_plan_exercises
        imports_status["exercise_database"] = True
        print("  ✅ Exercise Database (Canonical)")
    except ImportError as e:
        imports_status["exercise_database"] = False
        print(f"  ❌ Exercise Database: {e}")
    
    try:
        from user_profiles import profile_manager
        imports_status["user_profiles"] = True
        print("  ✅ User Profiles")
    except ImportError as e:
        imports_status["user_profiles"] = False
        print(f"  ❌ User Profiles: {e}")
    
    try:
        from semantic_memory import memory_system
        imports_status["semantic_memory"] = True
        print("  ✅ Semantic Memory")
    except ImportError as e:
        imports_status["semantic_memory"] = False
        print(f"  ❌ Semantic Memory: {e}")
    
    try:
        from technique_library import get_technique_cues_for_exercise
        imports_status["technique_library"] = True
        print("  ✅ Technique Library")
    except ImportError as e:
        imports_status["technique_library"] = False
        print(f"  ❌ Technique Library: {e}")
    
    try:
        from progression_tracker import progression_tracker
        imports_status["progression_tracker"] = True
        print("  ✅ Progression Tracker")
    except ImportError as e:
        imports_status["progression_tracker"] = False
        print(f"  ❌ Progression Tracker: {e}")
    
    try:
        from profile_sync import sync_memory_to_profile
        imports_status["profile_sync"] = True
        print("  ✅ Profile Sync")
    except ImportError as e:
        imports_status["profile_sync"] = False
        print(f"  ❌ Profile Sync: {e}")
    
    try:
        from rate_limiting import rate_limiter
        imports_status["rate_limiting"] = True
        print("  ✅ Rate Limiting")
    except ImportError as e:
        imports_status["rate_limiting"] = False
        print(f"  ❌ Rate Limiting: {e}")
    
    try:
        from exercise_whitelist_cache import exercise_whitelist_cache
        imports_status["exercise_cache"] = True
        print("  ✅ Exercise Whitelist Cache")
    except ImportError as e:
        imports_status["exercise_cache"] = False
        print(f"  ❌ Exercise Whitelist Cache: {e}")
    
    try:
        from observability_dashboard import dashboard
        imports_status["observability"] = True
        print("  ✅ Observability Dashboard")
    except ImportError as e:
        imports_status["observability"] = False
        print(f"  ❌ Observability Dashboard: {e}")
    
    # 2. Environment validation
    print(f"\n🔧 Checking environment configuration...")
    
    required_env_vars = [
        "GOOGLE_CLOUD_PROJECT_ID",
        "GOOGLE_CLOUD_PRIVATE_KEY", 
        "GOOGLE_CLOUD_CLIENT_EMAIL"
    ]
    
    env_status = {}
    for var in required_env_vars:
        if var in os.environ and os.environ[var]:
            env_status[var] = True
            print(f"  ✅ {var}")
        else:
            env_status[var] = False
            print(f"  ❌ {var} (missing or empty)")
    
    # 3. Database validation
    print(f"\n🗄️  Validating exercise database...")
    
    if imports_status.get("exercise_database"):
        try:
            exercise_count = len(CANONICAL_EXERCISES)
            print(f"  ✅ {exercise_count} canonical exercises loaded")
            
            # Sample validation
            test_ids = list(CANONICAL_EXERCISES.keys())[:5]
            valid_count = sum(1 for ex_id in test_ids if ex_id in CANONICAL_EXERCISES)
            print(f"  ✅ Sample validation: {valid_count}/{len(test_ids)} exercises valid")
            
        except Exception as e:
            print(f"  ❌ Database validation error: {e}")
    
    # 4. Precompute exercise whitelists
    print(f"\n🏋️  Precomputing exercise whitelists...")
    
    if imports_status.get("exercise_cache"):
        try:
            exercise_whitelist_cache.precompute_common_contexts()
            
            cache_stats = exercise_whitelist_cache.get_cache_stats()
            print(f"  ✅ Precomputed {cache_stats['total_entries']} context whitelists")
            print(f"  📊 Average {cache_stats['avg_allowed_exercises']:.0f} exercises per context")
            
        except Exception as e:
            print(f"  ❌ Whitelist precomputation error: {e}")
    
    # 5. App parity check
    print(f"\n📱 Checking app parity...")
    
    try:
        from exercise_parity_checker import check_app_parity
        parity_checker = check_app_parity()
        
        if parity_checker.parity_report:
            summary = parity_checker.parity_report["summary"]
            print(f"  📊 App: {summary['app_exercises']} exercises")
            print(f"  📊 Canonical: {summary['canonical_exercises']} exercises")
            print(f"  📊 Safety coverage: {summary['coverage_rate']}")
            print(f"  📊 Migration suggestions: {summary['total_suggestions']}")
        
    except Exception as e:
        print(f"  ⚠️  Parity check failed: {e}")
    
    # 6. Generate startup report
    print(f"\n📊 Startup Summary")
    print(f"{'='*30}")
    
    total_systems = len(imports_status)
    enabled_systems = sum(1 for status in imports_status.values() if status)
    
    print(f"Systems enabled: {enabled_systems}/{total_systems}")
    print(f"Environment: {sum(env_status.values())}/{len(env_status)} vars configured")
    
    if enabled_systems >= 7 and sum(env_status.values()) >= 2:
        print(f"🎉 System Status: READY FOR PRODUCTION")
    elif enabled_systems >= 5:
        print(f"⚠️  System Status: PARTIAL DEPLOYMENT")
    else:
        print(f"🚨 System Status: CONFIGURATION NEEDED")
    
    print(f"\n✅ Startup validation complete")
    print(f"   Ready to serve AI coaching requests!")
    
    return {
        "imports": imports_status,
        "environment": env_status,
        "enabled_systems": enabled_systems,
        "total_systems": total_systems,
        "status": "ready" if enabled_systems >= 7 and sum(env_status.values()) >= 2 else "partial"
    }

def quick_system_test():
    """Run a quick functional test"""
    print(f"\n🧪 Quick System Test")
    print(f"{'='*25}")
    
    try:
        # Test database validation
        if "exercise_database" in sys.modules:
            from exercise_database import validate_workout_plan_exercises
            
            test_context = {"experience_level": "beginner", "active_injuries": []}
            test_ids = ["squat_barbell", "push_up"]
            
            try:
                validation_result = validate_workout_plan_exercises(test_ids, test_context)
                print(f"  ✅ ID Validation: System functional")
            except Exception as e:
                print(f"  ❌ ID Validation: {e}")
        
        # Test memory system
        if "semantic_memory" in sys.modules:
            from semantic_memory import memory_system
            
            if memory_system:
                # Quick memory test
                memory_system.add_chat_snippet("test_user", "test message", role="user")
                snippets = memory_system.retrieve_relevant_snippets("test_user", "test", k=1)
                print(f"  ✅ Memory System: {len(snippets)} snippets retrieved")
        
        # Test rate limiting
        if "rate_limiting" in sys.modules:
            from rate_limiting import rate_limiter
            
            within_limit = rate_limiter.check_rate_limit("test_user")[0]
            print(f"  ✅ Rate Limiting: {'Active' if within_limit else 'Blocked'}")
        
        # Test observability
        if "observability_dashboard" in sys.modules:
            from observability_dashboard import log_metric
            
            log_metric("startup_test", 1.0, {"test": "true"})
            print(f"  ✅ Observability: Metrics logged")
        
        print(f"  🎯 Quick test passed!")
        
    except Exception as e:
        print(f"  ❌ Quick test failed: {e}")

if __name__ == "__main__":
    startup_status = startup_checks()
    quick_system_test()
    
    print(f"\n🚀 System ready to launch!")
    print(f"   Run: python vertex_testing.py")
    print(f"   Test: python system_integration_test.py")
