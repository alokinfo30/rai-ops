#!/bin/bash

# Stop existing containers
docker-compose down

# Build frontend
cd frontend
npm install
npm run build
cd ..

# Build backend and infrastructure
docker-compose build

# Start services in detached mode
docker-compose up -d

echo "Deployment complete. Application running on port 80."
echo "Health check: http://localhost/health"