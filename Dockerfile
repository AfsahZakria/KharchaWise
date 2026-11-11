# KharchaWise Production Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    DB_PATH=/app/database/kharchawise.db

# Copy project files
COPY database/ /app/database/
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/

# Expose port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

# Start fullstack server
CMD ["python", "backend/server.py"]
