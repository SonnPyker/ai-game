@echo off
title AI Roleplay Game - Smart Start
color 0A
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    AI Roleplay Game - Smart Start
echo ========================================
echo.

REM ========================================
REM 1. KIỂM TRA VÀ CÀI ĐẶT NODE.JS
REM ========================================
echo [1/8] Đang kiểm tra Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js chưa được cài đặt!
    echo [INFO] Vui lòng cài đặt Node.js từ: https://nodejs.org/
    echo [INFO] Sau khi cài đặt, chạy lại file này.
    pause
    exit /b 1
)

echo [SUCCESS] Node.js đã được cài đặt:
node --version

REM ========================================
REM 2. KIỂM TRA VÀ CÀI ĐẶT DEPENDENCIES
REM ========================================
echo.
echo [2/8] Đang kiểm tra dependencies...
if not exist "node_modules" (
    echo [INFO] Dependencies chưa được cài đặt. Đang cài đặt...
    echo.
    cmd /c "npm install"
    if %errorlevel% neq 0 (
        echo [ERROR] Cài đặt dependencies thất bại!
        echo [INFO] Thử chạy: npm install --force
        pause
        exit /b 1
    )
    echo [SUCCESS] Dependencies đã được cài đặt thành công!
) else (
    echo [SUCCESS] Dependencies đã sẵn sàng!
)

REM ========================================
REM 3. KIỂM TRA VÀ CÀI ĐẶT GOOGLE GEMINI AI
REM ========================================
echo.
echo [3/8] Đang kiểm tra Google Gemini AI package...
cmd /c "npm list @google/generative-ai" >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Cài đặt Google Gemini AI package...
    cmd /c "npm install @google/generative-ai"
    if %errorlevel% neq 0 (
        echo [WARNING] Không thể cài đặt Google Gemini AI package
        echo [INFO] Tính năng AI sẽ sử dụng mock service
    ) else (
        echo [SUCCESS] Google Gemini AI package đã được cài đặt!
    )
) else (
    echo [SUCCESS] Google Gemini AI package đã sẵn sàng!
)

REM ========================================
REM 4. TẠO SCRIPT TÌM PORT
REM ========================================
echo.
echo [4/8] Đang tạo script tìm port...
echo const net = require('net'); > find-port.js
echo const ports = [5173, 5174, 5175, 5176, 5177, 5178, 5179, 5180]; >> find-port.js
echo >> find-port.js
echo function findAvailablePort() { >> find-port.js
echo   return new Promise((resolve) =^> { >> find-port.js
echo     let currentIndex = 0; >> find-port.js
echo     >> find-port.js
echo     function tryPort() { >> find-port.js
echo       if (currentIndex ^>= ports.length) { >> find-port.js
echo         resolve(5173); // fallback >> find-port.js
echo         return; >> find-port.js
echo       } >> find-port.js
echo       >> find-port.js
echo       const port = ports[currentIndex]; >> find-port.js
echo       const server = net.createServer(); >> find-port.js
echo       >> find-port.js
echo       server.listen(port, () =^> { >> find-port.js
echo         server.close(() =^> { >> find-port.js
echo           console.log(port); >> find-port.js
echo           process.exit(0); >> find-port.js
echo         }); >> find-port.js
echo       }); >> find-port.js
echo       >> find-port.js
echo       server.on('error', () =^> { >> find-port.js
echo         currentIndex++; >> find-port.js
echo         tryPort(); >> find-port.js
echo       }); >> find-port.js
echo     } >> find-port.js
echo     >> find-port.js
echo     tryPort(); >> find-port.js
echo   }); >> find-port.js
echo } >> find-port.js
echo >> find-port.js
echo findAvailablePort(); >> find-port.js

REM ========================================
REM 5. TÌM PORT TRỐNG
REM ========================================
echo [5/8] Đang tìm port trống...
for /f %%i in ('node find-port.js 2^>nul') do set AVAILABLE_PORT=%%i

REM Xóa file tạm
del find-port.js 2>nul

if "%AVAILABLE_PORT%"=="" (
    echo [WARNING] Không tìm được port trống, sử dụng port mặc định 5173
    set AVAILABLE_PORT=5173
) else (
    echo [SUCCESS] Tìm thấy port trống: %AVAILABLE_PORT%
)

REM ========================================
REM 6. TẠO FILE CẤU HÌNH PORT
REM ========================================
echo.
echo [6/8] Đang tạo file cấu hình port...
echo { > port-config.json
echo   "port": %AVAILABLE_PORT%, >> port-config.json
echo   "url": "http://localhost:%AVAILABLE_PORT%", >> port-config.json
echo   "timestamp": "%date% %time%", >> port-config.json
echo   "status": "ready" >> port-config.json
echo } >> port-config.json

REM ========================================
REM 7. TẠO SCRIPT MỞ TRÌNH DUYỆT
REM ========================================
echo [7/8] Đang tạo script mở trình duyệt...
echo @echo off > open-browser.bat
echo timeout /t 3 /nobreak ^>nul >> open-browser.bat
echo start http://localhost:%AVAILABLE_PORT% >> open-browser.bat
echo del "%%~f0" >> open-browser.bat

REM ========================================
REM 8. KHỞI ĐỘNG SERVER
REM ========================================
echo.
echo [8/8] Đang khởi động server...
echo.
echo ========================================
echo    THÔNG TIN SERVER
echo ========================================
echo [INFO] Port: %AVAILABLE_PORT%
echo [INFO] URL: http://localhost:%AVAILABLE_PORT%
echo [INFO] Trạng thái: Đang khởi động...
echo ========================================
echo.

REM Mở trình duyệt sau 3 giây
start /b open-browser.bat

echo [SUCCESS] Trình duyệt sẽ tự động mở sau 3 giây...
echo [INFO] Nhấn Ctrl+C để dừng server
echo [INFO] Nếu không thấy gì, hãy thử refresh trang hoặc mở F12 để xem lỗi
echo.

REM Khởi động Vite server
cmd /c "npm run dev -- --port %AVAILABLE_PORT%"

REM Dọn dẹp file tạm
if exist "open-browser.bat" del "open-browser.bat" 2>nul
if exist "port-config.json" del "port-config.json" 2>nul

pause
