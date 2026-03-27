"""
Tests for core/text_utils.py — sanitize and parse_gemini_json.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import json

from core.text_utils import sanitize, parse_gemini_json


class TestSanitize:
    def test_strips_newlines(self):
        assert sanitize("hello\nworld") == "hello world"

    def test_strips_carriage_returns(self):
        assert sanitize("hello\rworld") == "hello world"

    def test_strips_mixed_line_endings(self):
        assert sanitize("line1\r\nline2\nline3") == "line1 line2 line3"

    def test_multiple_consecutive_newlines_become_single_space(self):
        assert sanitize("a\n\n\nb") == "a b"

    def test_limits_to_max_len(self):
        result = sanitize("x" * 200, max_len=50)
        assert len(result) == 50

    def test_default_max_len_is_100(self):
        result = sanitize("a" * 200)
        assert len(result) == 100

    def test_short_text_not_truncated(self):
        result = sanitize("hello", max_len=100)
        assert result == "hello"

    def test_empty_string_returns_empty(self):
        assert sanitize("") == ""

    def test_empty_string_with_max_len(self):
        assert sanitize("", max_len=50) == ""

    def test_newlines_replaced_before_truncation(self):
        # "a\nb" → "a b" (3 chars), not truncated at max_len=2 before replacement
        result = sanitize("a\nb", max_len=3)
        assert result == "a b"

    def test_text_with_only_newlines(self):
        result = sanitize("\n\n\n")
        assert result == " "

    def test_preserves_other_whitespace(self):
        # Tabs and spaces are not stripped — only newlines
        result = sanitize("hello\tworld  end")
        assert result == "hello\tworld  end"

    def test_max_len_zero_returns_empty(self):
        assert sanitize("hello", max_len=0) == ""

    def test_text_with_newline_at_max_boundary(self):
        # "abc\nde" → "abc de" (6 chars), max_len=5 → "abc d"
        result = sanitize("abc\nde", max_len=5)
        assert result == "abc d"


class TestParseGeminiJson:
    def test_clean_json_object(self):
        result = parse_gemini_json('{"key": "value", "num": 42}')
        assert result == {"key": "value", "num": 42}

    def test_clean_json_with_whitespace(self):
        result = parse_gemini_json('  { "a": 1 }  ')
        assert result == {"a": 1}

    def test_markdown_json_fence(self):
        text = '```json\n{"insight": "Great job!", "sentiment": "positive"}\n```'
        result = parse_gemini_json(text)
        assert result["insight"] == "Great job!"
        assert result["sentiment"] == "positive"

    def test_triple_backtick_fence_no_language_tag(self):
        text = '```\n{"key": "value"}\n```'
        result = parse_gemini_json(text)
        assert result == {"key": "value"}

    def test_markdown_fence_with_extra_whitespace(self):
        text = '  ```json\n  {"x": 99}\n  ```  '
        result = parse_gemini_json(text)
        assert result == {"x": 99}

    def test_nested_json(self):
        data = {"outer": {"inner": [1, 2, 3]}, "flag": True}
        result = parse_gemini_json(json.dumps(data))
        assert result == data

    def test_malformed_json_raises_json_decode_error(self):
        with pytest.raises(json.JSONDecodeError):
            parse_gemini_json("{not valid json}")

    def test_malformed_json_in_fence_raises(self):
        with pytest.raises(json.JSONDecodeError):
            parse_gemini_json("```json\n{broken\n```")

    def test_empty_string_raises(self):
        with pytest.raises((json.JSONDecodeError, ValueError)):
            parse_gemini_json("")

    def test_json_array_parses(self):
        # json.loads accepts arrays too — verify no accidental breakage
        result = parse_gemini_json("[1, 2, 3]")
        assert result == [1, 2, 3]

    def test_fence_with_no_closing_backtick(self):
        # No trailing ``` — content after split should still parse if valid JSON
        text = "```json\n{\"key\": \"value\"}"
        result = parse_gemini_json(text)
        assert result == {"key": "value"}

    def test_real_analysis_response(self):
        # Simulate a realistic Gemini response
        payload = {
            "insight": "Nice work finishing Push Day!",
            "highlights": ["Hit a PR on Bench Press", "High volume session"],
            "recommendations": ["Add 5lbs next session", "Stretch shoulders post-workout"],
            "sentiment": "positive",
        }
        result = parse_gemini_json(json.dumps(payload))
        assert result["sentiment"] == "positive"
        assert len(result["highlights"]) == 2
