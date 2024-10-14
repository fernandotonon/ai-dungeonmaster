from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
from diffusers import AnimateDiffPipeline, DDIMScheduler, MotionAdapter
from diffusers.utils import export_to_gif

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
    data = request.get_json()
    prompt = data.get('prompt', 'a beautiful landscape')
    negative_prompt = data.get('negative_prompt', 'bad quality, worse quality')
    num_frames = data.get('num_frames', 16)
    guidance_scale = data.get('guidance_scale', 7.5)
    num_inference_steps = data.get('num_inference_steps', 25)
    generator = torch.Generator("cpu").manual_seed(42)

    output = pipe(
        prompt=prompt,
        negative_prompt=negative_prompt,
        num_frames=num_frames,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        generator=generator,
    )
    frames = output.frames[0]
    export_to_gif(frames, "animation.gif")

    return send_file("animation.gif", mimetype='image/gif')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    logger.info("Starting the Flask app...")
    app.run(host='0.0.0.0', port=5000)