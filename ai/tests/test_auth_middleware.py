"""
Tests for middleware/auth.py — get_authenticated_uid and get_optional_uid.

Firebase Admin SDK is mocked so tests run without credentials.
We stub firebase_admin before importing the module so the initialization
guard at module level doesn't attempt a real SDK call.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from starlette.requests import Request


# ------------------------------------------------------------------
# Stub firebase_admin at the sys.modules level before importing auth.
# This prevents the real SDK initialization (which needs credentials).
# The _apps dict must be non-empty so the "if not firebase_admin._apps"
# guard skips re-initialization.
# ------------------------------------------------------------------
if "firebase_admin" not in sys.modules:
    _fa_mock = MagicMock()
    _fa_mock._apps = {"default": MagicMock()}
    sys.modules["firebase_admin"] = _fa_mock
    sys.modules["firebase_admin.auth"] = MagicMock()
    sys.modules["firebase_admin.credentials"] = MagicMock()
else:
    # Already mocked by another test file — ensure _apps is non-empty
    sys.modules["firebase_admin"]._apps = {"default": MagicMock()}


def _make_request(auth_header: str | None = None) -> Request:
    """Build a minimal Starlette Request with optional Authorization header."""
    scope: dict = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [],
        "query_string": b"",
    }
    if auth_header is not None:
        scope["headers"] = [(b"authorization", auth_header.encode())]
    return Request(scope)


class TestGetAuthenticatedUid:
    @pytest.mark.anyio
    async def test_valid_token_returns_uid(self):
        import middleware.auth as auth_module
        mock_firebase_auth = MagicMock()
        mock_firebase_auth.verify_id_token.return_value = {"uid": "user-abc"}
        mock_firebase_auth.InvalidIdTokenError = type("InvalidIdTokenError", (Exception,), {})
        mock_firebase_auth.ExpiredIdTokenError = type("ExpiredIdTokenError", (Exception,), {})

        with patch.object(auth_module, "firebase_auth", mock_firebase_auth):
            request = _make_request("Bearer valid-token-123")
            uid = await auth_module.get_authenticated_uid(request)
            assert uid == "user-abc"
            mock_firebase_auth.verify_id_token.assert_called_once_with("valid-token-123")

    @pytest.mark.anyio
    async def test_missing_auth_header_raises_401(self):
        import middleware.auth as auth_module
        request = _make_request(None)
        with pytest.raises(HTTPException) as exc_info:
            await auth_module.get_authenticated_uid(request)
        assert exc_info.value.status_code == 401
        assert "Missing" in exc_info.value.detail

    @pytest.mark.anyio
    async def test_non_bearer_scheme_raises_401(self):
        import middleware.auth as auth_module
        request = _make_request("Basic dXNlcjpwYXNz")
        with pytest.raises(HTTPException) as exc_info:
            await auth_module.get_authenticated_uid(request)
        assert exc_info.value.status_code == 401

    @pytest.mark.anyio
    async def test_invalid_token_raises_401(self):
        import middleware.auth as auth_module
        InvalidIdTokenError = type("InvalidIdTokenError", (Exception,), {})
        mock_firebase_auth = MagicMock()
        mock_firebase_auth.InvalidIdTokenError = InvalidIdTokenError
        mock_firebase_auth.ExpiredIdTokenError = type("ExpiredIdTokenError", (Exception,), {})
        mock_firebase_auth.verify_id_token.side_effect = InvalidIdTokenError("bad token")

        with patch.object(auth_module, "firebase_auth", mock_firebase_auth):
            request = _make_request("Bearer bad-token")
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.get_authenticated_uid(request)
            assert exc_info.value.status_code == 401
            assert "Invalid" in exc_info.value.detail

    @pytest.mark.anyio
    async def test_expired_token_raises_401(self):
        import middleware.auth as auth_module
        ExpiredIdTokenError = type("ExpiredIdTokenError", (Exception,), {})
        mock_firebase_auth = MagicMock()
        mock_firebase_auth.InvalidIdTokenError = type("InvalidIdTokenError", (Exception,), {})
        mock_firebase_auth.ExpiredIdTokenError = ExpiredIdTokenError
        mock_firebase_auth.verify_id_token.side_effect = ExpiredIdTokenError("expired")

        with patch.object(auth_module, "firebase_auth", mock_firebase_auth):
            request = _make_request("Bearer expired-token")
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.get_authenticated_uid(request)
            assert exc_info.value.status_code == 401
            assert "Expired" in exc_info.value.detail

    @pytest.mark.anyio
    async def test_unexpected_exception_raises_401(self):
        import middleware.auth as auth_module
        mock_firebase_auth = MagicMock()
        mock_firebase_auth.InvalidIdTokenError = type("InvalidIdTokenError", (Exception,), {})
        mock_firebase_auth.ExpiredIdTokenError = type("ExpiredIdTokenError", (Exception,), {})
        mock_firebase_auth.verify_id_token.side_effect = RuntimeError("network error")

        with patch.object(auth_module, "firebase_auth", mock_firebase_auth):
            request = _make_request("Bearer some-token")
            with pytest.raises(HTTPException) as exc_info:
                await auth_module.get_authenticated_uid(request)
            assert exc_info.value.status_code == 401
            assert "verification failed" in exc_info.value.detail.lower()

    @pytest.mark.anyio
    async def test_bearer_token_stripped_correctly(self):
        """Verifies the token after 'Bearer ' is passed verbatim to verify_id_token."""
        import middleware.auth as auth_module
        mock_firebase_auth = MagicMock()
        mock_firebase_auth.verify_id_token.return_value = {"uid": "uid-xyz"}
        mock_firebase_auth.InvalidIdTokenError = type("InvalidIdTokenError", (Exception,), {})
        mock_firebase_auth.ExpiredIdTokenError = type("ExpiredIdTokenError", (Exception,), {})

        with patch.object(auth_module, "firebase_auth", mock_firebase_auth):
            request = _make_request("Bearer eyJhbGci.eyJ1aWQiOiJ0ZXN0fQ.sig")
            await auth_module.get_authenticated_uid(request)
            mock_firebase_auth.verify_id_token.assert_called_once_with(
                "eyJhbGci.eyJ1aWQiOiJ0ZXN0fQ.sig"
            )


class TestGetOptionalUid:
    @pytest.mark.asyncio
    async def test_no_header_returns_none(self):
        import middleware.auth as auth_module
        request = _make_request(None)
        result = await auth_module.get_optional_uid(request)
        assert result is None

    @pytest.mark.asyncio
    async def test_non_bearer_returns_none(self):
        import middleware.auth as auth_module
        request = _make_request("Basic credentials")
        result = await auth_module.get_optional_uid(request)
        assert result is None

    @pytest.mark.asyncio
    async def test_valid_token_returns_uid(self):
        import middleware.auth as auth_module
        mock_firebase_auth = MagicMock()
        mock_firebase_auth.verify_id_token.return_value = {"uid": "optional-user"}

        with patch.object(auth_module, "firebase_auth", mock_firebase_auth):
            request = _make_request("Bearer valid-token")
            result = await auth_module.get_optional_uid(request)
            assert result == "optional-user"

    @pytest.mark.asyncio
    async def test_invalid_token_returns_none(self):
        import middleware.auth as auth_module
        mock_firebase_auth = MagicMock()
        mock_firebase_auth.verify_id_token.side_effect = Exception("bad token")

        with patch.object(auth_module, "firebase_auth", mock_firebase_auth):
            request = _make_request("Bearer bad-token")
            result = await auth_module.get_optional_uid(request)
            assert result is None
