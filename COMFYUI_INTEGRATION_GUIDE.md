# ComfyUI Integration Guide

## Tổng quan

Hệ thống đã được tích hợp ComfyUI để tự động tạo ảnh minh họa cho game. ComfyUI sẽ tạo ảnh dựa trên nội dung game và hiển thị trong chat.

## Cài đặt

### 1. Cài đặt ComfyUI

1. Tải ComfyUI từ: https://github.com/comfyanonymous/ComfyUI
2. Cài đặt ComfyUI ở bất kỳ đâu trên máy (ví dụ: `C:\ComfyUI\` hoặc `D:\ComfyUI\`)
3. Tải model Stable Diffusion (v1-5-pruned-emaonly.ckpt) vào thư mục `models/checkpoints/`
4. **Lưu ý**: ComfyUI không cần phải trong cùng thư mục với game!

### 2. Cài đặt Python Dependencies

```bash
pip install -r requirements.txt
```

### 3. Khởi động hệ thống

#### Windows:
```bash
start_game_with_comfyui.bat
```

#### Linux/Mac:
```bash
./start_game_with_comfyui.sh
```

## Cấu hình

### 1. ComfyUI Settings

Vào Settings > ComfyUI để cấu hình:

- **Enable/Disable**: Bật/tắt ComfyUI
- **Resolution**: Chọn độ phân giải ảnh (16:9)
  - 640x360 (nHD)
  - 854x480 (FWVGA) 
  - 1280x720 (HD) - Mặc định
  - 1920x1080 (Full HD)
- **Server URL**: URL của ComfyUI API server (mặc định: http://localhost:5000)

### 2. ComfyUI Server

ComfyUI server chạy trên port 8188:
```bash
# Sử dụng file batch có sẵn (khuyến nghị)
run_nvidia_gpu.bat

# Hoặc chạy trực tiếp (không khuyến nghị)
python main.py --listen 0.0.0.0 --port 8188 --enable-cors-header
```

### 3. API Server

ComfyUI API server chạy trên port 5000:
```bash
python comfyui_api_server.py
```

## Tính năng

### 1. Image Generation

- **Opening Message**: Tự động tạo ảnh cho tin nhắn mở đầu
- **AI Responses**: Tự động tạo ảnh cho mỗi phản hồi AI
- **Parallel Processing**: Image generation chạy song song, không ảnh hưởng tốc độ game

### 2. Prompt Extraction

- Sử dụng Gemini AI để extract visual prompts từ nội dung game
- Tự động tạo positive và negative prompts
- Cache prompts để tránh regenerate

### 3. Image Storage

- Lưu ảnh local trong thư mục `generated_images/`
- Tự động cleanup khi vượt quá 100 ảnh
- Lưu đường dẫn ảnh trong save game

### 4. UI Integration

- Hiển thị ảnh trong chat messages
- Show/hide prompt details
- Error handling khi ảnh không load được

## API Endpoints

### Health Check
```
GET /health
```

### Generate Image
```
POST /generate
{
  "prompt": "fantasy scene...",
  "negative_prompt": "blurry, low quality...",
  "width": 1280,
  "height": 720,
  "steps": 20,
  "cfg_scale": 7.0,
  "seed": -1
}
```

### Server Status
```
GET /status
```

### Queue Status
```
GET /queue
```

## Troubleshooting

### 1. ComfyUI không kết nối được

- Kiểm tra ComfyUI có chạy trên port 8188 không
- Kiểm tra firewall settings
- Restart ComfyUI server

### 2. API Server lỗi

- Kiểm tra Python dependencies đã cài đặt chưa
- Kiểm tra port 5000 có bị chiếm không
- Xem log trong console

### 3. Image generation fail

- Kiểm tra ComfyUI model đã tải chưa
- Kiểm tra GPU memory
- Thử giảm resolution

### 4. Ảnh không hiển thị

- Kiểm tra file ảnh có tồn tại không
- Kiểm tra quyền truy cập file
- Clear browser cache

## Performance

### 1. Optimization

- Image generation chạy parallel
- Cache prompts và images
- Lazy loading cho ảnh cũ
- Auto cleanup old images

### 2. Resource Usage

- GPU memory: ~4-8GB (tùy resolution)
- RAM: ~2-4GB
- Storage: ~100MB per 100 images

## Development

### 1. Custom Workflows

Chỉnh sửa `create_text_to_image_workflow()` trong `comfyui_api_server.py` để tùy chỉnh workflow.

### 2. Custom Prompts

Chỉnh sửa `buildPositivePrompt()` và `buildNegativePrompt()` trong `promptExtractionService.ts`.

### 3. Custom UI

Chỉnh sửa `ComfyUISettings.tsx` để thêm settings mới.

## File Structure

```
src/
├── services/
│   ├── comfyUIService.ts          # ComfyUI service
│   ├── imageStorageService.ts     # Image storage service
│   └── promptExtractionService.ts # Prompt extraction service
├── components/Settings/
│   └── ComfyUISettings.tsx       # ComfyUI settings UI
├── pages/
│   ├── GamePage.tsx              # Main game page with image display
│   └── SettingsPage.tsx          # Settings page with ComfyUI tab
└── types/
    ├── index.ts                  # ComfyUI types
    └── saveGame.ts              # Save game with ComfyUI data

comfyui_api_server.py             # Python API server
start_game_with_comfyui.bat       # Windows startup script
start_game_with_comfyui.sh        # Linux/Mac startup script
requirements.txt                  # Python dependencies
```

## Changelog

### v1.0.0
- Tích hợp ComfyUI vào game
- Tự động tạo ảnh cho opening message và AI responses
- Settings UI cho ComfyUI configuration
- Image storage và management
- Save/load ComfyUI settings
- Error handling và fallback logic
