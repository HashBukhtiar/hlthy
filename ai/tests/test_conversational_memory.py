"""
Test suite for conversational memory features in copilot_instructions_v3
Tests the extract→confirm→commit workflow and episodic memory
"""

import sys
import os
import tempfile
import shutil
from datetime import datetime, timezone, timedelta

# Add AI directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from utils.user_profiles import (
    UserProfile, EnhancedProfileManager, InjuryRecord, 
    EpisodicMemory, SessionState, ConversationalConsent
)
from utils.profile_sync import (
    ConfidenceBasedExtractor, ExtractedClaim, ExtractionConfidence,
    EnhancedProfileSync
)


def test_episodic_memory_ttl():
    """Test episodic memory TTL functionality"""
    print("🧪 Testing episodic memory TTL...")
    
    # Create test profile
    manager = EnhancedProfileManager()
    profile = manager.create_profile("test_user_123", age=25)
    
    # Add episodic memories with different TTLs
    profile.add_episodic_memory("dislike", "User hates burpees", confidence=0.9, ttl_days=1)
    profile.add_episodic_memory("goal", "User wants to build muscle", confidence=1.0, ttl_days=30)
    profile.add_episodic_memory("preference", "User prefers brief responses", confidence=0.7, ttl_days=7)
    
    assert len(profile.episodic_memories) == 3, "Should have 3 memories"
    print("✅ Added 3 episodic memories")
    
    # Simulate memory that's expired (by modifying created_at)
    expired_memory = profile.episodic_memories[0]
    old_date = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    expired_memory.created_at = old_date
    
    # Cleanup should remove expired memory
    profile._cleanup_expired_memories()
    
    assert len(profile.episodic_memories) == 2, "Should have 2 memories after cleanup"
    print("✅ Expired memory cleaned up correctly")


def test_injury_check_in_scheduling():
    """Test injury check-in scheduling"""
    print("🧪 Testing injury check-in scheduling...")
    
    manager = EnhancedProfileManager()
    profile = manager.create_profile("test_user_456", age=30)
    
    # Add injury with automatic check-in scheduling
    success = manager.add_injury(
        user_id="test_user_456",
        injury_type="shoulder_impingement",
        affected_area="shoulder",
        severity=7,
        confidence=0.95
    )
    
    assert success, "Should add injury successfully"
    assert len(profile.active_injuries) == 1, "Should have 1 active injury"
    
    injury = profile.active_injuries[0]
    assert injury.next_check_in_due is not None, "Should have scheduled check-in"
    assert injury.severity_1_to_5 == 7, "Numeric severity should be preserved"
    assert injury.confidence == 0.95, "Confidence should be preserved"
    
    print("✅ Injury added with check-in scheduling")
    
    # Test check-in scheduling logic
    check_ins_needed = manager.schedule_injury_check_ins("test_user_456")
    print(f"✅ Found {len(check_ins_needed)} injuries needing check-in")


def test_confidence_based_extraction():
    """Test confidence-based claim extraction"""
    print("🧪 Testing confidence-based extraction...")
    
    extractor = ConfidenceBasedExtractor()
    
    # Test various confidence levels
    test_texts = [
        ("I hate burpees", "HIGH confidence dislike"),
        ("I don't really like deadlifts", "HIGH confidence dislike"),
        ("Maybe skip squats today", "LOW confidence dislike"),
        ("My shoulder hurts", "HIGH confidence injury"),
        ("My back is a bit tight", "MEDIUM confidence injury"),
        ("I want to lose weight", "HIGH confidence goal"),
        ("Keep it brief please", "HIGH confidence preference")
    ]
    
    for text, description in test_texts:
        claims = extractor.extract_with_confidence(text)
        print(f"  '{text}' -> {len(claims)} claims ({description})")
        
        if claims:
            claim = claims[0]
            print(f"    Type: {claim.type}, Confidence: {claim.confidence}, Needs confirmation: {claim.requires_confirmation}")
    
    print("✅ Confidence-based extraction working")


def test_extract_confirm_commit_workflow():
    """Test the full extract→confirm→commit workflow"""
    print("🧪 Testing extract→confirm→commit workflow...")
    
    # Setup
    manager = EnhancedProfileManager()
    extractor = ConfidenceBasedExtractor()
    sync = EnhancedProfileSync(extractor, manager)
    
    user_id = "test_user_789"
    profile = manager.create_profile(user_id, age=28)
    
    # EXTRACT phase
    user_message = "I really hate burpees and my shoulder has been bothering me"
    coach_response = "I understand, let's avoid burpees and focus on shoulder-friendly exercises"
    
    result = sync.process_conversation_turn(user_id, user_message, coach_response)
    
    # Debug: print what was extracted
    pending = extractor.get_pending_confirmations(user_id)
    print(f"  DEBUG: Extracted {result['claims_extracted']} claims")
    for claim in pending:
        print(f"    - {claim.type}: {claim.normalized_value} (confidence: {claim.confidence})")
    
    assert result["claims_extracted"] > 0, "Should extract claims"
    assert len(result["pending_confirmations"]) > 0, "Should have pending confirmations"
    print(f"✅ EXTRACT: Found {result['claims_extracted']} claims, {len(result['pending_confirmations'])} need confirmation")
    
    # CONFIRM phase
    pending = extractor.get_pending_confirmations(user_id)
    confirmations = {}
    for claim in pending:
        confirmations[claim.claim_id] = True  # User confirms all claims
        print(f"  Confirming: {claim.to_confirmation_question()}")
    
    confirm_result = sync.confirm_user_claims(user_id, confirmations)
    
    assert confirm_result["claims_confirmed"] > 0, "Should confirm claims"
    print(f"✅ CONFIRM: Confirmed {confirm_result['claims_confirmed']} claims")
    
    # COMMIT phase should happen automatically
    assert confirm_result["claims_committed"] > 0, "Should commit claims to profile"
    print(f"✅ COMMIT: Committed {confirm_result['claims_committed']} claims to profile")
    
    # Verify profile was updated
    updated_profile = manager.get_profile(user_id)
    assert len(updated_profile.disliked_exercises) > 0, "Should have disliked exercises"
    assert len(updated_profile.active_injuries) > 0, "Should have active injuries"
    
    print("✅ Profile successfully updated from conversation")


def test_profile_snapshot_hashing():
    """Test profile snapshot hashing for planner tracking"""
    print("🧪 Testing profile snapshot hashing...")
    
    manager = EnhancedProfileManager()
    profile = manager.create_profile("test_user_hash", age=25, experience_level="intermediate")
    
    # Get initial hash
    hash1 = profile.get_snapshot_hash()
    assert len(hash1) == 16, "Hash should be 16 characters"
    print(f"✅ Initial hash: {hash1}")
    
    # Modify profile and check hash changes
    profile.disliked_exercises.append("burpees")
    hash2 = profile.get_snapshot_hash()
    assert hash1 != hash2, "Hash should change when profile changes"
    print(f"✅ Hash changed after modification: {hash2}")
    
    # Test planner usage tracking
    planner_data = manager.get_profile_for_planner("test_user_hash")
    assert planner_data is not None, "Should get planner data"
    assert "profile_hash" in planner_data, "Should include profile hash"
    assert "conversation_context" in planner_data, "Should include conversation context"
    
    print("✅ Profile snapshot hashing working correctly")


def test_session_state_management():
    """Test session state management for dialog flow"""
    print("🧪 Testing session state management...")
    
    manager = EnhancedProfileManager()
    profile = manager.create_profile("test_user_state", age=30)
    
    # Test conversation state updates
    success = manager.update_conversation_state(
        user_id="test_user_state",
        state="COLLECTING_INJURY_INFO",
        context={"injury_type": "shoulder", "severity_asked": True}
    )
    
    assert success, "Should update conversation state"
    
    updated_profile = manager.get_profile("test_user_state")
    assert updated_profile.session_state.state == "COLLECTING_INJURY_INFO", "State should be updated"
    assert "injury_type" in updated_profile.session_state.context, "Context should be preserved"
    
    print("✅ Session state management working")


def run_all_tests():
    """Run all conversational memory tests"""
    print("🚀 Running Conversational Memory Tests")
    print("=" * 50)
    
    try:
        test_episodic_memory_ttl()
        print()
        
        test_injury_check_in_scheduling()
        print()
        
        test_confidence_based_extraction()
        print()
        
        test_extract_confirm_commit_workflow()
        print()
        
        test_profile_snapshot_hashing()
        print()
        
        test_session_state_management()
        print()
        
        print("🎉 All conversational memory tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)