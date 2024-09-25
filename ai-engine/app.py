import os
import logging
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from openai import OpenAI
import tempfile

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

MODEL_MAPPING = {
    'gpt4o': 'gpt-4o',
    'gpt4o-mini': 'gpt-4o-mini',
    'gpt4-turbo': 'gpt-4-turbo',
    'gpt4': 'gpt-4',
    'gpt35-turbo': 'gpt-3.5-turbo'
}

AVAILABLE_VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]

@app.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.json
    context_prompt = data['contextPrompt']
    current_message = data['currentMessage']
    style = data.get('style', 'realistic')  # Default to 'realistic' if not provided
    
    try:
        # Generate a detailed image prompt based on the context and current message using gpt4o-mini
        detailed_prompt = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"You are an AI that generates detailed image prompts based on story context. Create a vivid, descriptive prompt that captures the scene, including relevant details from the context. Focus on visual elements and maintain continuity with previous events. The prompt should be suitable for DALL-E 2 image generation. Apply a {style} art style to the image."},
                {"role": "user", "content": f"Context:\n{context_prompt}\n\nCurrent action:\n{current_message}\n\nGenerate a detailed image prompt for this scene in {style} style:"}
            ],
            max_tokens=100
        )
        
        image_prompt = detailed_prompt.choices[0].message.content.strip()
        
        # Generate the image using the detailed prompt
        response = openai_client.images.generate(
            model="dall-e-2",
            prompt=image_prompt,
            size="256x256",
            response_format="b64_json",
            n=1
        )
        image_data = response.data[0].b64_json
        return jsonify({'image': image_data, 'prompt': image_prompt})
    except Exception as e:
        logger.error(f"Error generating image: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    text = data['text']
    voice = data.get('voice', 'alloy')  # Default to 'alloy' if not provided
    
    if voice not in AVAILABLE_VOICES:
        return jsonify({'error': 'Invalid voice selected'}), 400
    
    try:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text
        )
        response.stream_to_file(temp_file.name)
        return send_file(temp_file.name, mimetype="audio/mpeg")
    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/available-voices', methods=['GET'])
def get_available_voices():
    return jsonify({'voices': AVAILABLE_VOICES})

@app.route('/models', methods=['GET'])
def get_models():
    logger.info("Fetching available models")
    return jsonify({'models': list(MODEL_MAPPING.keys())})

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    logger.info("Starting the Flask app...")
    app.run(host='0.0.0.0', port=5000, debug=True)