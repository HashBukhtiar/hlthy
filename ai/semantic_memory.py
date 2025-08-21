"""
Semantic Memory Retrieval System for HLTHY Coach
Provides long-term memory through semantic search of conversations, workouts, and milestones
"""

import json
import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
from pathlib import Path
import pickle

# For embeddings - using sentence transformers for semantic similarity
try:
    from sentence_transformers import SentenceTransformer
    import faiss
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    print("Warning: sentence-transformers not available. Install with: pip install sentence-transformers faiss-cpu")
    EMBEDDINGS_AVAILABLE = False

class MemorySnippet:
    """Individual memory snippet for semantic search"""
    def __init__(self, 
                 snippet_id: str,
                 source: str,  # "chat", "workout", "milestone", "progress"
                 date: str,
                 text: str,
                 user_id: str,
                 metadata: Dict[str, Any] = None):
        self.snippet_id = snippet_id
        self.source = source
        self.date = date
        self.text = text
        self.user_id = user_id
        self.metadata = metadata or {}
        self.embedding = None  # Will be computed when indexed

class SemanticMemorySystem:
    """Semantic search system for user memory retrieval"""
    
    def __init__(self, memory_dir: str = "memory_data"):
        self.memory_dir = Path(memory_dir)
        self.memory_dir.mkdir(exist_ok=True)
        
        # Initialize embedding model if available
        if EMBEDDINGS_AVAILABLE:
            try:
                self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')  # Fast, good quality
                self.embedding_dimension = 384
                self.embeddings_enabled = True
            except Exception as e:
                print(f"Warning: Could not load embedding model: {e}")
                self.embeddings_enabled = False
        else:
            self.embeddings_enabled = False
        
        # Memory storage
        self.snippets: Dict[str, List[MemorySnippet]] = {}  # user_id -> snippets
        self.user_indexes: Dict[str, Any] = {}  # user_id -> FAISS index
        
        # Load existing memory
        self._load_memory_data()
    
    def _get_user_memory_path(self, user_id: str) -> Path:
        """Get path for user's memory file"""
        return self.memory_dir / f"memory_{user_id}.json"
    
    def _get_user_index_path(self, user_id: str) -> Path:
        """Get path for user's FAISS index"""
        return self.memory_dir / f"index_{user_id}.faiss"
    
    def _load_memory_data(self):
        """Load existing memory data from disk"""
        for memory_file in self.memory_dir.glob("memory_*.json"):
            try:
                user_id = memory_file.stem.replace("memory_", "")
                with open(memory_file, 'r') as f:
                    data = json.load(f)
                
                snippets = []
                for item in data:
                    snippet = MemorySnippet(
                        snippet_id=item['snippet_id'],
                        source=item['source'],
                        date=item['date'],
                        text=item['text'],
                        user_id=item['user_id'],
                        metadata=item.get('metadata', {})
                    )
                    snippets.append(snippet)
                
                self.snippets[user_id] = snippets
                
                # Load FAISS index if it exists and embeddings are enabled
                if self.embeddings_enabled:
                    index_path = self._get_user_index_path(user_id)
                    if index_path.exists():
                        try:
                            self.user_indexes[user_id] = faiss.read_index(str(index_path))
                        except Exception as e:
                            print(f"Warning: Could not load FAISS index for {user_id}: {e}")
                
            except Exception as e:
                print(f"Warning: Could not load memory file {memory_file}: {e}")
    
    def _save_user_memory(self, user_id: str):
        """Save user's memory snippets to disk"""
        if user_id not in self.snippets:
            return
        
        memory_path = self._get_user_memory_path(user_id)
        
        # Convert snippets to serializable format
        data = []
        for snippet in self.snippets[user_id]:
            data.append({
                'snippet_id': snippet.snippet_id,
                'source': snippet.source,
                'date': snippet.date,
                'text': snippet.text,
                'user_id': snippet.user_id,
                'metadata': snippet.metadata
            })
        
        with open(memory_path, 'w') as f:
            json.dump(data, f, indent=2)
        
        # Save FAISS index if embeddings are enabled
        if self.embeddings_enabled and user_id in self.user_indexes:
            index_path = self._get_user_index_path(user_id)
            try:
                faiss.write_index(self.user_indexes[user_id], str(index_path))
            except Exception as e:
                print(f"Warning: Could not save FAISS index for {user_id}: {e}")
    
    def add_chat_snippet(self, user_id: str, message_text: str, role: str = "user"):
        """Add a chat message to semantic memory"""
        snippet_id = f"chat_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Only store meaningful messages (filter out very short or generic ones)
        if len(message_text.strip()) < 10:
            return
        
        snippet = MemorySnippet(
            snippet_id=snippet_id,
            source="chat",
            date=datetime.now().isoformat(),
            text=message_text,
            user_id=user_id,
            metadata={"role": role}
        )
        
        self._add_snippet(snippet)
    
    def add_workout_snippet(self, user_id: str, workout_data: Dict[str, Any]):
        """Add workout data to semantic memory"""
        snippet_id = f"workout_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Format workout data as searchable text
        workout_text = self._format_workout_for_search(workout_data)
        
        snippet = MemorySnippet(
            snippet_id=snippet_id,
            source="workout",
            date=workout_data.get('date', datetime.now().isoformat()),
            text=workout_text,
            user_id=user_id,
            metadata={"workout_id": workout_data.get('workout_id'), "exercises": workout_data.get('exercises', [])}
        )
        
        self._add_snippet(snippet)
    
    def add_milestone_snippet(self, user_id: str, milestone_text: str, milestone_type: str = "progress"):
        """Add milestone or progress note to semantic memory"""
        snippet_id = f"milestone_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        snippet = MemorySnippet(
            snippet_id=snippet_id,
            source="milestone",
            date=datetime.now().isoformat(),
            text=milestone_text,
            user_id=user_id,
            metadata={"type": milestone_type}
        )
        
        self._add_snippet(snippet)
    
    def _format_workout_for_search(self, workout_data: Dict[str, Any]) -> str:
        """Format workout data as searchable text"""
        parts = []
        
        # Add workout type/focus
        if 'dayType' in workout_data:
            parts.append(f"Workout focus: {workout_data['dayType']}")
        
        # Add exercises with sets/reps/load
        for segment in workout_data.get('segments', []):
            segment_name = segment.get('name', 'Exercise')
            parts.append(f"{segment_name} segment:")
            
            for exercise in segment.get('exercises', []):
                exercise_name = exercise.get('exerciseName', 'Unknown')
                sets = exercise.get('sets', '')
                reps = exercise.get('reps', '')
                load = exercise.get('load', '')
                
                exercise_text = f"{exercise_name}"
                if sets and reps:
                    exercise_text += f" {sets}x{reps}"
                if load:
                    exercise_text += f" @ {load}"
                
                parts.append(exercise_text)
        
        return " | ".join(parts)
    
    def _add_snippet(self, snippet: MemorySnippet):
        """Add snippet to memory and update index"""
        user_id = snippet.user_id
        
        # Initialize user's memory if needed
        if user_id not in self.snippets:
            self.snippets[user_id] = []
        
        # Add snippet
        self.snippets[user_id].append(snippet)
        
        # Compute embedding and update index if enabled
        if self.embeddings_enabled:
            try:
                embedding = self.embedding_model.encode([snippet.text])[0]
                snippet.embedding = embedding
                
                # Initialize or update FAISS index
                if user_id not in self.user_indexes:
                    self.user_indexes[user_id] = faiss.IndexFlatIP(self.embedding_dimension)
                
                # Add to index
                self.user_indexes[user_id].add(np.array([embedding], dtype=np.float32))
                
            except Exception as e:
                print(f"Warning: Could not compute embedding for snippet: {e}")
        
        # Keep only recent snippets (last 100 per user to avoid memory bloat)
        if len(self.snippets[user_id]) > 100:
            self.snippets[user_id] = self.snippets[user_id][-100:]
            
            # Rebuild index with remaining snippets
            if self.embeddings_enabled and user_id in self.user_indexes:
                self._rebuild_user_index(user_id)
        
        # Save to disk
        self._save_user_memory(user_id)
    
    def _rebuild_user_index(self, user_id: str):
        """Rebuild FAISS index for user"""
        if not self.embeddings_enabled or user_id not in self.snippets:
            return
        
        try:
            snippets = self.snippets[user_id]
            embeddings = []
            
            for snippet in snippets:
                if snippet.embedding is None:
                    embedding = self.embedding_model.encode([snippet.text])[0]
                    snippet.embedding = embedding
                embeddings.append(snippet.embedding)
            
            if embeddings:
                self.user_indexes[user_id] = faiss.IndexFlatIP(self.embedding_dimension)
                embeddings_array = np.array(embeddings, dtype=np.float32)
                self.user_indexes[user_id].add(embeddings_array)
                
        except Exception as e:
            print(f"Warning: Could not rebuild index for {user_id}: {e}")
    
    def retrieve_relevant_snippets(self, user_id: str, query: str, k: int = 3) -> List[Dict[str, str]]:
        """Retrieve top-K most relevant snippets for a query"""
        if user_id not in self.snippets:
            return []
        
        user_snippets = self.snippets[user_id]
        if not user_snippets:
            return []
        
        if self.embeddings_enabled and user_id in self.user_indexes:
            # Use semantic search with embeddings
            try:
                query_embedding = self.embedding_model.encode([query])
                
                # Search for similar snippets
                scores, indices = self.user_indexes[user_id].search(
                    query_embedding.astype(np.float32), 
                    min(k, len(user_snippets))
                )
                
                # Get top snippets with scores above threshold
                relevant_snippets = []
                for score, idx in zip(scores[0], indices[0]):
                    if score > 0.3:  # Similarity threshold
                        snippet = user_snippets[idx]
                        relevant_snippets.append({
                            "source": snippet.source,
                            "date": snippet.date[:10],  # Just date, not full timestamp
                            "text": snippet.text[:200] + "..." if len(snippet.text) > 200 else snippet.text
                        })
                
                return relevant_snippets[:k]
                
            except Exception as e:
                print(f"Warning: Semantic search failed: {e}")
        
        # Fallback: simple keyword matching
        return self._keyword_search(user_snippets, query, k)
    
    def _keyword_search(self, snippets: List[MemorySnippet], query: str, k: int) -> List[Dict[str, str]]:
        """Fallback keyword-based search when embeddings unavailable"""
        query_words = set(query.lower().split())
        
        # Score snippets by keyword overlap
        scored_snippets = []
        for snippet in snippets:
            snippet_words = set(snippet.text.lower().split())
            overlap = len(query_words.intersection(snippet_words))
            
            if overlap > 0:
                scored_snippets.append((overlap, snippet))
        
        # Sort by score and return top-k
        scored_snippets.sort(key=lambda x: x[0], reverse=True)
        
        relevant_snippets = []
        for score, snippet in scored_snippets[:k]:
            relevant_snippets.append({
                "source": snippet.source,
                "date": snippet.date[:10],
                "text": snippet.text[:200] + "..." if len(snippet.text) > 200 else snippet.text
            })
        
        return relevant_snippets
    
    def get_recent_context(self, user_id: str, days: int = 7) -> List[Dict[str, str]]:
        """Get recent context from the last N days"""
        if user_id not in self.snippets:
            return []
        
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_snippets = []
        
        for snippet in self.snippets[user_id]:
            try:
                snippet_date = datetime.fromisoformat(snippet.date.replace('Z', '+00:00'))
                if snippet_date >= cutoff_date:
                    recent_snippets.append({
                        "source": snippet.source,
                        "date": snippet.date[:10],
                        "text": snippet.text[:150] + "..." if len(snippet.text) > 150 else snippet.text
                    })
            except Exception:
                continue
        
        # Sort by date (most recent first) and return top 5
        recent_snippets.sort(key=lambda x: x["date"], reverse=True)
        return recent_snippets[:5]
    
    def cleanup_old_data(self, user_id: str, days_to_keep: int = 90):
        """Remove old memory data beyond retention period"""
        if user_id not in self.snippets:
            return
        
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        
        # Filter snippets to keep only recent ones
        kept_snippets = []
        for snippet in self.snippets[user_id]:
            try:
                snippet_date = datetime.fromisoformat(snippet.date.replace('Z', '+00:00'))
                if snippet_date >= cutoff_date:
                    kept_snippets.append(snippet)
            except Exception:
                # Keep snippet if date parsing fails (safer approach)
                kept_snippets.append(snippet)
        
        if len(kept_snippets) != len(self.snippets[user_id]):
            self.snippets[user_id] = kept_snippets
            
            # Rebuild index and save
            if self.embeddings_enabled:
                self._rebuild_user_index(user_id)
            
            self._save_user_memory(user_id)
            print(f"Cleaned up old memory data for user {user_id}")

# Global memory system instance
memory_system = SemanticMemorySystem()
