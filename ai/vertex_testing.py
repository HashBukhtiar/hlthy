from vertexai.generative_models import GenerativeModel, SafetySetting
import vertexai
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

generation_config = {
    "max_output_tokens": 2048,
    "temperature": 0.9,
    "top_p": 1,
    "top_k": 1,
}

@app.route('/api/ask', methods=['POST'])
def ask():
    try:
        print("Received request")
        user_prompt = request.json.get('prompt', '')
        print(f"User Prompt: {user_prompt}")
        response_text = run_vertex_ai_once(user_prompt)
        print(f"AI Response: {response_text}")
        return jsonify({"text": response_text})
    except Exception as e:
        print(f"Error in /api/ask: {e}")
        return jsonify({"text": "An error occurred."}), 500

def run_vertex_ai_once(user_prompt):
    try:
        print("Running Vertex AI")
        vertexai.init(project="hlthy-421200", location="northamerica-northeast1")
        model = GenerativeModel("gemini-1.0-pro-001")
        safety_settings = [
            SafetySetting(
                category=SafetySetting.HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            ),
            SafetySetting(
                category=SafetySetting.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            ),
            SafetySetting(
                category=SafetySetting.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            ),
            SafetySetting(
                category=SafetySetting.HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold=SafetySetting.HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            ),
        ]

        chat = model.start_chat()
        response = chat.send_message(
            user_prompt,
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        return response.text
    except Exception as e:
        print(f"Error in run_vertex_ai_once: {e}")
        return "Sorry, something went wrong with the AI."

if __name__ == "__main__":
    print("Starting Flask server...")
    app.run(host="0.0.0.0", port=5000, debug=True)