import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from diffusers import DPMSolverMultistepScheduler, AutoPipelineForText2Image, StableDiffusion3Pipeline
from io import BytesIO
from PIL import Image
import base64
from transformers import AutoTokenizer, AutoModelForCausalLM, LlamaForCausalLM, LlamaTokenizer, MllamaForConditionalGeneration, AutoProcessor
from huggingface_hub import login

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Check CUDA availability
if torch.cuda.is_available():
    device = torch.device("cuda")
    logger.info("CUDA available: True")
    logger.info(f"CUDA version: {torch.version.cuda}")
else:
    device = torch.device("cpu")
    logger.info("CUDA available: False")

torch.set_num_threads(4)  

# Load image generation models
torch.cuda.empty_cache()
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/stable-diffusion-xl-base-1.0", torch_dtype=torch.float16, variant="fp16").to(device)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)
pipe.enable_model_cpu_offload()
pipe.to("cpu")

try:
    model_id = "meta-llama/Llama-3.2-11B-Vision-Instruct"

    tokenizer = AutoTokenizer.from_pretrained(model_id)
    llm_model = MllamaForConditionalGeneration.from_pretrained(
        model_id,
        torch_dtype=torch.bfloat16, 
        device_map="auto",
        low_cpu_mem_usage=True,
        max_memory={0: "10GB", "cpu": "24GB"}
    )
    processor = AutoProcessor.from_pretrained(model_id)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    logging.info("LLM model loaded successfully")
except Exception as e:
    logging.error(f"Failed to load LLM model: {str(e)}")
    llm_model = None

@app.route('/llm-chat', methods=['POST'])
def llm_chat():
    data = request.form
    prompt = data.get('prompt')
    imageStream = data.get('image')

    messages = [{"role": "user", "content": [{"type": "text", "text": prompt}]}]
    if imageStream:
        messages = [{"role": "user", "content": [
            {"type": "image"}, 
            {"type": "text", "text": prompt}
        ]}]
    image = Image.open(imageStream)
    input_text = processor.apply_chat_template(messages, add_generation_prompt=True)
    inputs = processor(
        image,
        input_text,
        add_special_tokens=False,
        return_tensors="pt"
    ).to(device)

    output = llm_model.generate(**inputs, max_new_tokens=20)
    return processor.decode(output[0])

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    logger.info("Starting the Flask app...")
    app.run(host='0.0.0.0', port=5000)