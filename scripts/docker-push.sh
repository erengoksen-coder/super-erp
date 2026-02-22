#!/bin/bash

# Docker Hub push script for Super ERP
# Usage: ./scripts/docker-push.sh

set -e

echo "🐳 Super ERP Docker Push Script"
echo "================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker daemon is not running. Please start Docker."
    exit 1
fi

# Build the image
echo "📦 Building Docker image..."
npm run docker:build

# Check if logged in to Docker Hub
if ! docker info | grep -q "Username"; then
    echo "⚠️  Not logged in to Docker Hub. Please run: docker login"
    exit 1
fi

# Push to Docker Hub
echo "🚀 Pushing to Docker Hub..."
npm run docker:push

echo "✅ Successfully pushed to Docker Hub!"
echo ""
echo "You can now pull and run the image with:"
echo "  docker pull erengoksen/super-erp:latest"
echo "  docker-compose up -d"
