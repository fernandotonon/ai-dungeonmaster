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
    is_kids_mode = data.get('isKidsMode', False)
    style = data.get('style', 'cartoon')  # Default to 'cartoon' if not provided
    
    try:
        # Adjust the system message based on kids mode
        system_message = (
            "You are an AI that generates detailed image prompts based on story context. "
            "Create a vivid, descriptive prompt that captures the scene, including relevant details from the context. "
            "Focus on visual elements and maintain continuity with previous events. "
            f"The prompt should be suitable for DALL-E 2 image generation. Apply a {style} art style to the image. "
        )
        
        if is_kids_mode:
            system_message += (
                "As this is for a children's story, ensure all content is family-friendly and appropriate for young audiences. "
                "Avoid any scary, violent, or adult themes. Focus on whimsical, colorful, and positive imagery. "
                "Characters should be cute or friendly-looking. Scenes should be bright and cheerful. "
            )
        
        # Generate a detailed image prompt
        detailed_prompt = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Context:\n{context_prompt}\n\nCurrent action:\n{current_message}\n\nGenerate a detailed image prompt for this scene in {style} style:"}
            ],
            max_tokens=100
        )
        
        image_prompt = detailed_prompt.choices[0].message.content.strip()
        
        # Add a safety check for kids mode
        if is_kids_mode:
            safety_check = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a content moderator for children's content. Evaluate the following image prompt and determine if it's suitable for children. If it's not suitable, provide a modified, child-friendly version."},
                    {"role": "user", "content": f"Image prompt: {image_prompt}\n\nIs this prompt suitable for children? If not, provide a modified version:"}
                ],
                max_tokens=100
            )
            
            safety_response = safety_check.choices[0].message.content.strip()
            if "not suitable" in safety_response.lower():
                image_prompt = safety_response.split("Modified version:")[-1].strip()
        
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

def generate_response(prompt, model, is_kids_mode=False):
    try:
        openai_model = MODEL_MAPPING.get(model, 'gpt-4o-mini')
        
        system_message = (
            "You are an adaptive RPG AI capable of playing both as a Dungeon Master and as a Player character. "
            "Respond appropriately based on the role specified in the prompt. "
            "Keep your responses concise and relevant to the game context."
        )
        
        if is_kids_mode:
            system_message += (
                " As this is a game for children, ensure all content is family-friendly and appropriate for young audiences. "
                "Avoid any scary, violent, or adult themes. Focus on positive, educational, and fun experiences. "
                "Use simple language and explain any complex concepts. Encourage teamwork, problem-solving, and creativity. "
                "Make sure all characters and situations are suitable for children."
            )
        
        response = openai_client.chat.completions.create(
            model=openai_model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        generated_text = response.choices[0].message.content.strip()
        
        if is_kids_mode:
            # Additional safety check for kids mode
            safety_check = openai_client.chat.completions.create(
                model=openai_model,
                messages=[
                    {"role": "system", "content": "You are a content moderator for children's content. Evaluate the following text and determine if it's suitable for children. If it's not suitable, provide a modified, child-friendly version."},
                    {"role": "user", "content": f"Text: {generated_text}\n\nIs this text suitable for children? If not, provide a modified version:"}
                ],
                max_tokens=500,
                temperature=0.5
            )
            
            safety_response = safety_check.choices[0].message.content.strip()
            if "not suitable" in safety_response.lower():
                generated_text = safety_response.split("Modified version:")[-1].strip()
        
        return generated_text
    except Exception as e:
        logger.error(f"Error generating {model} response: {str(e)}")
        raise

@app.route('/generate', methods=['POST'])
def generate_text():
    data = request.json
    prompt = data['prompt']
    model = data.get('model', 'gpt4o-mini')  # Default to GPT-4o-mini if not specified
    is_kids_mode = data.get('isKidsMode', False)  # Get the kids mode status
    
    try:
        logger.info(f"Generating text with model: {model}, Kids Mode: {is_kids_mode}")
        if model in MODEL_MAPPING:
            generated_text = generate_response(prompt, model, is_kids_mode)
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