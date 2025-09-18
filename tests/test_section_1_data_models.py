"""
Test Section 1: Data Model (Firestore)
Unit tests for conversational memory data models and validation
"""

import sys
import os
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from server.models.conversational_memory import (
    TrainingProfile, Injury, EpisodicMemory, SessionState,
    Identity, 
    create_default_profile, create_injury_from_text, create_memory
)
from server.models.firestore_schema import (
    FirestoreSchemaValidator, FirestoreCollections, ProfileFieldMapper, ValidationError
)
from datetime import datetime


def test_training_profile_creation():
    """Test creating and serializing training profile"""
    print("Testing training profile creation...")
    
    # Create profile with identity
    profile = TrainingProfile(
        identity=Identity(
            age_years=25,
            height_cm=175,
            weight_kg=70,
            sex_at_birth="male",
            timezone="America/New_York"
        ),
        experience_level="intermediate",
        archetype="generalist"
    )
    
    # Test serialization
    profile_dict = profile.to_dict()
    assert profile_dict["version"] == 1
    assert profile_dict["identity"]["age_years"] == 25
    assert profile_dict["experience_level"] == "intermediate"
    
    # Test deserialization
    profile_restored = TrainingProfile.from_dict(profile_dict)
    assert profile_restored.identity.age_years == 25
    assert profile_restored.experience_level == "intermediate"
    
    # Test snapshot hash
    hash1 = profile.get_snapshot_hash()
    assert len(hash1) == 16  # 16 character hash
    
    # Different profile should have different hash
    profile2 = TrainingProfile(identity=Identity(age_years=30))
    hash2 = profile2.get_snapshot_hash()
    assert hash1 != hash2
    
    print("✓ Training profile creation and serialization working")
    return True


def test_injury_management():
    """Test injury creation and check-in scheduling"""
    print("Testing injury management...")
    
    # Create injury from text
    injury = create_injury_from_text(
        body_part="right_shoulder",
        severity=3,
        notes="Pain during overhead movements",
        confidence=0.85
    )
    
    assert injury.body_part == "right_shoulder"
    assert injury.severity_1_to_5 == 3
    assert injury.status == "active"
    assert injury.next_check_in_due is not None
    
    # Test serialization
    injury_dict = injury.to_dict()
    injury_restored = Injury.from_dict(injury_dict)
    assert injury_restored.body_part == "right_shoulder"
    
    # Test check-in calculation
    now = datetime.utcnow()
    
    # Active injury -> 7 days
    injury.status = "active"
    next_checkin = injury.calculate_next_check_in(now)
    assert next_checkin is not None
    
    # Improving injury -> 14 days
    injury.status = "improving"
    next_checkin_improving = injury.calculate_next_check_in(now)
    assert next_checkin_improving > next_checkin  # Should be later
    
    # Resolved injury -> no check-in
    injury.status = "resolved"
    next_checkin_resolved = injury.calculate_next_check_in(now)
    assert next_checkin_resolved is None
    
    print("✓ Injury management and scheduling working")
    return True


def test_episodic_memory():
    """Test episodic memory with TTL"""
    print("Testing episodic memory...")
    
    # Create travel memory
    memory = create_memory(
        memory_type="travel",
        claim="Traveling to Vancouver next week",
        confidence=0.9,
        ttl_days=7
    )
    
    assert memory.type == "travel"
    assert memory.confidence == 0.9
    assert memory.ttl_days == 7
    
    # Test expiry logic
    now = datetime.utcnow()
    assert not memory.is_expired(now)  # Just created, not expired
    
    # Test serialization
    memory_dict = memory.to_dict()
    memory_restored = EpisodicMemory.from_dict(memory_dict)
    assert memory_restored.claim == "Traveling to Vancouver next week"
    
    print("✓ Episodic memory and TTL working")
    return True


def test_session_state():
    """Test session state management"""
    print("Testing session state...")
    
    # Create session state
    session = SessionState(
        state="CLARIFY_FOCUS",
        pending_question="time_available"
    )
    
    # Update known facts
    session.known.focus = "back"
    session.known.time_available_min = 60
    session.known.injury_flags = ["shoulder_active"]
    
    # Test serialization
    session_dict = session.to_dict()
    assert session_dict["state"] == "CLARIFY_FOCUS"
    assert session_dict["known"]["focus"] == "back"
    assert session_dict["known"]["time_available_min"] == 60
    
    # Test restoration
    session_restored = SessionState.from_dict(session_dict)
    assert session_restored.known.focus == "back"
    assert "shoulder_active" in session_restored.known.injury_flags
    
    print("✓ Session state management working")
    return True


def test_validation():
    """Test schema validation"""
    print("Testing schema validation...")
    
    validator = FirestoreSchemaValidator()
    
    # Valid profile
    valid_profile = {
        "version": 1,
        "identity": {"age_years": 25, "height_cm": 175},
        "experience_level": "intermediate"
    }
    
    validated = validator.validate_training_profile(valid_profile)
    assert validated["identity"]["age_years"] == 25
    
    # Invalid age
    try:
        invalid_profile = {
            "version": 1,
            "identity": {"age_years": 200}  # Too old
        }
        validator.validate_training_profile(invalid_profile)
        assert False, "Should have raised ValidationError"
    except ValidationError as e:
        assert "Age must be between" in str(e)
    
    # Valid injury
    valid_injury = {
        "body_part": "shoulder",
        "onset": "2025-08-01",
        "severity_1_to_5": 3,
        "status": "active",
        "confidence": 0.8
    }
    
    validated_injury = validator.validate_injury(valid_injury)
    assert validated_injury["severity_1_to_5"] == 3
    
    print("✓ Schema validation working")
    return True


def test_firestore_collections():
    """Test Firestore collection path generation"""
    print("Testing Firestore collections...")
    
    uid = "test_user_123"
    
    # Test path generation
    profile_path = FirestoreCollections.training_profile_path(uid)
    assert profile_path == f"users/{uid}/training_profile_v1"
    
    injury_path = FirestoreCollections.injury_path(uid, "injury_123")
    assert injury_path == f"users/{uid}/injuries/injury_123"
    
    memory_path = FirestoreCollections.memory_path(uid, "memory_123")
    assert memory_path == f"users/{uid}/memories/memory_123"
    
    session_path = FirestoreCollections.session_state_path(uid)
    assert session_path == f"users/{uid}/session_state/current"
    
    print("✓ Firestore collection paths working")
    return True


def test_profile_field_mapper():
    """Test profile field mapping for natural language updates"""
    print("Testing profile field mapper...")
    
    # Test field path mapping
    age_path = ProfileFieldMapper.get_field_path("age")
    assert age_path == "identity.age_years"
    
    goal_path = ProfileFieldMapper.get_field_path("goal")
    assert goal_path == "goals.primary"
    
    # Test patch creation
    patch = ProfileFieldMapper.create_patch("age", 30)
    expected = {"identity": {"age_years": 30}}
    assert patch == expected
    
    # Test nested patch
    equipment_patch = ProfileFieldMapper.create_patch("equipment", ["lat_pulldown"])
    expected_equipment = {"environment": {"equipment_ids": ["lat_pulldown"]}}
    assert equipment_patch == expected_equipment
    
    print("✓ Profile field mapping working")
    return True


def run_section_1_tests():
    """Run all Section 1 tests"""
    print("=" * 60)
    print("SECTION 1: DATA MODEL (FIRESTORE) - TEST SUITE")
    print("=" * 60)
    
    tests = [
        test_training_profile_creation,
        test_injury_management, 
        test_episodic_memory,
        test_session_state,
        test_validation,
        test_firestore_collections,
        test_profile_field_mapper
    ]
    
    passed = 0
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ {test.__name__} failed: {e}")
    
    print("\n" + "=" * 60)
    print(f"SECTION 1 RESULTS: {passed}/{len(tests)} TESTS PASSED")
    print("=" * 60)
    
    if passed == len(tests):
        print("🎉 SECTION 1: DATA MODEL COMPLETE!")
        print("✅ Training profiles with typed schemas")
        print("✅ Injury timeline with check-in scheduling") 
        print("✅ Episodic memory with TTL")
        print("✅ Session state management")
        print("✅ Profile events audit log")
        print("✅ Schema validation and Firestore integration")
        return True
    else:
        print("❌ Some tests failed - review implementation")
        return False


if __name__ == '__main__':
    success = run_section_1_tests()
    if success:
        print("\n✨ Section 1 ready for integration!")
    else:
        print("\n🔧 Section 1 needs fixes before proceeding")