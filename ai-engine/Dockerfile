FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    espeak \
    libespeak1 \
    libportaudio2 \
    && rm -rf /var/lib/apt/lists/*

# Copy just the requirements file first
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt \
&& rm -rf /root/.cache/pip

# Copy the rest of the application code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["python", "app.py"]