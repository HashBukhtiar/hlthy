import vertexai
from vertexai.generative_models import GenerativeModel
from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize Vertex AI
project_id = "hlthy-421200"
location = "us-central1"
vertexai.init(project=project_id, location=location)

# Initialize the model
model = GenerativeModel("gemini-1.5-flash")

# Health check endpoint
@app.route('/', methods=['GET'])
def health_check():
    return jsonify({"status": "OK", "message": "Flask AI service is running", "version": "v4"}), 200

@app.route('/api/health', methods=['GET']) 
def api_health():
    return jsonify({"status": "OK", "service": "AI Chat API", "version": "v4"}), 200

# Debug endpoint to list all routes
@app.route('/routes', methods=['GET'])
def list_routes():
    routes = []
    for rule in app.url_map.iter_rules():
        routes.append({
            'endpoint': rule.endpoint,
            'methods': list(rule.methods),
            'rule': str(rule)
        })
    return jsonify({"routes": routes}), 200


# New endpoint for conversational AI
@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        print("=== RECEIVED /api/chat REQUEST ===")
        print(f"Request method: {request.method}")
        print(f"Request headers: {dict(request.headers)}")
        print(f"Request content type: {request.content_type}")
        
        data = request.get_json()
        print(f"Request JSON data: {data}")
        
        if not data:
            print("ERROR: No JSON data received")
            return jsonify({"error": "No JSON data received"}), 400
            
        # Handle both 'message' and 'history' formats for backward compatibility
        message = data.get('message', '')
        history = data.get('history', [])
        
        # If we have a message but no history, create history from the message
        if message and not history:
            history = [{'role': 'user', 'text': message}]
        
        print(f"Message: {message}")
        print(f"History length: {len(history) if history else 0}")
        
        if not history or not isinstance(history, list):
            print("ERROR: Missing or invalid 'history' in request body")
            return jsonify({"error": "Missing or invalid 'history' in request body."}), 400

        print(f"Processing {len(history)} messages for AI...")
        response_text = model_response_conversation(history)
        print(f"AI Response generated: {response_text[:100]}...")
        return jsonify({"text": response_text})
    except Exception as e:
        print(f"ERROR in /api/chat: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"text": "An error occurred."}), 500


# Function for conversational context using Vertex AI
def model_response_conversation(history):
    try:
        print('Using Vertex AI to generate response...')
        
        # Get the last message from history
        if history and len(history) > 0:
            last_message = history[-1].get('text', '')
            if not last_message:
                # Try alternative formats
                parts = history[-1].get('parts', [])
                if isinstance(parts, list) and len(parts) > 0:
                    last_message = parts[0]
                else:
                    last_message = str(history[-1])
        else:
            last_message = "Hello"
        
        print(f"Sending message to Vertex AI: {last_message}")
        
        # Use Vertex AI to generate content
        response = model.generate_content(last_message)
        
        print(f"Received response from Vertex AI: {response.text[:100] if response.text else 'None'}")
        
        return response.text if response.text else "Sorry, I couldn't generate a response."
        
    except Exception as e:
        print(f"Error during Vertex AI generation: {e}")
        import traceback
        traceback.print_exc()
        
        # Return a meaningful error message
        error_msg = str(e)
        if "permission" in error_msg.lower() or "403" in error_msg:
            return "Permission denied. Please check Vertex AI API permissions."
        elif "quota" in error_msg.lower():
            return "API quota exceeded. Please try again later."
        else:
            return f"AI service error: {error_msg[:100]}..."

if __name__ == "__main__":
    print("Starting Flask server with Vertex AI...")
    app.run(host="0.0.0.0", port=5001, debug=True)