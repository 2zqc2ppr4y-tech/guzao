@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "PYTHON_EXE=python"
set "BACKEND_PORT="

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未检测到 Python，请安装 Python 并添加到 PATH 后重试。
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] 未检测到 npm，请安装 Node.js 并添加到 PATH 后重试。
  pause
  exit /b 1
)

if not exist "%BACKEND%\.venv\Scripts\python.exe" (
  echo 正在创建后端虚拟环境...
  "%PYTHON_EXE%" -m venv "%BACKEND%\.venv"
  if errorlevel 1 (
    echo [ERROR] 虚拟环境创建失败。
    pause
    exit /b 1
  )
)

echo 正在安装后端依赖（首次运行可能较慢）...
"%BACKEND%\.venv\Scripts\python.exe" -m pip install -q -r "%BACKEND%\requirements.txt"
if errorlevel 1 (
  echo [ERROR] 后端依赖安装失败，请检查网络或 requirements.txt。
  pause
  exit /b 1
)

echo 正在安装前端依赖...
pushd "%FRONTEND%"
call npm install --silent
if errorlevel 1 (
  popd
  echo [ERROR] 前端依赖安装失败，请检查 Node.js 和网络连接。
  pause
  exit /b 1
)
popd

echo 正在检测可用端口（5000-5004）...
for %%P in (5000 5001 5002 5003 5004) do (
  if "!BACKEND_PORT!"=="" (
    powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %%P -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }" >nul 2>nul
    if not errorlevel 1 set "BACKEND_PORT=%%P"
  )
)

if "!BACKEND_PORT!"=="" (
  echo.
  echo [ERROR] 5000-5004 端口均被占用，无法启动后端服务。
  echo 请关闭占用相关端口的程序后重试。
  echo 可用以下命令查找占用进程：
  echo   netstat -ano ^| findstr ":5000"
  echo   netstat -ano ^| findstr ":5001"
  pause
  exit /b 1
)

if not "!BACKEND_PORT!"=="5000" (
  echo 端口 5000 已被占用，将使用备用端口 !BACKEND_PORT!
)

echo.
echo =====================================================
echo   后端地址：http://127.0.0.1:!BACKEND_PORT!
echo   前端地址：http://127.0.0.1:5173
echo   健康检查：http://127.0.0.1:!BACKEND_PORT!/api/health
echo =====================================================
echo.

echo 正在启动后端服务...
start "Guzao Backend" cmd /k "title 鼓藻平台-后端 && set BACKEND_PORT=!BACKEND_PORT! && pushd ""%BACKEND%"" && ""%BACKEND%\.venv\Scripts\python.exe"" app.py"

echo 正在启动前端服务...
start "Guzao Frontend" cmd /k "title 鼓藻平台-前端 && set VITE_API_BASE_URL=http://127.0.0.1:!BACKEND_PORT! && pushd ""%FRONTEND%"" && npm run dev"

echo 等待后端启动（最多 60 秒）...
set "HEALTH_URL=http://127.0.0.1:!BACKEND_PORT!/api/health"
powershell -NoProfile -Command "$url='!HEALTH_URL!'; for ($i=0;$i -lt 60;$i++) { try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($r.StatusCode -eq 200) { Write-Host '后端已就绪'; exit 0 } } catch {}; Start-Sleep -Seconds 1 }; Write-Host '超时，后端可能仍在加载模型，请稍后刷新前端'; exit 0"

start http://127.0.0.1:5173

echo.
echo 平台已启动，关闭两个命令行窗口即可停止服务。
pause
