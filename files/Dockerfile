FROM python:3.9-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    DEBUG=False \
    FILE_STORAGE_PATH=/app/uploads

# Install dependencies
RUN pip install --no-cache-dir uv
COPY pyproject.toml .

# Use uv to install dependencies
RUN uv pip install --system -e .

# Create uploads directory
RUN mkdir -p /app/uploads && chmod 777 /app/uploads

# Copy application code
COPY src/ src/

# Run the application
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
