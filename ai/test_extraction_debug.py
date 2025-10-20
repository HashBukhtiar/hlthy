"""
Debug script to test conversational memory extraction
"""

from utils.profile_sync import ConfidenceBasedExtractor

# Create extractor
extractor = ConfidenceBasedExtractor()

# Test the exact user input
test_message = "i really hate burpees and can't stand overhead squats"

print("=" * 80)
print("TESTING CONVERSATIONAL MEMORY EXTRACTION")
print("=" * 80)
print(f"\nInput: {test_message}")
print(f"\nTesting dislike patterns...")

# Extract claims
claims = extractor.extract_with_confidence(test_message, "debug_test")

print(f"\nExtracted Claims: {len(claims)}")
for i, claim in enumerate(claims, 1):
    print(f"\nClaim {i}:")
    print(f"  ID: {claim.claim_id}")
    print(f"  Type: {claim.type}")
    print(f"  Raw Text: {claim.raw_text}")
    print(f"  Normalized Value: {claim.normalized_value}")
    print(f"  Confidence: {claim.confidence}")
    print(f"  Requires Confirmation: {claim.requires_confirmation}")
    print(f"  Question: {claim.to_confirmation_question()}")

print("\n" + "=" * 80)
print("TEST COMPLETE")
print("=" * 80)
