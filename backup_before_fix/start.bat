@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "PYTHON_EXE=python"
set "BACKEND_PORT=5000"

where python >nul 2>nul
if errorlevel 1 (
  echo Python not found. Please install Python and add it to PATH.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm not found. Please install Node.js and add it to PATH.
  pause
  exit /b 1
)

if not exist "%BACKEND%\.venv\Scripts\python.exe" (
  echo Creating backend virtual environment...
  "%PYTHON_EXE%" -m venv "%BACKEND%\.venv"
)

echo Installing backend dependencies...
"%BACKEND%\.venv\Scripts\python.exe" -m pip install -r "%BACKEND%\requirements.txt"
if errorlevel 1 (
  echo Backend dependency installation failed.
  pause
  exit /b 1
)

echo Installing frontend dependencies...
pushd "%FRONTEND%"
call npm install
if errorlevel 1 (
  popd
  echo Frontend dependency installation failed.
  pause
  exit /b 1
)
popd

for %%P in (5000 5001 5002 5003 5004) do (
  powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %%P -State Listen -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }"
  if not errorlevel 1 (
    set "BACKEND_PORT=%%P"
    goto port_found
  )
)

:port_found
if not "%BACKEND_PORT%"=="5000" (
  echo Port 5000 is busy, using backend port %BACKEND_PORT% instead.
)

echo Starting backend at http://127.0.0.1:%BACKEND_PORT%
start "Guzao Backend" cmd /k "set ""BACKEND_PORT=%BACKEND_PORT%"" && pushd ""%BACKEND%"" && ""%BACKEND%\.venv\Scripts\python.exe"" app.py"

echo Starting frontend at http://127.0.0.1:5173
start "Guzao Frontend" cmd /k "set ""VITE_API_BASE_URL=http://127.0.0.1:%BACKEND_PORT%"" && pushd ""%FRONTEND%"" && npm run dev"

echo Waiting for backend health check...
powershell -NoProfile -Command "$url='http://127.0.0.1:%BACKEND_PORT%/api/health'; for ($i=0; $i -lt 60; $i++) { try { $r=Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch {}; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo Backend did not respond yet. Opening frontend anyway; refresh after backend finishes starting.
) else (
  echo Backend is ready.
)
start http://127.0.0.1:5173

echo Project is starting. Close the two terminal windows to stop services.
pause
