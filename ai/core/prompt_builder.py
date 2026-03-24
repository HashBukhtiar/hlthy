"""
Builds the system prompt for the AI coach with injected user context.
"""
from models.schemas import UserContext


def build_system_prompt(ctx: UserContext) -> str:
    """Build the full system prompt with coach identity and user context."""
    return f"""{_IDENTITY}

{_format_client_file(ctx)}

{_format_coach_memories(ctx)}

{_format_conversation_history(ctx)}

{_RESPONSE_INSTRUCTIONS}"""


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
- Always reference the client's actual data when relevant — don't give generic advice
- Ask follow-up questions like a real trainer ("How'd that feel? RPE?")
- If the client mentions injuries, goals, equipment, or preferences — acknowledge them naturally
- For new clients with no profile: be welcoming, ask about their experience and goals conversationally
- NEVER repeat information the client already told you in the conversation history
- NEVER ask for information that's already in the Client File"""


# ── Dynamic Context Formatters ──────────────────────────────────────────────


def _format_client_file(ctx: UserContext) -> str:
    name = ctx.display_name or "New Client"
    profile = ctx.profile

    # Format basic profile
    lines = [f"CLIENT FILE: {name}"]

    if profile.experience_level:
        lines.append(f"Experience: {profile.experience_level}")
    if profile.archetype:
        lines.append(f"Archetype: {profile.archetype}")
    if profile.goals:
        lines.append(f"Goals: {', '.join(profile.goals)}")
    if profile.training_frequency:
        lines.append(f"Training frequency: {profile.training_frequency} days/week")
    if profile.injuries:
        lines.append(f"Injuries/limitations: {', '.join(profile.injuries)}")
    if profile.equipment:
        lines.append(f"Equipment access: {', '.join(profile.equipment)}")
    if profile.dislikes:
        lines.append(f"Dislikes: {', '.join(profile.dislikes)}")

    # Format streak
    if ctx.workout_streak > 0:
        lines.append(f"Current streak: {ctx.workout_streak} workouts")

    # Format recent PRs
    if ctx.recent_prs:
        lines.append(f"\nRecent PRs:")
        for pr in ctx.recent_prs[:5]:
            lines.append(f"  - {pr}")

    # Format recent workouts
    if ctx.recent_workouts:
        lines.append(f"\nRecent workouts:")
        for w in ctx.recent_workouts[:5]:
            exercises_str = ", ".join(w.exercises[:4])
            if len(w.exercises) > 4:
                exercises_str += f" +{len(w.exercises) - 4} more"
            pr_str = f", {w.prs_hit} PRs" if w.prs_hit > 0 else ""
            mood_str = f", felt {w.mood}" if w.mood else ""
            lines.append(
                f"  - {w.date}: {w.name} ({w.duration_minutes}min, "
                f"{w.total_volume:,.0f}lbs volume{pr_str}{mood_str}) — {exercises_str}"
            )

    # Format exercise stats (top performers)
    if ctx.exercise_stats:
        lines.append(f"\nExercise performance:")
        trend_emoji = {"improving": "↑", "declining": "↓", "stable": "→", "new": "★"}
        for name, stats in list(ctx.exercise_stats.items())[:8]:
            trend = trend_emoji.get(stats.trend, "→")
            lines.append(
                f"  - {name}: PR {stats.pr_weight}lbs x {stats.pr_reps}, "
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
        lines.append(f"  - [{mem.type}] {mem.content}")
    return "\n".join(lines)


def _format_conversation_history(ctx: UserContext) -> str:
    if not ctx.conversation_history:
        return "CONVERSATION HISTORY: (New conversation — no prior messages)"

    lines = ["CONVERSATION HISTORY (most recent messages):"]
    for msg in ctx.conversation_history:
        role = "Client" if msg.get("role") == "user" else "Coach"
        text = msg.get("text", "")
        # Truncate long messages in history
        if len(text) > 300:
            text = text[:300] + "..."
        lines.append(f"  {role}: {text}")
    return "\n".join(lines)
