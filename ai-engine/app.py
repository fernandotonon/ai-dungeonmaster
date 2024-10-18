import os
import logging
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from openai import OpenAI
import tempfile
import torch
import torchaudio
from transformers import WhisperProcessor, WhisperForConditionalGeneration
from gtts import gTTS
from google.generativeai import GenerativeModel, configure
import google.generativeai as genai
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler, AutoPipelineForText2Image, StableDiffusion3Pipeline
from io import BytesIO
from PIL import Image
from diffusers import DiffusionPipeline
from torch.cuda.amp import autocast
import base64
from transformers import AutoTokenizer, AutoModelForCausalLM, LlamaForCausalLM, LlamaTokenizer
from huggingface_hub import login

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

login(token=os.getenv("HUGGING_FACE_TOKEN"))

app = Flask(__name__)
CORS(app)

# Global variable to control local vs. API processing
USE_LOCAL_MODELS = True

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Check CUDA availability
if torch.cuda.is_available():
    device = torch.device("cuda")
    logger.info("CUDA available: True")
    logger.info(f"CUDA version: {torch.version.cuda}")
else:
    device = torch.device("cpu")
    logger.info("CUDA available: False")

torch.set_num_threads(4)  # Adjust this based on your CPU cores

# Load Whisper model for local processing
stt_device = torch.device("cpu")
whisper_processor = WhisperProcessor.from_pretrained("openai/whisper-base")
whisper_model = WhisperForConditionalGeneration.from_pretrained("openai/whisper-base").to(stt_device)

# Configure Google AI
configure(api_key=os.getenv("GOOGLE_API_KEY"))

# Load image generation models
torch.cuda.empty_cache()
#pipe = StableDiffusion3Pipeline.from_pretrained("stabilityai/stable-diffusion-3-medium-diffusers", torch_dtype=torch.float16, variant="fp16").to(device)
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16").to(device)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
pipe.enable_model_cpu_offload()
pipe.to("cpu")
# torch.cuda.empty_cache()
# pipe_vid = DiffusionPipeline.from_pretrained("stabilityai/stable-video-diffusion-img2vid", torch_dtype=torch.float16).to(device)

try:
    model_id = "meta-llama/Llama-3.2-1B"

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    llm_model = LlamaForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float16, 
        device_map="auto",
        low_cpu_mem_usage=True,
        max_memory={0: "5GB", "cpu": "16GB"}
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    logging.info("LLM model loaded successfully")
except Exception as e:
    logging.error(f"Failed to load LLM model: {str(e)}")
    llm_model = None


MODEL_MAPPING = {
    'gpt4o': 'gpt-4o',
    'gpt4o-mini': 'gpt-4o-mini',
    'gpt4-turbo': 'gpt-4-turbo',
    'gpt4': 'gpt-4',
    'gpt35-turbo': 'gpt-3.5-turbo',
    'gemini-pro': 'gemini-pro',
    'llama32': 'llama32'
}

AVAILABLE_VOICES = ["alloy", "echo", "fable", "google", "onyx", "nova", "shimmer"]

@app.route('/generate-local-image', methods=['POST'])
def generate_local_image():
    data = request.get_json()
    prompt = data.get('prompt', 'a beautiful landscape')

    try:
        # Clear GPU cache before generating the image
        torch.cuda.empty_cache()
        image = pipe(prompt).images[0]
        img_io = BytesIO()
        image.save(img_io, 'PNG')
        img_io.seek(0)
        torch.cuda.empty_cache()

        return send_file(img_io, mimetype='image/png')
    except Exception as e:
        logger.error(f"Error in generate_image: {str(e)}")
        return jsonify({'error': str(e)}), 500

# @app.route('/convert-to-video', methods=['POST'])
# def convert_to_video():
#     # Get the image from the request
#     file = request.files['image']
#     image = Image.open(file)

#     try:
#         # Clear GPU cache to avoid memory fragmentation
#         torch.cuda.empty_cache()

#         # Convert the image to a video using img2vid on GPU
#         with torch.cuda.amp.autocast():
#             video_frames = pipe_vid(image, num_inference_steps=10, num_frames=3).frames

#         # Clear GPU cache to avoid memory fragmentation
#         torch.cuda.empty_cache()
#         # Create a video from the generated frames
#         video_path = "/tmp/generated_video.mp4"
#         video_frames[0].save(
#             video_path,
#             save_all=True,
#             append_images=video_frames[1:],
#             duration=100,
#             loop=0,
#         )

#         # Send the video file
#         return send_file(video_path, mimetype='video/mp4')

#     except Exception as e:
#         logger.error(f"Error in convert_to_video: {str(e)}")
#         return jsonify({'error': str(e)}), 500

# @app.route('/generate-video', methods=['POST'])
# def generate_video():
#     # Clear GPU cache to avoid memory fragmentation
#     torch.cuda.empty_cache()

#     # Get the image from the request
#     # Get the text prompt from the request
#     data = request.get_json()
#     prompt = data.get('prompt', 'a beautiful landscape')

#     # Generate the image from the prompt
#     image = pipe(prompt).images[0]

#     # Clear GPU cache to avoid memory fragmentation
#     torch.cuda.empty_cache()

#     # Convert the image to a video using img2vid
#     video_frames = pipe_vid(image, num_inference_steps=25, num_frames=10).frames

#     # Create a video from the generated frames
#     video_path = "/tmp/generated_video.mp4"
#     video_frames[0].save(
#         video_path,
#         save_all=True,
#         append_images=video_frames[1:],
#         duration=100,
#         loop=0,
#     )

#     # Send the video file
#     return send_file(video_path, mimetype='video/mp4')

@app.route('/speech-to-text', methods=['POST'])
def speech_to_text():
    #get the language from the request headers
    language = request.headers.get('language', 'en')
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            temp_audio.write(request.stream.read())
            temp_audio.flush()

        if USE_LOCAL_MODELS:
            # Local processing using Whisper-tiny on CPU
            waveform, sample_rate = torchaudio.load(temp_audio.name)
            input_features = whisper_processor(waveform.squeeze().numpy(), sampling_rate=sample_rate, return_tensors="pt", language=language).input_features
            
            # Ensure input_features are on CPU
            input_features = input_features.to(stt_device)
            
            with torch.no_grad():
                predicted_ids = whisper_model.generate(input_features)
            
            transcript = whisper_processor.batch_decode(predicted_ids, skip_special_tokens=True)[0]
        else:
            # API processing, the language must be on ISO-639-1 format e.g. pt-br must be converted to pt
            with open(temp_audio.name, 'rb') as audio_file:
                transcript = openai_client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=audio_file,
                    response_format="text",
                    language=language.split('-')[0]
                )
        
        os.unlink(temp_audio.name)
        
        return jsonify({'transcript': transcript})
    except Exception as e:
        logger.error(f"Error in speech_to_text: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    text = data['text']
    voice = data.get('voice', 'alloy')
    language = data.get('language', 'en')

    if voice not in AVAILABLE_VOICES:
        return jsonify({'error': 'Invalid voice selected'}), 400
    
    try:
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        
        if voice == 'google':
            tts = gTTS(text=text, lang=language)
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            tts.save(temp_file.name)
            return send_file(temp_file.name, mimetype="audio/mp3")
        else:
            # API processing
            response = openai_client.audio.speech.create(
                model="tts-1",
                voice=voice,
                input=text
            )
            response.stream_to_file(temp_file.name)
        
        return send_file(temp_file.name, mimetype="audio/wav")
    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/generate-image', methods=['POST'])
def generate_image():
    data = request.json
    context_prompt = data['contextPrompt']
    current_message = data['currentMessage']
    is_kids_mode = data.get('isKidsMode', False)
    style = data.get('style', 'cartoon')  # Default to 'cartoon' if not provided
    negative_prompt = data.get('negative_prompt', 'blurry, bad art, poor quality')
    theme = data.get('theme', '')
    
    try:
        # Adjust the system message based on kids mode
        system_message = (
            "You are an AI that generates detailed image prompts based on story context. "
            "Create a vivid, descriptive prompt that captures the scene, including relevant details from the context. "
            "Focus on visual elements and maintain continuity with previous events. "
            f"The prompt should be suitable for image generation. Apply a {style} art style to the image. "
        )

        if is_kids_mode:
            system_message += (
                "As this is for a children's story, ensure all content is family-friendly and appropriate for young audiences. "
                "Avoid any scary, violent, or adult themes. Focus on whimsical, colorful, and positive imagery. "
                "Characters should be cute or friendly-looking. Scenes should be bright and cheerful. "
            )
        
        if theme:
            system_message += (f" The theme of the game is {theme}.")
        
        # Generate a detailed image prompt
        detailed_prompt = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Context:\n{context_prompt}\n\nCurrent action:\n{current_message}\n\nGenerate a detailed image prompt for this scene in {style} style:"}
            ],
            max_tokens=75
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
        
        if USE_LOCAL_MODELS:
            # Generate the image using the local SDXL Turbo model
            torch.cuda.empty_cache()

            image = pipe(
                prompt=image_prompt,
                negative_prompt=negative_prompt,
                num_inference_steps=50, 
                max_embeddings_multiples=3,
                guidance_scale=7.5,
                width=1024,
                height=1024
            ).images[0]

            torch.cuda.empty_cache()  # Clear unused GPU memory

            img_io = BytesIO()
            image.save(img_io, 'PNG')
            img_io.seek(0)
            image_data = base64.b64encode(img_io.getvalue()).decode('utf-8')
        else:
            # Generate the image using the DALL-E API
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

def generate_response(prompt, model, is_kids_mode=False, language=''):
    try:
        system_message = (
            "You are an adaptive RPG AI capable of playing both as a Dungeon Master and as a Player character. "
            "Respond appropriately based on the role specified in the prompt. "
            "Keep your responses concise and relevant to the game context."
            "When acting as Dungeon Master, respond in JSON format, with the following keys: 'role', 'content', 'options' (for multiple choice questions or actions)."
            "e.g. { 'role': 'Dungeon Master', 'content': 'Story content', 'options': ['Option 1', 'Option 2', ...] }."
            "When acting as Player, respond in plain text."
        )

        if is_kids_mode:
            system_message += (
                " As this is a game for children, ensure all content is family-friendly and appropriate for young audiences. "
                "Avoid any scary, violent, or adult themes. Focus on positive, educational, and fun experiences. "
                "Use simple language and explain any complex concepts. Encourage teamwork, problem-solving, and creativity. "
                "Make sure all characters and situations are suitable for children."
                "Keep the game light-hearted and engaging, with a focus on exploration and discovery."
                "Use positive reinforcement and encouragement to motivate players."
                "Use short sentences and simple words to make the game easy to understand."
                "Encourage players to use their imagination and creativity to solve problems."
                "Use icons when it makes sense to help players understand the game."
            )        

        if language:
            system_message += f"\nRespond in language ({language})."

        if model == 'gemini-pro':
            # Gemini-specific processing
            gemini_model = GenerativeModel('gemini-pro')
            
            response = gemini_model.generate_content([system_message, prompt])
            generated_text = response.text
        elif model == 'llama32':
            if language:
                prompt += f"\nRespond in language ({language})."
            full_prompt = f"{system_message}\nUser: {prompt}\nAssistant:"
            inputs = tokenizer(full_prompt, return_tensors="pt", padding=True, truncation=True).to("cuda")
            with torch.no_grad():
                outputs = llm_model.generate(
                    inputs.input_ids,
                    attention_mask=inputs.attention_mask,
                    max_length=1500,
                    num_beams=5,
                    no_repeat_ngram_size=2,
                    early_stopping=True
                )
            generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
            generated_text = generated_text.split("Assistant:")[-1].strip()
        else:
            # Existing OpenAI processing
            openai_model = MODEL_MAPPING.get(model, 'gpt-4o-mini')

            # Send the prompt to the AI model
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
                # Additional safety check for kids mode content
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
    language = data.get('language', '')  
    
    try:
        logger.info(f"Generating text with model: {model}, Kids Mode: {is_kids_mode}, Language: {language}")
        if model in MODEL_MAPPING:
            generated_text = generate_response(prompt, model, is_kids_mode, language)
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
    app.run(host='0.0.0.0', port=5000)