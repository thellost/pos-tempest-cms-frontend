#!/bin/bash
set -e

# Configuration
IMAGE_NAME="pos-tempest-cms-frontend"
CONTAINER_NAME="pos-tempest-cms-frontend"
NETWORK_NAME="supabase_default"
ENV_FILE=".env"
PORT=3000

# --- Build image ---
echo "Building Docker image..."
docker build -t "$IMAGE_NAME" .

# --- Stop & remove existing container if running ---
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing container..."
  docker rm -f "$CONTAINER_NAME"
fi

# --- Run container ---
echo "Starting container on network '$NETWORK_NAME'..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --network "$NETWORK_NAME" \
  --env-file "$ENV_FILE" \
  -p "5003:$PORT" \
  --restart unless-stopped \
  "$IMAGE_NAME"

echo "Done. Container '$CONTAINER_NAME' running on port $PORT."
