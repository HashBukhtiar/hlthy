from google import genai
from google.genai import types
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/api/ask', methods=['POST'])
def ask():
    try:
        print("Received request")
        user_prompt = request.json.get('prompt', '')
        print(f"User Prompt: {user_prompt}")
        response_text = model_response(user_prompt)
        print(f"AI Response: {response_text}")
        return jsonify({"text": response_text})
    except Exception as e:
        print(f"Error in /api/ask: {e}")
        return jsonify({"text": "An error occurred."}), 500 

def model_response(prompt):
    client = genai.Client(
        vertexai=True,
        project="hlthy-421200",
        location="us-east4",
    )

    model = "gemini-2.0-flash-lite-001"
    contents = [
    types.Content(
        role="user",
        parts=[
        types.Part.from_text(text=prompt)
        ]
    ),
    ]
    generate_content_config = types.GenerateContentConfig(
    temperature = 1,
    top_p = 0.95,
    max_output_tokens = 4096,
    response_modalities = ["TEXT"],
    safety_settings = [types.SafetySetting(
        category="HARM_CATEGORY_HATE_SPEECH",
        threshold="OFF"
    ),types.SafetySetting(
        category="HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold="OFF"
    ),types.SafetySetting(
        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold="OFF"
    ),types.SafetySetting(
        category="HARM_CATEGORY_HARASSMENT",
        threshold="OFF"
    )],
    )

    print('generating content...')
    full_response = ""
    try:
        # Generate content using the stream
        for chunk in client.models.generate_content_stream(
            model=model,
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.text:
                full_response += chunk.text
        return full_response
    except Exception as e:
        print(f"Error during model generation: {e}")
        return "Error generating response from AI."


if __name__ == "__main__":
    print("Starting Flask server...")
    app.run(host="0.0.0.0", port=5001, debug=True)