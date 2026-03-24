#!/bin/bash
# Test the AI coach SSE streaming endpoint locally

API_KEY="AIzaSyA7jmAFVrgIfb7_BB87YF9Oo6Oz4eiykTU"
EMAIL="dev3@gmail.com"
PASSWORD="dev1233"
HOST="${1:-localhost}"
PORT="${2:-8080}"
PROD_URL="https://hlthy-ai-coach-375457000023.northamerica-northeast2.run.app"

echo "=== Getting Firebase ID token ==="
TOKEN=$(curl -s \
  "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"returnSecureToken\":true}" \
  | python3.11 -c "import sys,json; print(json.load(sys.stdin)['idToken'])")

if [ -z "$TOKEN" ]; then
  echo "ERROR: Failed to get token"
  exit 1
fi

echo "=== Token obtained, testing stream ==="
echo ""

curl -N \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "conversation_id": "test_ai_conversation"}' \
  "http://${HOST}:${PORT}/api/chat/stream"
