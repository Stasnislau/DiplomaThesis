@echo off
setlocal EnableDelayedExpansion

:: Colors for better visibility
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "NC=[0m"

echo %YELLOW%Starting the entire project...%NC%

:: Check for required tools
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%Error: npm is not installed. What the hell? Install it first!%NC%
    exit /b 1
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo %RED%Error: node is not installed. Are you kidding me? Install it first!%NC%
    exit /b 1
)

:: Start Backend services
echo %GREEN%Starting Gateway Microservice...%NC%
start cmd /k "cd Backend\GatewayMicroservice && npm install && npm run dev"

echo %GREEN%Starting Auth Microservice...%NC%
start cmd /k "cd Backend\AuthMicroservice && npm install && npm run dev"

echo %GREEN%Starting User Microservice...%NC%
start cmd /k "cd Backend\UserMicroservice && npm install && npm run dev"

echo %GREEN%Starting Bridge Microservice...%NC%
start cmd /k "cd Backend\BridgeMicroservice && uvicorn bridgemicroservice.main:app --reload --port 3003"

:: Wait a bit to ensure services start in the correct order
timeout /t 5 /nobreak

:: Start Frontend
echo %GREEN%Starting Frontend...%NC%
start cmd /k "cd Frontend && npm install && npm run dev"

echo %YELLOW%All services have been started. Close all command windows to stop the project.%NC%
