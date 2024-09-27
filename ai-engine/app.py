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

@app.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    try:
        # Create a temporary file to store the audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_audio:
            # Write the incoming stream to the temporary file
            temp_audio.write(request.stream.read())
            temp_audio.flush()

        # Use the temporary file with the Whisper API
        with open(temp_audio.name, 'rb') as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="text"
            )
        
        # Delete the temporary file
        os.unlink(temp_audio.name)
        
        return jsonify({'transcript': transcript})
    except Exception as e:
        logger.error(f"Error in speech_to_text: {str(e)}")
        return jsonify({'error': str(e)}), 500

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
        else:
            return jsonify({'error': 'Invalid model specified'}), 400
        
        return jsonify({'generated_text': generated_text})
    except Exception as e:
        logger.error(f"Error in generate_text: {str(e)}")
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