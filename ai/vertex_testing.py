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
model = GenerativeModel("gemini-2.5-pro")

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
        conversation_history = data.get('conversation_history', [])
        
        # Use the conversation_history if available, otherwise fall back to history
        if conversation_history:
            history = conversation_history
        
        # If we have a message but no history, create history from the message
        if message and not history:
            history = [{'role': 'user', 'text': message}]
        
        print(f"Message: {message}")
        print(f"History length: {len(history) if history else 0}")
        print(f"Full history: {history}")
        
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
        print(f'History received: {history}')
        
        # Get the current user message (should be the last message)
        if not history or len(history) == 0:
            return "Hello! How can I help you today?"
        
        # Find the last user message
        current_message = None
        for message in reversed(history):
            role = message.get('role', 'user')
            if role == 'user':
                current_message = message.get('text', '')
                break
        
        if not current_message:
            current_message = history[-1].get('text', 'Hello')
        
        # Build conversation context as a single prompt
        context_parts = []
        for i, message in enumerate(history[:-1]):  # Exclude the last message
            role = message.get('role', 'user')
            text = message.get('text', '')
            
            if not text:
                continue
                
            # Map roles properly
            if role in ['assistant', 'model', 'ai']:
                context_parts.append(f"Assistant: {text}")
            elif role == 'user':
                context_parts.append(f"User: {text}")
        
        # Create the full prompt with context
        if context_parts:
            context_text = "\n".join(context_parts)
            full_prompt = f"""Previous conversation:
{context_text}

Current message: {current_message}

Please respond as a helpful assistant, keeping in mind the previous conversation context."""
        else:
            full_prompt = current_message
        
        print(f"Sending to Vertex AI: {full_prompt[:200]}...")
        
        # Use generate_content instead of chat for better reliability
        response = model.generate_content(full_prompt)
        
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
            return "Quota exceeded. Please try again later."
        else:
            return f"Sorry, I'm having trouble connecting. Please try again later. ({str(e)[:50]})"

if __name__ == "__main__":
    print("Starting Flask server with Vertex AI...")
    app.run(host="0.0.0.0", port=5001, debug=True)