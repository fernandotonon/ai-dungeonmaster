FROM python:3.9-slim

WORKDIR /app

# Copy just the requirements file first
COPY requirements.txt .

# Install dependencies
# Use pip's cache dir and install with no-cache-dir for smaller image size
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the application
CMD ["python", "app.py"]