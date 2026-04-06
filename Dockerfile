# Multi-stage Dockerfile for RAI Ops Application
# Supports both development and production environments

# Base stage with common dependencies
FROM python:3.14-slim as base

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Copy Python requirements
COPY requirements.txt ./
COPY backend/requirements.txt ./backend/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base as development

# Install Node.js for frontend development
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Copy backend source code
COPY backend/ ./backend/
COPY config.py ./
COPY start_dev.py ./

# Create necessary directories
RUN mkdir -p logs uploads instance

# Set development environment variables
ENV FLASK_ENV=development
ENV FLASK_DEBUG=1
ENV SECRET_KEY=dev-secret-key-change-in-production
ENV JWT_SECRET_KEY=dev-jwt-secret-change-in-production
ENV DATABASE_URL=sqlite:///rai_ops_dev.db
ENV CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ENV LOG_LEVEL=DEBUG
ENV MAIL_SUPPRESS_SEND=True

# Install Node.js dependencies for frontend
WORKDIR /app/backend
RUN npm install

# Expose development ports
EXPOSE 5000 5173

# Development command - start both backend and frontend
CMD ["python", "../start_dev.py"]

# Production stage
FROM base as production

# Install only runtime dependencies (no build tools)
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend source code (excluding development files)
COPY backend/ ./backend/
COPY config.py ./
COPY start_prod.py ./
COPY --from=development /app/backend/node_modules ./backend/node_modules

# Create necessary directories
RUN mkdir -p logs uploads instance

# Set production environment variables (will be overridden by docker-compose)
ENV FLASK_ENV=production
ENV FLASK_DEBUG=0
ENV LOG_LEVEL=INFO

# Build frontend for production
WORKDIR /app/backend
RUN npm install && npm run build

# Switch back to app directory
WORKDIR /app

# Expose production port
EXPOSE 5000

# Production command - start with Gunicorn
CMD ["python", "start_prod.py"]

# Final stage (default to production)
FROM production as final