FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg 
    #&& rm -rf /var/lib/apt/lists/*

# Copy just the requirements file first
COPY requirements.txt .

# Install pip and use cache explicitly
#RUN --mount=type=cache,target=/root/.cache/pip \
#    pip install --upgrade pip && pip install -r requirements.txt --timeout=1000

RUN pip install --upgrade pip && pip install --no-cache -r requirements.txt --timeout=1000

# Copy the rest of the application code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["python", "app.py"]
