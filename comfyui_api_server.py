#!/usr/bin/env python3
"""
ComfyUI API Server
Bridges ComfyUI with the React frontend for image generation
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import json
import base64
import io
from PIL import Image
import uuid
import time
import os
import threading
import queue
from typing import Dict, Any, Optional

app = Flask(__name__)
CORS(app)

# Configuration
COMFYUI_URL = "http://127.0.0.1:8188"
OUTPUT_DIR = "generated_images"
MAX_QUEUE_SIZE = 10
REQUEST_TIMEOUT = 300  # 5 minutes

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

class ComfyUIAPI:
    def __init__(self, base_url: str = COMFYUI_URL):
        self.base_url = base_url
        self.client_id = str(uuid.uuid4())
        
    def is_connected(self) -> bool:
        """Check if ComfyUI server is running"""
        try:
            response = requests.get(f"{self.base_url}/system_stats", timeout=5)
            return response.status_code == 200
        except:
            return False
    
    def get_queue_info(self) -> Dict[str, Any]:
        """Get current queue status"""
        try:
            response = requests.get(f"{self.base_url}/queue")
            return response.json()
        except:
            return {"queue_pending": [], "queue_running": []}
    
    def submit_workflow(self, workflow: Dict[str, Any]) -> str:
        """Submit workflow to ComfyUI and return prompt ID"""
        try:
            payload = {
                "prompt": workflow,
                "client_id": self.client_id
            }
            response = requests.post(f"{self.base_url}/prompt", json=payload)
            response.raise_for_status()
            return response.json()["prompt_id"]
        except Exception as e:
            raise Exception(f"Failed to submit workflow: {str(e)}")
    
    def get_history(self, prompt_id: str) -> Optional[Dict[str, Any]]:
        """Get generation history for a prompt ID"""
        try:
            response = requests.get(f"{self.base_url}/history/{prompt_id}")
            if response.status_code == 200:
                return response.json()
            return None
        except:
            return None
    
    def get_image(self, filename: str) -> Optional[bytes]:
        """Download generated image from ComfyUI"""
        try:
            response = requests.get(f"{self.base_url}/view?filename={filename}")
            if response.status_code == 200:
                return response.content
            return None
        except:
            return None

# Initialize ComfyUI API
comfyui = ComfyUIAPI()

def create_text_to_image_workflow(
    prompt: str, 
    negative_prompt: str, 
    width: int, 
    height: int, 
    steps: int = 20, 
    cfg_scale: float = 7.0, 
    seed: int = -1
) -> Dict[str, Any]:
    """Create a ComfyUI workflow for text-to-image generation"""
    
    if seed == -1:
        seed = int(time.time() * 1000) % 1000000
    
    workflow = {
        "1": {
            "inputs": {
                "ckpt_name": "novaAnimeXL_ilV120.safetensors"
            },
            "class_type": "CheckpointLoaderSimple"
        },
        "2": {
            "inputs": {
                "text": prompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "3": {
            "inputs": {
                "text": negative_prompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "4": {
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            },
            "class_type": "EmptyLatentImage"
        },
        "5": {
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg_scale,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0]
            },
            "class_type": "KSampler"
        },
        "6": {
            "inputs": {
                "samples": ["5", 0],
                "vae": ["1", 2]
            },
            "class_type": "VAEDecode"
        },
        "7": {
            "inputs": {
                "filename_prefix": "ComfyUI_Game",
                "images": ["6", 0]
            },
            "class_type": "SaveImage"
        }
    }
    
    return workflow

def wait_for_completion(prompt_id: str, timeout: int = REQUEST_TIMEOUT) -> Optional[Dict[str, Any]]:
    """Wait for ComfyUI to complete the generation"""
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        history = comfyui.get_history(prompt_id)
        
        if history and prompt_id in history:
            prompt_data = history[prompt_id]
            
            # Check if generation is complete
            if "status" in prompt_data and prompt_data["status"].get("status_str") == "success":
                return prompt_data
            elif "status" in prompt_data and prompt_data["status"].get("status_str") == "error":
                raise Exception(f"Generation failed: {prompt_data['status'].get('status_str', 'Unknown error')}")
        
        time.sleep(1)  # Wait 1 second before checking again
    
    raise Exception("Generation timeout")

def save_image_to_local(image_data: bytes, filename: str) -> str:
    """Save image to local directory and return file path"""
    filepath = os.path.join(OUTPUT_DIR, filename)
    
    with open(filepath, 'wb') as f:
        f.write(image_data)
    
    return filepath

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    is_connected = comfyui.is_connected()
    
    return jsonify({
        "status": "healthy" if is_connected else "unhealthy",
        "comfyui_connected": is_connected,
        "timestamp": int(time.time())
    })

@app.route('/generate', methods=['POST'])
def generate_image():
    """Generate image from text prompt"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        # Extract parameters
        prompt = data.get('prompt', '')
        negative_prompt = data.get('negative_prompt', 'blurry, low quality, distorted, deformed, ugly, bad anatomy, text, watermark, signature')
        width = data.get('width', 1280)
        height = data.get('height', 720)
        steps = data.get('steps', 20)
        cfg_scale = data.get('cfg_scale', 7.0)
        seed = data.get('seed', -1)
        
        if not prompt:
            return jsonify({"success": False, "error": "Prompt is required"}), 400
        
        # Check if ComfyUI is connected
        if not comfyui.is_connected():
            return jsonify({"success": False, "error": "ComfyUI server not available"}), 503
        
        # Create workflow
        workflow = create_text_to_image_workflow(
            prompt, negative_prompt, width, height, steps, cfg_scale, seed
        )
        
        # Submit workflow
        prompt_id = comfyui.submit_workflow(workflow)
        
        # Wait for completion
        result = wait_for_completion(prompt_id)
        
        if not result or "outputs" not in result:
            return jsonify({"success": False, "error": "Generation failed"}), 500
        
        # Get generated image
        outputs = result["outputs"]
        if "7" not in outputs or "images" not in outputs["7"]:
            return jsonify({"success": False, "error": "No image generated"}), 500
        
        image_info = outputs["7"]["images"][0]
        filename = image_info["filename"]
        
        # Download image
        image_data = comfyui.get_image(filename)
        if not image_data:
            return jsonify({"success": False, "error": "Failed to download image"}), 500
        
        # Convert to base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        # Save to local directory
        local_filename = f"game_{int(time.time())}.png"
        filepath = save_image_to_local(image_data, local_filename)
        
        return jsonify({
            "success": True,
            "image": image_base64,
            "filename": local_filename,
            "filepath": filepath,
            "prompt_id": prompt_id,
            "generation_time": time.time()
        })
        
    except Exception as e:
        print(f"Error generating image: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/status', methods=['GET'])
def get_status():
    """Get ComfyUI server status and queue info"""
    try:
        is_connected = comfyui.is_connected()
        queue_info = comfyui.get_queue_info() if is_connected else None
        
        return jsonify({
            "comfyui_connected": is_connected,
            "queue_info": queue_info,
            "timestamp": int(time.time())
        })
    except Exception as e:
        return jsonify({
            "comfyui_connected": False,
            "error": str(e),
            "timestamp": int(time.time())
        }), 500

@app.route('/queue', methods=['GET'])
def get_queue():
    """Get current queue status"""
    try:
        if not comfyui.is_connected():
            return jsonify({"error": "ComfyUI not connected"}), 503
        
        queue_info = comfyui.get_queue_info()
        return jsonify(queue_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting ComfyUI API Server...")
    print(f"ComfyUI URL: {COMFYUI_URL}")
    print(f"Output Directory: {OUTPUT_DIR}")
    print(f"Server will run on: http://localhost:5001")
    print()
    
    # Check ComfyUI connection
    if comfyui.is_connected():
        print("ComfyUI server is connected")
    else:
        print("ComfyUI server is not connected - please start ComfyUI first")
        print("Run: run_nvidia_gpu.bat")
    
    print()
    print("Available endpoints:")
    print("   GET  /health     - Health check")
    print("   POST /generate   - Generate image")
    print("   GET  /status     - Server status")
    print("   GET  /queue      - Queue status")
    print()
    
    app.run(host='0.0.0.0', port=5001, debug=True)
