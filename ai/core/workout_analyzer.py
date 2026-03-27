"""
Post-workout analysis using Gemini.
Generates a concise insight from a completed workout log and user context.
"""
import asyncio
import json
import logging
import re

from vertexai.generative_models import GenerativeModel, GenerationConfig

from core.config import MODEL_ID
from core.prompt_builder import _format_client_file
from models.schemas import UserContext, WorkoutAnalysis, WorkoutLogPayload

logger = logging.getLogger(__name__)

GEMINI_TIMEOUT_SECONDS = 25

_ANALYSIS_PROMPT_TEMPLATE = """You are Coach — a personal fitness trainer analyzing a client's just-completed workout.

{client_file}

THE WORKOUT THEY JUST FINISHED:
- Name: {workout_name}
- Duration: {duration_minutes} minutes
- Total Volume: {total_volume:,.0f} lbs
- Sets Completed: {total_sets}
- Reps Completed: {total_reps}
- Exercises: {exercises_completed} completed, {exercises_skipped} skipped
- PRs Hit: {prs_hit}
{mood_line}
{difficulty_line}

Exercises performed:
{exercise_details}

INSTRUCTIONS:
Analyze this workout and respond with ONLY valid JSON (no markdown, no code fences):
{{
  "insight": "2-3 sentence personalized analysis. Reference their actual numbers, trends, and goals. Be encouraging but honest.",
  "highlights": ["Up to 3 short highlight bullets about what went well or is noteworthy"],
  "recommendations": ["Up to 2 actionable coaching tips for their next session"],
  "sentiment": "positive|neutral|needs_attention"
}}

Rules:
- Reference their actual exercise performance data and trends when available
- If they hit PRs, celebrate them specifically
- If volume or intensity is declining, note it constructively
- Keep the insight conversational — like a real coach giving quick post-workout feedback
- Do NOT give generic advice — make it specific to THIS workout and THIS client"""


def _sanitize(text: str, max_len: int = 100) -> str:
    """Strip newlines and limit length to prevent prompt injection."""
    return re.sub(r"[\n\r]+", " ", text)[:max_len]


async def analyze_workout(
    uid: str,
    workout_data: WorkoutLogPayload,
    user_context: UserContext,
) -> WorkoutAnalysis:
    """
    Generate a post-workout analysis using Gemini.
    Returns a structured WorkoutAnalysis with insight, highlights, recommendations.
    """
    # Build exercise detail lines with sanitized names
    exercise_lines = []
    for ex in workout_data.exercises:
        name = _sanitize(ex.exerciseName)
        if ex.skipped:
            exercise_lines.append(f"  - {name} (skipped)")
            continue
        completed_sets = [s for s in ex.sets if s.get("completed")]
        if completed_sets:
            best = max(completed_sets, key=lambda s: s.get("weight", 0) * s.get("reps", 0))
            pr_flag = " [PR!]" if any(s.get("isPR") for s in completed_sets) else ""
            exercise_lines.append(
                f"  - {name}: "
                f"{len(completed_sets)} sets, best set {best.get('weight', 0)}lbs x {best.get('reps', 0)}{pr_flag}"
            )

    mood = _sanitize(workout_data.mood or "", 20) if workout_data.mood else None
    difficulty = workout_data.perceivedDifficulty

    prompt = _ANALYSIS_PROMPT_TEMPLATE.format(
        client_file=_format_client_file(user_context),
        workout_name=_sanitize(workout_data.workoutName),
        duration_minutes=workout_data.durationMinutes,
        total_volume=workout_data.totalVolume,
        total_sets=workout_data.totalSets,
        total_reps=workout_data.totalReps,
        exercises_completed=workout_data.exercisesCompleted,
        exercises_skipped=workout_data.exercisesSkipped,
        prs_hit=workout_data.prsHit,
        mood_line=f"- Mood: {mood}" if mood else "",
        difficulty_line=f"- Perceived Difficulty: {difficulty}/10" if difficulty else "",
        exercise_details="\n".join(exercise_lines) if exercise_lines else "  (no exercise details)",
    )

    try:
        model = GenerativeModel(MODEL_ID)
        result = await asyncio.wait_for(
            model.generate_content_async(
                prompt,
                generation_config=GenerationConfig(
                    temperature=0.4,
                    max_output_tokens=512,
                    response_mime_type="application/json",
                ),
            ),
            timeout=GEMINI_TIMEOUT_SECONDS,
        )

        text = result.text.strip()
        # Clean markdown fences if present
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text.rsplit("```", 1)[0]
        text = text.strip()

        data = json.loads(text)

        # Validate sentiment against allowed values
        sentiment = data.get("sentiment", "positive")
        if sentiment not in ("positive", "neutral", "needs_attention"):
            sentiment = "positive"

        return WorkoutAnalysis(
            insight=data.get("insight", "Great workout!")[:500],
            highlights=[h[:200] for h in data.get("highlights", [])[:3]],
            recommendations=[r[:200] for r in data.get("recommendations", [])[:2]],
            sentiment=sentiment,
        )

    except Exception as e:
        logger.error(f"Workout analysis failed for {uid[:8]}: {type(e).__name__}")
        # Return a generic fallback — never fail the entire flow
        prs = workout_data.prsHit
        volume = workout_data.totalVolume
        pr_text = f" and hit {prs} PR{'s' if prs > 1 else ''}" if prs > 0 else ""
        return WorkoutAnalysis(
            insight=f"Nice work finishing {_sanitize(workout_data.workoutName)}! "
                    f"You moved {volume:,.0f} lbs total{pr_text}.",
            highlights=["Workout completed"],
            recommendations=[],
            sentiment="positive",
        )
