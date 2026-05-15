#!/bin/sh

echo "Starting Python detector..."
python3 python/detect.py &

echo "Starting Express backend..."
node backend/server.js