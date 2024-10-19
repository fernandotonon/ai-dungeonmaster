from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
from diffusers import AnimateDiffPipeline, DDIMScheduler, MotionAdapter
from diffusers.utils import export_to_gif
from PIL import Image
import io

app = Flask(__name__)
CORS(app)

# Load the motion adapter
adapter = MotionAdapter.from_pretrained("guoyww/animatediff-motion-adapter-v1-5-2", torch_dtype=torch.float16)
# load SD 1.5 based finetuned model
model_id = "SG161222/Realistic_Vision_V5.1_noVAE"
pipe = AnimateDiffPipeline.from_pretrained(model_id, motion_adapter=adapter, torch_dtype=torch.float16)
scheduler = DDIMScheduler.from_pretrained(
    model_id,
    subfolder="scheduler",
    clip_sample=False,
    timestep_spacing="linspace",
    beta_schedule="linear",
    steps_offset=1,
)
pipe.scheduler = scheduler

# enable memory savings
pipe.enable_vae_slicing()
pipe.enable_model_cpu_offload()

@app.route('/generate-gif', methods=['POST'])
def generate_gif():
    prompt = request.form.get('prompt', 'a beautiful landscape')
    negative_prompt = request.form.get('negative_prompt', 'bad quality, worse quality')
    num_frames = int(request.form.get('num_frames', 16))
    guidance_scale = float(request.form.get('guidance_scale', 7.5))
    num_inference_steps = int(request.form.get('num_inference_steps', 25))
    generator = torch.Generator("cpu").manual_seed(42)
    
    # Check if an image was uploaded
    if 'initial_image' in request.files:
        initial_image = request.files['initial_image']
        image = Image.open(io.BytesIO(initial_image.read())).convert("RGB")
    else:
        image = None  # No initial image provided

    # Use the image (if provided) as the initial frame for the animation
    output = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        generator=generator,
        init_image=image,  # Use the initial image here if available
    )
    
    frames = output.frames[0]
    export_to_gif(frames, "animation.gif")

    return send_file("animation.gif", mimetype='image/gif')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
