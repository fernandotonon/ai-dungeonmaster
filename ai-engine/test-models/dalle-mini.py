from flask import Flask, request, jsonify, send_file
from dalle_mini import DalleBart, DalleBartProcessor
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

@app.route('/generate', methods=['POST'])
def generate():
    prompt = request.json.get("prompt", "")
    inputs = processor([prompt])
    images = model.generate(**inputs)
    # Convert the images as necessary and return them
    return jsonify({"message": "Image generated", "prompt": prompt})

app = Flask(__name__)
CORS(app)

model = DalleBart.from_pretrained('dalle-mini/dalle-mini/mega-1-fp16:latest')
processor = DalleBartProcessor.from_pretrained('dalle-mini/dalle-mini/mega-1-fp16:latest')


@app.route('/generate-local-image', methods=['POST'])
def generate_local_image():
    data = request.get_json()
    prompt = data.get('prompt', 'a beautiful landscape')

    try:
        # Clear GPU cache before generating the image
        inputs = processor([prompt])
        images = model.generate(**inputs)
        image =  images[0]
        img_io = BytesIO()
        image.save(img_io, 'PNG')
        img_io.seek(0)

        return send_file(img_io, mimetype='image/png')
    except Exception as e:
        logger.error(f"Error in generate_image: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    logger.info("Starting the Flask app...")
    app.run(host='0.0.0.0', port=5000)