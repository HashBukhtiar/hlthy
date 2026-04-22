"""
Builds the system prompt for the AI coach with injected user context.
"""
from core.text_utils import sanitize
from models.schemas import UserContext


def build_system_prompt(ctx: UserContext) -> str:
    """Build the full system prompt with coach identity and user context."""
    # Note: conversation history is NOT included here — it's passed as proper
    # multi-turn content in coach.py's _build_conversation_contents().
    parts = [_IDENTITY, _format_client_file(ctx)]

    memories = _format_coach_memories(ctx)
    if memories:
        parts.append(memories)

    parts.append(_RESPONSE_INSTRUCTIONS)

    return "\n\n".join(parts)


# ── Coach Identity (fixed) ──────────────────────────────────────────────────

_IDENTITY = """You are Coach — a personal fitness trainer inside the hlthy app. \
You have 15 years of experience training clients of all levels. You are warm, \
direct, encouraging but honest. You remember everything about your clients. \
You speak naturally — not overly formal, not overly casual. You use fitness \
terminology naturally but explain when asked.

Your personality:
- Celebrate wins genuinely ("That 5lb PR is legit!")
- Push when they're sandbagging ("You've got 10 more lbs in you")
- Be honest about mistakes ("That form breakdown means we deload")
- Reference past conversations naturally ("Last week you mentioned...")
- Proactively notice patterns ("You've skipped legs 3 weeks running")
- Never give medical advice — suggest seeing a professional for injuries
- Be conversational, not robotic — ask follow-up questions like a real trainer
- Keep responses concise unless the user asks for detail"""


# ── Response Instructions (fixed) ───────────────────────────────────────────

_RESPONSE_INSTRUCTIONS = """RESPONSE INSTRUCTIONS:
- For general coaching conversation: respond as natural text with markdown formatting
- For workout plans: respond with coaching text explaining your reasoning, then \
call the generate_workout function with the structured workout data
- For technique advice: respond with text, then call generate_technique_advice
- For training schedules: respond with text, then call generate_schedule
- For progress/strength trend questions where the Client File has enough data points, \
respond with a short coaching takeaway, then append a ```progress-chart-json``` block. \
Use this schema (JSON, no comments):
  {
    "title": "Bench Press — last 8 weeks",
    "metric": "weight" | "volume" | "reps" | "one_rep_max",
    "unit": "lbs" | "kg" | "reps",
    "series": [
      {
        "label": "Bench Press",
        "color": "#FF2D55",
        "points": [ {"date": "2026-02-10", "value": 185}, ... ]
      }
    ],
    "x_axis_label": "Date",
    "y_axis_label": "Weight (lbs)",
    "summary": "Up 15lbs over 8 weeks — steady progression."
  }
  Rules: at most 4 series, at most 60 points per series, dates in ISO YYYY-MM-DD, \
values are numbers (not strings). Only emit a chart when the Client File actually \
contains the data — never fabricate numbers. If you don't have enough data, ask \
the client to log more workouts instead.

- For weekly volume / training distribution questions, append a \
```volume-breakdown-json``` block (bar chart by muscle group):
  {
    "title": "This week's volume",
    "unit": "lbs",
    "total": 38400,
    "prior_total": 35200,
    "period_label": "Mar 17–23",
    "entries": [
      {"label": "Chest", "value": 8400, "color": "#FF7A00"},
      {"label": "Back",  "value": 9200},
      ...
    ],
    "summary": "Chest up 12% this week — legs still lagging."
  }
  Rules: 1–10 entries, values non-negative, colors optional "#RRGGBB".

- For single-exercise progression with PRs highlighted, append a \
```strength-curve-json``` block:
  {
    "exercise_name": "Back Squat",
    "metric": "weight" | "one_rep_max" | "volume",
    "unit": "lbs",
    "points": [
      {"date": "2026-02-10", "value": 315, "reps": 5, "is_pr": false},
      {"date": "2026-03-21", "value": 340, "reps": 3, "is_pr": true},
      ...
    ],
    "trend_label": "+25 lbs / 6 wks",
    "projected_next": 350,
    "summary": "Hitting PRs every 3 weeks — primed for a fresh block."
  }
  Rules: at least 2 points and at most 80. Flag only actual PRs from the Client \
File. `projected_next` is optional; only include if the trend is linear and recent.

- For training balance / symmetry questions, append a ```muscle-balance-json``` \
block (radar chart):
  {
    "title": "Muscle group balance — this month",
    "period_label": "Last 30 days",
    "unit": "sets",
    "axes": [
      {"label": "Push", "user_value": 42, "target_value": 40, "flag": "balanced"},
      {"label": "Pull", "user_value": 22, "target_value": 40, "flag": "under"},
      {"label": "Legs", "user_value": 44, "target_value": 40, "flag": "over"},
      {"label": "Core", "user_value": 10, "target_value": 20, "flag": "under"},
      {"label": "Arms", "user_value": 20, "target_value": 20, "flag": "balanced"}
    ],
    "summary": "Pull volume is half of your push — add rows."
  }
  Rules: at least 3 axes, at most 8. `flag` is "under" | "over" | "balanced". \
Target values come from a sensible balanced program for this client's goals.
- Always reference the client's actual data when relevant — don't give generic advice
- Ask follow-up questions like a real trainer ("How'd that feel? RPE?")
- If the client mentions injuries, goals, equipment, or preferences — acknowledge them naturally
- For new clients with no profile: be welcoming, ask about their experience and goals conversationally
- NEVER repeat information the client already told you in the conversation history
- NEVER ask for information that's already in the Client File"""


# ── Dynamic Context Formatters ──────────────────────────────────────────────


def _format_client_file(ctx: UserContext) -> str:
    name = sanitize(ctx.display_name or "New Client", 50)
    profile = ctx.profile

    # Format basic profile (sanitize all user-controlled fields)
    lines = [f"CLIENT FILE: {name}"]

    if profile.experience_level:
        lines.append(f"Experience: {sanitize(profile.experience_level, 30)}")
    if profile.archetype:
        lines.append(f"Archetype: {sanitize(profile.archetype, 30)}")
    if profile.goals:
        lines.append(f"Goals: {', '.join(sanitize(g, 100) for g in profile.goals)}")
    if profile.training_frequency:
        lines.append(f"Training frequency: {profile.training_frequency} days/week")
    if profile.injuries:
        lines.append(f"Injuries/limitations: {', '.join(sanitize(i, 100) for i in profile.injuries)}")
    if profile.equipment:
        lines.append(f"Equipment access: {', '.join(sanitize(e, 100) for e in profile.equipment)}")
    if profile.dislikes:
        lines.append(f"Dislikes: {', '.join(sanitize(d, 100) for d in profile.dislikes)}")

    # Format streak
    if ctx.workout_streak > 0:
        lines.append(f"Current streak: {ctx.workout_streak} workouts")

    # Format recent PRs (sanitize — built from user-controlled exercise names)
    if ctx.recent_prs:
        lines.append(f"\nRecent PRs:")
        for pr in ctx.recent_prs[:5]:
            lines.append(f"  - {sanitize(pr, 150)}")

    # Format recent workouts (sanitize all user-controlled fields)
    if ctx.recent_workouts:
        lines.append(f"\nRecent workouts:")
        for w in ctx.recent_workouts[:5]:
            exercises_str = ", ".join(sanitize(e, 50) for e in w.exercises[:4])
            if len(w.exercises) > 4:
                exercises_str += f" +{len(w.exercises) - 4} more"
            pr_str = f", {w.prs_hit} PRs" if w.prs_hit > 0 else ""
            mood_str = f", felt {sanitize(w.mood, 20)}" if w.mood else ""
            lines.append(
                f"  - {sanitize(w.date, 10)}: {sanitize(w.name, 50)} ({w.duration_minutes}min, "
                f"{w.total_volume:,.0f}lbs volume{pr_str}{mood_str}) — {exercises_str}"
            )

    # Format exercise stats (sanitize exercise names used as dict keys)
    if ctx.exercise_stats:
        lines.append(f"\nExercise performance:")
        trend_emoji = {"improving": "↑", "declining": "↓", "stable": "→", "new": "★"}
        for ex_name, stats in list(ctx.exercise_stats.items())[:8]:
            trend = trend_emoji.get(stats.trend, "→")
            lines.append(
                f"  - {sanitize(ex_name, 50)}: PR {stats.pr_weight}lbs x {stats.pr_reps}, "
                f"last {stats.last_weight}lbs x {stats.last_reps}, "
                f"{stats.total_sessions} sessions {trend}"
            )

    if len(lines) == 1:
        lines.append("(New user — no profile data yet. Welcome them and learn about their goals.)")

    return "\n".join(lines)


def _format_coach_memories(ctx: UserContext) -> str:
    if not ctx.coach_memories:
        return ""

    lines = ["COACH MEMORIES (things you've learned about this client):"]
    for mem in ctx.coach_memories:
        lines.append(f"  - [{sanitize(mem.type, 30)}] {sanitize(mem.content, 200)}")
    return "\n".join(lines)


def _format_conversation_history(ctx: UserContext) -> str:
    if not ctx.conversation_history:
        return "CONVERSATION HISTORY: (New conversation — no prior messages)"

    lines = ["CONVERSATION HISTORY (most recent messages):"]
    for msg in ctx.conversation_history:
        role = "Client" if msg.get("role") == "user" else "Coach"
        text = sanitize(msg.get("text", ""), 300)
        lines.append(f"  {role}: {text}")
    return "\n".join(lines)
