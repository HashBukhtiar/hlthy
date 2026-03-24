"""
Seed the Firestore 'exercises' collection from data/exercises.json.
Run once to populate, or re-run to update.

Usage:
  python3 ai/scripts/seed_exercises.py

Requires GOOGLE_APPLICATION_CREDENTIALS or running on GCP.
"""
import json
import os
import sys
from pathlib import Path

# Add ai directory to path for config imports
ai_dir = Path(__file__).parent.parent
sys.path.insert(0, str(ai_dir))

try:
    from config.load_env import load_env_file
    load_env_file()
except ImportError:
    pass

import firebase_admin
from firebase_admin import credentials, firestore


def seed_exercises():
    # Find exercises.json
    project_root = ai_dir.parent
    json_path = project_root / "data" / "exercises.json"

    if not json_path.exists():
        print(f"ERROR: {json_path} not found")
        sys.exit(1)

    with open(json_path, "r") as f:
        exercises = json.load(f)

    print(f"Loaded {len(exercises)} exercises from {json_path}")

    # Initialize Firebase Admin
    if not firebase_admin._apps:
        sa_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        if sa_path and os.path.exists(sa_path):
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)
        else:
            firebase_admin.initialize_app()

    db = firestore.client()
    batch = db.batch()
    count = 0

    for exercise in exercises:
        exercise_id = exercise.get("id")
        if not exercise_id:
            print(f"  SKIP: exercise missing 'id' field: {exercise.get('name', '?')}")
            continue

        ref = db.collection("exercises").document(exercise_id)
        batch.set(ref, exercise, merge=True)
        count += 1

        # Firestore batches are limited to 500 writes
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()
            print(f"  Committed {count} exercises...")

    if count % 400 != 0:
        batch.commit()

    print(f"Done! Seeded {count} exercises to Firestore 'exercises' collection.")


if __name__ == "__main__":
    seed_exercises()
