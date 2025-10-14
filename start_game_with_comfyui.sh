#!/bin/bash

echo "========================================"
echo "    AI Roleplay Game with ComfyUI"
echo "========================================"
echo

echo "Starting ComfyUI server..."
echo "Please update the ComfyUI path below if your ComfyUI is installed elsewhere"
gnome-terminal --title="ComfyUI" -- bash -c "cd /path/to/ComfyUI && python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header; exec bash"

echo "Waiting for ComfyUI to start..."
sleep 30

echo "Starting ComfyUI API server..."
gnome-terminal --title="ComfyUI API Server" -- bash -c "cd $(pwd) && python comfyui_api_server.py; exec bash"

echo "Waiting for API server to start..."
sleep 10

echo "Starting React development server..."
gnome-terminal --title="React App" -- bash -c "cd $(pwd) && npm run dev; exec bash"

echo
echo "========================================"
echo "    All services started!"
echo "========================================"
echo
echo "ComfyUI: http://localhost:8188"
echo "API Server: http://localhost:5000"
echo "React App: http://localhost:5173"
echo
echo "Press any key to exit..."
read -n 1
