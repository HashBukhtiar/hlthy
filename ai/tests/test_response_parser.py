"""
Tests for core/response_parser.py — parse_streamed_text, extract_function_call_data,
and extract_memory_updates.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.response_parser import (
    parse_streamed_text,
    extract_function_call_data,
    extract_memory_updates,
)


class TestParseStreamedText:
    def test_no_structured_block_returns_unchanged(self):
        text = "Just a plain coaching response."
        clean, structured = parse_streamed_text(text)
        assert structured is None
        assert clean == text

    def test_workout_json_block_extracted(self):
        text = (
            "Here's your plan!\n\n"
            "```workout-json\n"
            '{"name": "Push Day", "exercises": []}\n'
            "```\n\n"
            "Let me know if you need changes."
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "workout_plan"
        assert structured["data"]["name"] == "Push Day"
        assert "workout-json" not in clean
        assert "Here's your plan" in clean
        assert "Let me know" in clean

    def test_schedule_json_block_extracted(self):
        text = (
            "Your weekly schedule:\n\n"
            "```schedule-json\n"
            '{"days": ["Monday", "Wednesday", "Friday"]}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "schedule_plan"
        assert structured["data"]["days"][0] == "Monday"

    def test_technique_json_block_extracted(self):
        text = (
            "Here's technique advice:\n\n"
            "```technique-json\n"
            '{"exercise": "Squat", "cues": ["chest up", "knees out"]}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "technique_advice"
        assert structured["data"]["exercise"] == "Squat"

    def test_generic_json_block_uses_type_from_content(self):
        text = (
            "Here:\n\n"
            "```json\n"
            '{"type": "explanation", "content": "Here is why..."}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "explanation"

    def test_generic_json_block_no_type_field_uses_unknown(self):
        text = (
            "```json\n"
            '{"foo": "bar"}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "unknown"

    def test_malformed_json_returns_none(self):
        text = (
            "```workout-json\n"
            "{this is not valid json}\n"
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is None

    def test_all_malformed_patterns_fall_through_to_none(self):
        text = (
            "```workout-json\n"
            "{bad}\n"
            "```\n"
            "```schedule-json\n"
            "{also bad}\n"
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is None

    def test_clean_text_stripped(self):
        text = "  \n\n```workout-json\n{\"name\": \"x\"}\n```\n\n  "
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        # After removing the block and stripping, clean should be empty or whitespace-free
        assert clean == "" or clean.strip() == ""

    def test_first_matching_pattern_wins(self):
        # workout-json and json both present — workout-json pattern matches first
        text = (
            "```workout-json\n"
            '{"name": "First"}\n'
            "```\n"
            "```json\n"
            '{"name": "Second"}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "workout_plan"
        assert structured["data"]["name"] == "First"

    def test_empty_string_input(self):
        clean, structured = parse_streamed_text("")
        assert structured is None
        assert clean == ""

    def test_progress_chart_valid_payload(self):
        text = (
            "You're up 15lbs in 4 weeks — solid.\n\n"
            "```progress-chart-json\n"
            '{"title": "Bench — 4 weeks", "metric": "weight", "unit": "lbs", '
            '"series": [{"label": "Bench", "points": ['
            '{"date": "2026-03-25", "value": 185}, '
            '{"date": "2026-04-01", "value": 190}, '
            '{"date": "2026-04-08", "value": 195}, '
            '{"date": "2026-04-15", "value": 200}]}]}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert structured["type"] == "progress_chart"
        assert structured["data"]["title"] == "Bench — 4 weeks"
        assert len(structured["data"]["series"]) == 1
        assert len(structured["data"]["series"][0]["points"]) == 4
        assert "progress-chart-json" not in clean
        assert "You're up 15lbs" in clean

    def test_progress_chart_invalid_payload_is_dropped(self):
        # Missing required "series" field — schema should reject it.
        text = (
            "Here's your chart:\n\n"
            "```progress-chart-json\n"
            '{"title": "Bench", "metric": "weight", "unit": "lbs"}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is None
        # Surrounding text is preserved when validation drops the block
        assert "Here's your chart" in clean

    def test_progress_chart_points_over_cap_are_trimmed(self):
        points = ",".join(
            f'{{"date": "2026-01-{str(d).zfill(2)}", "value": {d}}}' for d in range(1, 91)
        )
        text = (
            "```progress-chart-json\n"
            '{"title": "Vol", "metric": "volume", "unit": "lbs", '
            f'"series": [{{"label": "All", "points": [{points}]}}]}}\n'
            "```"
        )
        clean, structured = parse_streamed_text(text)
        assert structured is not None
        assert len(structured["data"]["series"][0]["points"]) == 60


class TestExtractFunctionCallData:
    def _make_part(self, fn_name: str, args: dict):
        """Create a mock function call part."""
        class FunctionCall:
            def __init__(self, name, args):
                self.name = name
                self.args = args

        class Part:
            def __init__(self, fn_name, args):
                self.function_call = FunctionCall(fn_name, args)

        return Part(fn_name, args)

    def _make_text_part(self, text: str):
        """Create a mock text-only part (no function_call attribute)."""
        class TextPart:
            pass
        p = TextPart()
        # No function_call attribute
        return p

    def test_generate_workout_maps_to_workout_plan(self):
        part = self._make_part("generate_workout", {"name": "Push Day", "sets": 3})
        result = extract_function_call_data([part])
        assert result is not None
        assert result["type"] == "workout_plan"
        assert result["data"]["name"] == "Push Day"

    def test_generate_technique_advice_maps_correctly(self):
        part = self._make_part("generate_technique_advice", {"exercise": "Deadlift"})
        result = extract_function_call_data([part])
        assert result is not None
        assert result["type"] == "technique_advice"

    def test_generate_schedule_maps_correctly(self):
        part = self._make_part("generate_schedule", {"days": ["Mon", "Wed"]})
        result = extract_function_call_data([part])
        assert result is not None
        assert result["type"] == "schedule_plan"

    def test_generate_explanation_maps_correctly(self):
        part = self._make_part("generate_explanation", {"content": "Why progressive overload works"})
        result = extract_function_call_data([part])
        assert result is not None
        assert result["type"] == "explanation"

    def test_unknown_function_name_uses_raw_name(self):
        part = self._make_part("some_new_function", {"key": "value"})
        result = extract_function_call_data([part])
        assert result is not None
        assert result["type"] == "some_new_function"

    def test_empty_parts_returns_none(self):
        result = extract_function_call_data([])
        assert result is None

    def test_text_only_parts_return_none(self):
        text_part = self._make_text_part("some text response")
        result = extract_function_call_data([text_part])
        assert result is None

    def test_none_args_becomes_empty_dict(self):
        part = self._make_part("generate_workout", None)
        result = extract_function_call_data([part])
        assert result is not None
        assert result["data"] == {}

    def test_first_function_call_wins_when_multiple_parts(self):
        part1 = self._make_part("generate_workout", {"name": "First"})
        part2 = self._make_part("generate_schedule", {"days": ["Mon"]})
        result = extract_function_call_data([part1, part2])
        assert result is not None
        assert result["type"] == "workout_plan"


class TestExtractMemoryUpdates:
    def test_no_injuries_returns_empty(self):
        result = extract_memory_updates("I want to build muscle and get stronger.")
        assert result == []

    def test_detects_bad_knee(self):
        result = extract_memory_updates("My bad knee is really limiting my squats.")
        assert len(result) == 1
        assert result[0]["type"] == "injury"
        assert "knee" in result[0]["content"].lower()

    def test_detects_injured_shoulder_adjacent(self):
        # The regex requires the injury keyword to be directly adjacent to the body part.
        # "injured shoulder" (no word between) matches; "injured my shoulder" does not.
        result = extract_memory_updates("I have an injured shoulder from lifting.")
        assert len(result) == 1
        assert result[0]["type"] == "injury"
        assert "shoulder" in result[0]["content"].lower()

    def test_detects_sore_back(self):
        result = extract_memory_updates("My sore back is making deadlifts hard.")
        assert len(result) == 1
        assert result[0]["type"] == "injury"
        assert "back" in result[0]["content"].lower()

    def test_detects_pain_in_hip_adjacent(self):
        # "pain in hip" (no "my") matches the "pain in" prefix pattern
        result = extract_memory_updates("I experience pain in hip flexors constantly.")
        assert len(result) == 1
        assert result[0]["type"] == "injury"

    def test_case_insensitive_matching(self):
        result = extract_memory_updates("I have a TORN WRIST ligament.")
        assert len(result) == 1

    def test_no_false_positive_on_similar_words(self):
        # "knee" mentioned but without injury keyword directly before it
        result = extract_memory_updates("Can we do some knee-dominant exercises today?")
        assert result == []

    def test_indirect_injury_phrase_no_match(self):
        # "injured my shoulder" has "my" between keyword and body part — no match per current regex
        result = extract_memory_updates("I injured my shoulder last year.")
        assert result == []  # Regex requires direct adjacency

    def test_pain_in_my_hip_no_match(self):
        # "pain in my hip" has "my" between "pain in" and "hip" — no match per current regex
        result = extract_memory_updates("I have pain in my hip when squatting deep.")
        assert result == []  # Regex requires direct adjacency

    def test_empty_string(self):
        result = extract_memory_updates("")
        assert result == []
