import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

@app.route('/generate', methods=['POST'])
def generate_text():
    prompt = request.json['prompt']
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # or another appropriate model
            messages=[
                {"role": "system", "content": "You are a helpful assistant in an RPG game."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=100
        )
        generated_text = response.choices[0].message.content.strip()
        return jsonify({'generated_text': generated_text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)