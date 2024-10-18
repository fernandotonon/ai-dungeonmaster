# ai-dungeonmaster
AI-Powered Holodeck-Style Online RPG

## Create virtual environment
python3 -m venv venv
source venv/bin/activate && python app.py

## Run docker compose
docker compose --env-file ./.env up --build

## rename llama pth file
mv /home/fernando/.llama/checkpoints/Llama3.2-3B/consolidated.00.pth /home/fernando/.llama/checkpoints/Llama3.2-3B/pytorch_model.bin

## run docker compose with gpu
docker compose --env-file ./.env up --build --gpus all