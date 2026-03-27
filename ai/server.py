"""
HLTHY AI Coach — FastAPI Server
Replaces the Flask api_server.py with async streaming support.
"""
import os
import sys

import vertexai
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Add ai directory to path
ai_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ai_dir)

# Load environment variables
try:
    from config.load_env import load_env_file
    load_env_file()
except ImportError:
    pass

# Initialize Vertex AI
PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "hlthy-421200")
VERTEX_REGION = os.environ.get("VERTEX_AI_REGION", "us-central1")

service_account_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
if service_account_path and os.path.exists(service_account_path):
    from google.oauth2 import service_account
    credentials = service_account.Credentials.from_service_account_file(service_account_path)
    vertexai.init(project=PROJECT_ID, location=VERTEX_REGION, credentials=credentials)
else:
    vertexai.init(project=PROJECT_ID, location=VERTEX_REGION)

# Import routers after Vertex AI init
from routers import health, chat, internal  # noqa: E402

app = FastAPI(title="HLTHY AI Coach", version="3.0")

# CORS: Allow Expo Web (localhost dev) and production web if needed.
# Native mobile clients (iOS/Android) are unaffected by CORS.
# Internal endpoints (Cloud Functions → Cloud Run) are server-to-server, unaffected by CORS.
_cors_origins = [
    "http://localhost:8081",   # Expo Web dev server
    "http://localhost:19006",  # Expo Web alt port
]
_prod_web_origin = os.environ.get("WEB_ORIGIN")
if _prod_web_origin:
    _cors_origins.append(_prod_web_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["POST", "GET"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(internal.router, prefix="/api")
