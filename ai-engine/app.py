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

def generate_response(prompt, model):
    try:
        openai_model = MODEL_MAPPING.get(model, 'gpt-4o-mini')
        response = openai_client.chat.completions.create(
            model=openai_model,
            messages=[
                {"role": "system", "content": "You are an adaptive RPG AI capable of playing both as a Dungeon Master and as a Player character. Respond appropriately based on the role specified in the prompt. Keep your responses concise and relevant to the game context."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Error generating {model} response: {str(e)}")
        raise

@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.json
    prompt = data['prompt']
    model = data.get('model', 'gpt4o-mini')  # Default to GPT-4o-mini if not specified
    
    try:
        logger.info(f"Generating text with model: {model}")
        if model in MODEL_MAPPING:
            generated_text = generate_response(prompt, model)
            return jsonify({'generated_text': generated_text})
        else:
            return jsonify({'error': 'Invalid model specified'}), 400
    except Exception as e:
        logger.error(f"Error in generate_text: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    text = data['text']
    
    try:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        response = openai_client.audio.speech.create(
            model="tts-1",
            voice="alloy",
            input=text
        )
        response.stream_to_file(temp_file.name)
        return send_file(temp_file.name, mimetype="audio/mpeg")
    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        return jsonify({'error': str(e)}), 500

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