"""
Weekly training summary using Gemini.
Generates a weekly insight from the user's training data over the past 7 days.
"""
import asyncio
import logging

from vertexai.generative_models import GenerativeModel, GenerationConfig

from core.config import MODEL_ID
from core.prompt_builder import _format_client_file
from core.text_utils import sanitize, parse_gemini_json
from models.schemas import UserContext, WorkoutAnalysis

logger = logging.getLogger(__name__)

GEMINI_TIMEOUT_SECONDS = 25

_WEEKLY_PROMPT_TEMPLATE = """You are Coach — a personal fitness trainer reviewing a client's training week.

{client_file}

WEEKLY TRAINING SUMMARY (last 7 days):
- Workouts completed: {workout_count}
- Total training time: {total_minutes} minutes
- Total volume: {total_volume:,.0f} lbs
- PRs hit this week: {total_prs}
- Training days: {training_days}
{streak_line}

Workout breakdown:
{workout_breakdown}

INSTRUCTIONS:
Analyze this training week and respond with ONLY valid JSON (no markdown, no code fences):
{{
  "insight": "3-4 sentence weekly review. Reference their goals, consistency, volume trends, and any patterns you notice. Be encouraging but honest about areas to improve.",
  "highlights": ["Up to 3 highlights from the week — PRs, consistency streaks, volume milestones"],
  "recommendations": ["Up to 2 recommendations for next week — recovery, programming adjustments, focus areas"],
  "sentiment": "positive|neutral|needs_attention"
}}

Rules:
- If they hit their weekly training frequency goal, celebrate it
- If they missed sessions, note it constructively (not judgmentally)
- Reference specific exercises and trends from their performance data
- If volume or intensity is trending up/down, note the pattern
- Compare to their stated goals and archetype
- Keep it conversational — like a real coach doing a weekly check-in
- Do NOT give generic advice — make it specific to THIS week and THIS client"""


async def analyze_week(
    uid: str,
    user_context: UserContext,
) -> WorkoutAnalysis:
    """
    Generate a weekly training summary using Gemini.
    Filters recent_workouts to only include the last 7 days.
    """
    from datetime import datetime, timedelta
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).strftime("%Y-%m-%d")
    workouts = [w for w in user_context.recent_workouts if w.date >= seven_days_ago]

    # Compute weekly aggregates
    workout_count = len(workouts)
    total_minutes = sum(w.duration_minutes for w in workouts)
    total_volume = sum(w.total_volume for w in workouts)
    total_prs = sum(w.prs_hit for w in workouts)
    training_days = ", ".join(sanitize(w.date, 10) for w in workouts) if workouts else "None"

    # Build workout breakdown
    breakdown_lines = []
    for w in workouts:
        exercises_str = ", ".join(sanitize(e, 50) for e in w.exercises[:4])
        if len(w.exercises) > 4:
            exercises_str += f" +{len(w.exercises) - 4} more"
        pr_str = f", {w.prs_hit} PRs" if w.prs_hit > 0 else ""
        mood_str = f", felt {sanitize(w.mood or '', 20)}" if w.mood else ""
        breakdown_lines.append(
            f"  - {sanitize(w.date, 10)}: {sanitize(w.name)} "
            f"({w.duration_minutes}min, {w.total_volume:,.0f}lbs{pr_str}{mood_str}) "
            f"— {exercises_str}"
        )

    prompt = _WEEKLY_PROMPT_TEMPLATE.format(
        client_file=_format_client_file(user_context),
        workout_count=workout_count,
        total_minutes=total_minutes,
        total_volume=total_volume,
        total_prs=total_prs,
        training_days=training_days,
        streak_line=f"- Current streak: {user_context.workout_streak} workouts" if user_context.workout_streak > 0 else "",
        workout_breakdown="\n".join(breakdown_lines) if breakdown_lines else "  (no workouts this week)",
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

        data = parse_gemini_json(result.text)

        sentiment = data.get("sentiment", "positive")
        if sentiment not in ("positive", "neutral", "needs_attention"):
            sentiment = "positive"

        return WorkoutAnalysis(
            insight=data.get("insight", "Great training week!")[:500],
            highlights=[h[:200] for h in data.get("highlights", [])[:3]],
            recommendations=[r[:200] for r in data.get("recommendations", [])[:2]],
            sentiment=sentiment,
        )

    except Exception as e:
        logger.error(f"Weekly analysis failed for {uid[:8]}: {type(e).__name__}")
        return WorkoutAnalysis(
            insight=f"You completed {workout_count} workout{'s' if workout_count != 1 else ''} this week"
                    f"{f', hitting {total_prs} PRs' if total_prs > 0 else ''}. "
                    f"Total volume: {total_volume:,.0f} lbs across {total_minutes} minutes of training.",
            highlights=[f"{workout_count} workouts completed"],
            recommendations=[],
            sentiment="positive",
        )
