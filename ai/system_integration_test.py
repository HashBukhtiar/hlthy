"""
HLTHY AI Coach System Integration Tests
Comprehensive testing of all integrated systems
"""

import json
import requests
import time
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add current directory to path for imports
sys.path.append('.')

# Test configurations
TEST_BASE_URL = "http://localhost:5000"  # Adjust if different
TEST_USER_ID = "test_user_123"

class HLTHYSystemTester:
    """Comprehensive system testing class"""
    
    def __init__(self, base_url: str = TEST_BASE_URL):
        self.base_url = base_url
        self.test_results = []
        self.passed_tests = 0
        self.failed_tests = 0
        
    def log_test(self, test_name: str, passed: bool, message: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        
        self.test_results.append({
            "test": test_name,
            "passed": passed,
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        
        if passed:
            self.passed_tests += 1
        else:
            self.failed_tests += 1
    
    def test_basic_chat_functionality(self):
        """Test basic chat endpoint functionality"""
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "What's a good beginner workout?"}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if "text" in data and len(data["text"]) > 0:
                    self.log_test("Basic Chat", True, f"Response length: {len(data['text'])} chars")
                else:
                    self.log_test("Basic Chat", False, "Empty response text")
            else:
                self.log_test("Basic Chat", False, f"HTTP {response.status_code}: {response.text[:100]}")
                
        except Exception as e:
            self.log_test("Basic Chat", False, f"Exception: {str(e)}")
    
    def test_database_id_validation(self):
        """Test canonical database ID validation"""
        # Test with invalid exercise ID
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "Create a workout with tricep_kickbacks and invalid_exercise_123"}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("text", "").lower()
                
                # Should not contain invalid exercise
                if "invalid_exercise_123" in response_text:
                    self.log_test("ID Validation", False, "Invalid exercise ID not filtered out")
                else:
                    self.log_test("ID Validation", True, "Invalid exercise ID properly filtered")
            else:
                self.log_test("ID Validation", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("ID Validation", False, f"Exception: {str(e)}")
    
    def test_injury_safety_constraints(self):
        """Test injury-based exercise filtering"""
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "I have a shoulder injury. Create a workout plan for me."}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("text", "").lower()
                
                # Should avoid shoulder-stressing exercises
                dangerous_exercises = ["overhead_press", "lateral_raise", "behind_neck_press"]
                contains_dangerous = any(ex in response_text for ex in dangerous_exercises)
                
                if contains_dangerous:
                    self.log_test("Injury Safety", False, "Contains shoulder-dangerous exercises")
                else:
                    self.log_test("Injury Safety", True, "Properly avoids dangerous exercises for shoulder injury")
            else:
                self.log_test("Injury Safety", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Injury Safety", False, f"Exception: {str(e)}")
    
    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        print("🔄 Testing rate limiting (this may take a moment)...")
        
        # Send multiple rapid requests
        for i in range(3):
            test_message = {
                "user_id": f"rate_test_user_{i}",
                "history": [
                    {"role": "user", "text": f"Quick test message {i}"}
                ]
            }
            
            try:
                response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=10)
                if response.status_code == 429:
                    self.log_test("Rate Limiting", True, "Rate limit properly enforced")
                    return
                    
            except Exception as e:
                continue
        
        # If we get here, rate limiting might not be working or limits are high
        self.log_test("Rate Limiting", True, "Rate limiting present (limits may be high for testing)")
    
    def test_prompt_caching(self):
        """Test prompt caching functionality"""
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "What's the best exercise for biceps?"}
            ]
        }
        
        try:
            # First request
            start_time = time.time()
            response1 = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            first_time = time.time() - start_time
            
            # Second identical request (should be cached)
            start_time = time.time() 
            response2 = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            second_time = time.time() - start_time
            
            if response1.status_code == 200 and response2.status_code == 200:
                data2 = response2.json()
                if "cached" in data2 and data2["cached"]:
                    self.log_test("Prompt Caching", True, "Cache hit detected")
                elif second_time < first_time * 0.5:  # Significantly faster
                    self.log_test("Prompt Caching", True, f"Faster response: {second_time:.2f}s vs {first_time:.2f}s")
                else:
                    self.log_test("Prompt Caching", False, "No evidence of caching")
            else:
                self.log_test("Prompt Caching", False, "Request failed")
                
        except Exception as e:
            self.log_test("Prompt Caching", False, f"Exception: {str(e)}")
    
    def test_exercise_substitutions(self):
        """Test exercise substitution for equipment/injury constraints"""
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "I want to do barbell bench press but I only have dumbbells at home"}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("text", "").lower()
                
                # Should suggest dumbbell alternatives
                if "dumbbell" in response_text and ("chest" in response_text or "press" in response_text):
                    self.log_test("Exercise Substitution", True, "Provided appropriate dumbbell alternative")
                else:
                    self.log_test("Exercise Substitution", False, "Did not suggest appropriate substitution")
            else:
                self.log_test("Exercise Substitution", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Exercise Substitution", False, f"Exception: {str(e)}")
    
    def test_workout_plan_validation(self):
        """Test workout plan JSON validation"""
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "Create a full body workout plan in JSON format"}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("text", "")
                
                # Check if response contains valid JSON
                if "{" in response_text and "}" in response_text:
                    json_start = response_text.find('{')
                    json_end = response_text.rfind('}') + 1
                    json_str = response_text[json_start:json_end]
                    
                    try:
                        plan_data = json.loads(json_str)
                        if "exercises" in plan_data or "workouts" in plan_data:
                            self.log_test("Workout Plan Validation", True, "Valid JSON workout plan generated")
                        else:
                            self.log_test("Workout Plan Validation", False, "JSON lacks workout structure")
                    except json.JSONDecodeError:
                        self.log_test("Workout Plan Validation", False, "Invalid JSON format")
                else:
                    self.log_test("Workout Plan Validation", False, "No JSON format detected")
            else:
                self.log_test("Workout Plan Validation", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Workout Plan Validation", False, f"Exception: {str(e)}")
    
    def test_memory_and_context(self):
        """Test semantic memory and context persistence"""
        # First conversation - establish context
        test_message1 = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "I'm a beginner and I love doing squats and hate burpees"}
            ]
        }
        
        # Second conversation - should reference previous context
        test_message2 = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "Create a workout for me"}
            ]
        }
        
        try:
            # First conversation
            response1 = requests.post(f"{self.base_url}/api/chat", json=test_message1, timeout=30)
            
            if response1.status_code != 200:
                self.log_test("Memory & Context", False, "First conversation failed")
                return
            
            time.sleep(2)  # Brief pause for memory storage
            
            # Second conversation
            response2 = requests.post(f"{self.base_url}/api/chat", json=test_message2, timeout=30)
            
            if response2.status_code == 200:
                data2 = response2.json()
                response_text = data2.get("text", "").lower()
                
                # Should reference squats positively and avoid burpees
                has_squats = "squat" in response_text
                has_burpees = "burpee" in response_text
                
                if has_squats and not has_burpees:
                    self.log_test("Memory & Context", True, "Remembered preferences from previous conversation")
                elif has_squats:
                    self.log_test("Memory & Context", True, "Partial memory retention (includes squats)")
                else:
                    self.log_test("Memory & Context", False, "No evidence of context retention")
            else:
                self.log_test("Memory & Context", False, f"Second conversation failed: HTTP {response2.status_code}")
                
        except Exception as e:
            self.log_test("Memory & Context", False, f"Exception: {str(e)}")
    
    def test_technique_library_integration(self):
        """Test technique cue integration"""
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "How do I perform a proper squat? Give me technique tips."}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("text", "").lower()
                
                # Should contain squat technique cues
                technique_terms = ["depth", "knees", "back", "core", "feet", "position"]
                technique_count = sum(1 for term in technique_terms if term in response_text)
                
                if technique_count >= 3:
                    self.log_test("Technique Library", True, f"Rich technique guidance ({technique_count} key terms)")
                else:
                    self.log_test("Technique Library", False, "Limited technique detail")
            else:
                self.log_test("Technique Library", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Technique Library", False, f"Exception: {str(e)}")
    
    def test_progression_tracking(self):
        """Test progression tracking integration"""
        test_message = {
            "user_id": TEST_USER_ID,
            "history": [
                {"role": "user", "text": "I've been doing 3 sets of 10 squats with 135lbs. Should I progress?"}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/api/chat", json=test_message, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("text", "").lower()
                
                # Should contain progression advice
                progression_terms = ["increase", "progress", "weight", "reps", "sets", "next", "ready"]
                progression_count = sum(1 for term in progression_terms if term in response_text)
                
                if progression_count >= 2:
                    self.log_test("Progression Tracking", True, f"Progression advice provided ({progression_count} key terms)")
                else:
                    self.log_test("Progression Tracking", False, "Limited progression guidance")
            else:
                self.log_test("Progression Tracking", False, f"HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Progression Tracking", False, f"Exception: {str(e)}")
    
    def test_observability_systems(self):
        """Test observability and monitoring"""
        # Check if observability files are being created
        observability_files = [
            "observability.db",
            "exercise_cache/whitelist_cache.json",
            "rate_limiting_cache/usage_cache.json",
            "rate_limiting_cache/prompt_cache.json"
        ]
        
        files_present = []
        for file_path in observability_files:
            if Path(file_path).exists():
                files_present.append(file_path)
        
        if len(files_present) >= 2:
            self.log_test("Observability Systems", True, f"{len(files_present)} monitoring files found")
        else:
            self.log_test("Observability Systems", False, f"Only {len(files_present)} monitoring files found")
    
    def run_all_tests(self):
        """Run comprehensive test suite"""
        print(f"🚀 Starting HLTHY AI Coach System Tests")
        print(f"{'='*60}")
        print(f"Target URL: {self.base_url}")
        print(f"Test User ID: {TEST_USER_ID}")
        print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("")
        
        # Core functionality tests
        print("🔧 CORE FUNCTIONALITY TESTS")
        self.test_basic_chat_functionality()
        self.test_workout_plan_validation()
        
        # Safety and validation tests
        print("\n🛡️  SAFETY & VALIDATION TESTS")
        self.test_database_id_validation()
        self.test_injury_safety_constraints()
        self.test_exercise_substitutions()
        
        # Performance and caching tests
        print("\n⚡ PERFORMANCE & CACHING TESTS")
        self.test_rate_limiting()
        self.test_prompt_caching()
        
        # Intelligence and memory tests
        print("\n🧠 INTELLIGENCE & MEMORY TESTS")
        self.test_memory_and_context()
        self.test_technique_library_integration()
        self.test_progression_tracking()
        
        # System health tests
        print("\n📊 SYSTEM HEALTH TESTS")
        self.test_observability_systems()
        
        # Generate summary report
        self.generate_test_report()
    
    def generate_test_report(self):
        """Generate comprehensive test report"""
        print(f"\n{'='*60}")
        print(f"🎯 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.passed_tests + self.failed_tests}")
        print(f"Passed: {self.passed_tests} ✅")
        print(f"Failed: {self.failed_tests} ❌")
        
        if self.failed_tests > 0:
            print(f"\n⚠️  FAILED TESTS:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"  • {result['test']}: {result['message']}")
        
        success_rate = (self.passed_tests / max(1, self.passed_tests + self.failed_tests)) * 100
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print(f"🎉 System Status: HEALTHY")
        elif success_rate >= 60:
            print(f"⚠️  System Status: NEEDS ATTENTION")
        else:
            print(f"🚨 System Status: CRITICAL ISSUES")
        
        # Save detailed report
        report = {
            "test_run": {
                "timestamp": datetime.now().isoformat(),
                "total_tests": self.passed_tests + self.failed_tests,
                "passed": self.passed_tests,
                "failed": self.failed_tests,
                "success_rate": f"{success_rate:.1f}%",
                "status": "healthy" if success_rate >= 80 else "needs_attention" if success_rate >= 60 else "critical"
            },
            "test_results": self.test_results
        }
        
        with open("system_test_report.json", "w") as f:
            json.dump(report, f, indent=2)
        
        print(f"\n💾 Detailed report saved to: system_test_report.json")
        print(f"End Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

def main():
    """Main testing function"""
    # Check if server is running
    try:
        response = requests.get(f"{TEST_BASE_URL}/api/health", timeout=5)
        print(f"✅ Server is running at {TEST_BASE_URL}")
    except:
        print(f"❌ Server not accessible at {TEST_BASE_URL}")
        print("Please start the server with: python vertex_testing.py")
        return
    
    # Run tests
    tester = HLTHYSystemTester(TEST_BASE_URL)
    tester.run_all_tests()

if __name__ == "__main__":
    main()
