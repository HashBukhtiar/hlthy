#!/usr/bin/env python3
"""Test semantic memory system with and without ML models"""

import sys
sys.path.append('.')

print("🧠 SEMANTIC MEMORY SYSTEM ANALYSIS")
print("=" * 50)

# Test what happens without sentence-transformers
print("\n1. Testing import behavior:")
try:
    from sentence_transformers import SentenceTransformer
    print("   ✅ sentence-transformers: AVAILABLE")
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    print("   ❌ sentence-transformers: NOT AVAILABLE")
    EMBEDDINGS_AVAILABLE = False

try:
    import faiss
    print("   ✅ FAISS: AVAILABLE")
    FAISS_AVAILABLE = True
except ImportError:
    print("   ❌ FAISS: NOT AVAILABLE") 
    FAISS_AVAILABLE = False

# Import the semantic memory system
from utils.semantic_memory import SemanticMemorySystem

print("\n2. Creating SemanticMemorySystem instance:")
memory_system = SemanticMemorySystem()
print(f"   • Embeddings enabled: {memory_system.embeddings_enabled}")
print(f"   • FAISS available: {FAISS_AVAILABLE}")

print("\n3. Testing memory functionality:")

# Add some test data
user_id = "test_user"
print(f"   • Adding chat snippet...")
memory_system.add_chat_snippet(user_id, "I want to work on my chest and triceps today")

print(f"   • Adding workout snippet...")
workout_data = {
    "dayType": "chest_triceps",
    "segments": [
        {
            "name": "Main",
            "exercises": [
                {"exerciseId": "barbell_bench_press", "exerciseName": "Bench Press", "sets": "4", "reps": "8-10"},
                {"exerciseId": "incline_dumbbell_press", "exerciseName": "Incline Press", "sets": "3", "reps": "10-12"}
            ]
        }
    ]
}
memory_system.add_workout_snippet(user_id, workout_data)

print(f"   • Adding milestone...")
memory_system.add_milestone_snippet(user_id, "Hit new PR on bench press - 225lbs!")

print("\n4. Testing retrieval with different queries:")

queries = [
    "chest workout",
    "bench press progress", 
    "triceps exercises",
    "personal record"
]

for query in queries:
    results = memory_system.retrieve_relevant_snippets(user_id, query, k=2)
    print(f"\n   Query: '{query}'")
    print(f"   Results: {len(results)} found")
    for i, result in enumerate(results, 1):
        print(f"     {i}. [{result['source']}] {result['text'][:60]}...")
        if 'similarity_score' in result:
            print(f"        Similarity: {result['similarity_score']:.3f}")

print(f"\n5. Testing recent context:")
recent = memory_system.get_recent_context(user_id, days=7)
print(f"   Recent snippets: {len(recent)} found")
for snippet in recent:
    print(f"   • [{snippet['source']}] {snippet['text'][:50]}...")

print(f"\n6. Memory system analysis:")
print(f"   • Total snippets for user: {len(memory_system.snippets.get(user_id, []))}")
print(f"   • Storage method: {'FAISS index' if FAISS_AVAILABLE and memory_system.embeddings_enabled else 'Keyword matching fallback'}")
print(f"   • Semantic similarity: {'Yes' if memory_system.embeddings_enabled else 'No (keyword-based only)'}")
