"""
Tests for middleware/auth.py — get_authenticated_uid and get_optional_uid.
Firebase Admin SDK is mocked entirely.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from starlette.testclient import TestClient
from starlette.requests import Request


def _make_request(auth_header: str | None = None) -> Request:
    """Build a minimal Starlette Request with optional Authorization header."""
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [],
    }
    if auth_header is not None:
        scope["headers"] = [(b"authorization", auth_header.encode())]
    return Request(scope)


class TestGetAuthenticatedUid:
    @pytest.mark.anyio
    async def test_valid_token_returns_uid(self):
        with patch("middleware.auth.firebase_auth") as mock_auth:
            mock_auth.verify_id_token.return_value = {"uid": "user-abc"}
            mock_auth.InvalidIdTokenError = Exception
            mock_auth.ExpiredIdTokenError = Exception

            from middleware.auth import get_authenticated_uid
            request = _make_request("Bearer valid-token-123")
            uid = await get_authenticated_uid(request)
            assert uid == "user-abc"
            mock_auth.verify_id_token.assert_called_once_with("valid-token-123")

    @pytest.mark.anyio
    async def test_missing_auth_header_raises_401(self):
        from middleware.auth import get_authenticated_uid
        request = _make_request(None)
        with pytest.raises(HTTPException) as exc_info:
            await get_authenticated_uid(request)
        assert exc_info.value.status_code == 401
        assert "Missing" in exc_info.value.detail

    @pytest.mark.anyio
    async def test_non_bearer_scheme_raises_401(self):
        from middleware.auth import get_authenticated_uid
        request = _make_request("Basic dXNlcjpwYXNz")
        with pytest.raises(HTTPException) as exc_info:
            await get_authenticated_uid(request)
        assert exc_info.value.status_code == 401

    @pytest.mark.anyio
    async def test_invalid_token_raises_401(self):
        with patch("middleware.auth.firebase_auth") as mock_auth:
            mock_auth.InvalidIdTokenError = ValueError
            mock_auth.ExpiredIdTokenError = TypeError
            mock_auth.verify_id_token.side_effect = ValueError("bad token")

            from middleware.auth import get_authenticated_uid
            request = _make_request("Bearer bad-token")
            with pytest.raises(HTTPException) as exc_info:
                await get_authenticated_uid(request)
            assert exc_info.value.status_code == 401
            assert "Invalid" in exc_info.value.detail

    @pytest.mark.anyio
    async def test_expired_token_raises_401(self):
        with patch("middleware.auth.firebase_auth") as mock_auth:
            mock_auth.InvalidIdTokenError = ValueError
            mock_auth.ExpiredIdTokenError = TypeError
            mock_auth.verify_id_token.side_effect = TypeError("expired")

            from middleware.auth import get_authenticated_uid
            request = _make_request("Bearer expired-token")
            with pytest.raises(HTTPException) as exc_info:
                await get_authenticated_uid(request)
            assert exc_info.value.status_code == 401
            assert "Expired" in exc_info.value.detail

    @pytest.mark.anyio
    async def test_unexpected_exception_raises_401(self):
        with patch("middleware.auth.firebase_auth") as mock_auth:
            mock_auth.InvalidIdTokenError = ValueError
            mock_auth.ExpiredIdTokenError = TypeError
            mock_auth.verify_id_token.side_effect = RuntimeError("network error")

            from middleware.auth import get_authenticated_uid
            request = _make_request("Bearer some-token")
            with pytest.raises(HTTPException) as exc_info:
                await get_authenticated_uid(request)
            assert exc_info.value.status_code == 401
            assert "verification failed" in exc_info.value.detail.lower()

    @pytest.mark.anyio
    async def test_bearer_token_stripped_correctly(self):
        """Verifies the token after 'Bearer ' is passed verbatim to verify_id_token."""
        with patch("middleware.auth.firebase_auth") as mock_auth:
            mock_auth.verify_id_token.return_value = {"uid": "uid-xyz"}
            mock_auth.InvalidIdTokenError = Exception
            mock_auth.ExpiredIdTokenError = Exception

            from middleware.auth import get_authenticated_uid
            request = _make_request("Bearer eyJhbGci.eyJ1aWQiOiJ0ZXN0fQ.sig")
            await get_authenticated_uid(request)
            mock_auth.verify_id_token.assert_called_once_with(
                "eyJhbGci.eyJ1aWQiOiJ0ZXN0fQ.sig"
            )


class TestGetOptionalUid:
    def test_no_header_returns_none(self):
        from middleware.auth import get_optional_uid
        request = _make_request(None)
        result = get_optional_uid(request)
        assert result is None

    def test_non_bearer_returns_none(self):
        from middleware.auth import get_optional_uid
        request = _make_request("Basic credentials")
        result = get_optional_uid(request)
        assert result is None

    def test_valid_token_returns_uid(self):
        with patch("middleware.auth.firebase_auth") as mock_auth:
            mock_auth.verify_id_token.return_value = {"uid": "optional-user"}

            from middleware.auth import get_optional_uid
            request = _make_request("Bearer valid-token")
            result = get_optional_uid(request)
            assert result == "optional-user"

    def test_invalid_token_returns_none(self):
        with patch("middleware.auth.firebase_auth") as mock_auth:
            mock_auth.verify_id_token.side_effect = Exception("bad token")

            from middleware.auth import get_optional_uid
            request = _make_request("Bearer bad-token")
            result = get_optional_uid(request)
            assert result is None
