@echo off
echo ========================================
echo    AI Roleplay Game with ComfyUI
echo ========================================
echo.

echo Starting ComfyUI server...
start "ComfyUI" cmd /k "cd /d "D:\ComfyUI\ComfyUI_windows_portable" && run_nvidia_gpu.bat"

echo Waiting for ComfyUI to start...
timeout /t 30 /nobreak

echo Starting ComfyUI API server...
start "ComfyUI API Server" cmd /k "cd /d "D:\AI-game-test-2" && python comfyui_api_server.py"

echo Waiting for API server to start...
timeout /t 10 /nobreak

echo Starting React development server...
start "React App" cmd /k "cd /d "D:\AI-game-test-2" && npm run dev"

echo.
echo ========================================
echo    All services started!
echo ========================================
echo.
echo ComfyUI: http://localhost:8188
echo API Server: http://localhost:5000
echo React App: http://localhost:5173
echo.
echo Press any key to exit...
pause > nul