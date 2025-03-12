FROM pytorch/pytorch:2.2.1-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    software-properties-common \
    && add-apt-repository ppa:ubuntu-toolchain-r/test \
    && apt-get update \
    && apt-get install -y libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

# Copy just the requirements file first
COPY requirements.txt .

# Install pip and use cache explicitly
RUN pip install --upgrade pip && pip install --no-cache -r requirements.txt --timeout=1000

# Copy the rest of the application code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["python", "app.py"]
