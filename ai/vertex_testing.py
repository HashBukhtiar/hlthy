import base64
import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting, Part

def multiturn_generate_content():
    vertexai.init(project="hlthy-421200", location="northamerica-northeast1")
    model = GenerativeModel(
        "gemini-1.0-pro-001",
    )

    # Start a chat
    chat = model.start_chat()
    while True:
        prompt = input("Enter prompt ('end' if done): ")
        if prompt == 'end':
            break
        response = chat.send_message(prompt)
        print(f"--------------------------------------------")
        print(response.text)
        print(f"--------------------------------------------")


generation_config = {
    "max_output_tokens": 2048,
    "temperature": 0.9,
    "top_p": 1,
    "top_k": 1,
}

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

multiturn_generate_content()