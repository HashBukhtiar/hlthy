@echo off
REM HLTHY Coach Docker Deployment Script for Windows

setlocal EnableDelayedExpansion

echo 🏋️ HLTHY Coach - Docker Deployment
echo ==================================

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop and try again.
    exit /b 1
)

REM Parse command line arguments
set ACTION=%1
if "%ACTION%"=="" set ACTION=build

if "%ACTION%"=="build" (
    echo [INFO] Building HLTHY Coach Docker image...
    docker build -t hlthy-coach:latest .
    echo [INFO] Build complete! ✅
    goto :end
)

if "%ACTION%"=="run" (
    echo [INFO] Starting HLTHY Coach container...
    docker-compose up -d
    echo [INFO] Container started! ✅
    echo [INFO] API available at: http://localhost:5001
    echo [INFO] Health check: http://localhost:5001/api/health
    goto :end
)

if "%ACTION%"=="stop" (
    echo [INFO] Stopping HLTHY Coach container...
    docker-compose down
    echo [INFO] Container stopped! ✅
    goto :end
)

if "%ACTION%"=="restart" (
    echo [INFO] Restarting HLTHY Coach...
    docker-compose down
    docker build -t hlthy-coach:latest .
    docker-compose up -d
    echo [INFO] Restart complete! ✅
    goto :end
)

if "%ACTION%"=="logs" (
    echo [INFO] Showing container logs...
    docker-compose logs -f hlthy-coach
    goto :end
)

if "%ACTION%"=="test" (
    echo [INFO] Running API tests...
    timeout /t 5 /nobreak >nul
    curl -f http://localhost:5001/api/health
    if %ERRORLEVEL% equ 0 (
        echo [INFO] API is healthy! ✅
    ) else (
        echo [ERROR] Health check failed!
        exit /b 1
    )
    goto :end
)

if "%ACTION%"=="deploy" (
    echo [INFO] Full deployment pipeline...
    echo [INFO] 1. Building image...
    docker build -t hlthy-coach:latest .
    
    echo [INFO] 2. Starting services...
    docker-compose up -d
    
    echo [INFO] 3. Waiting for startup...
    timeout /t 10 /nobreak >nul
    
    echo [INFO] 4. Health check...
    for /l %%i in (1,1,5) do (
        curl -f http://localhost:5001/api/health >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            echo [INFO] Deployment successful! ✅
            echo [INFO] API available at: http://localhost:5001
            goto :end
        )
        echo [WARN] Waiting for service to start... ^(attempt %%i/5^)
        timeout /t 5 /nobreak >nul
    )
    
    echo [ERROR] Deployment failed - health check timeout
    docker-compose logs hlthy-coach
    exit /b 1
)

if "%ACTION%"=="clean" (
    echo [INFO] Cleaning up Docker resources...
    docker-compose down
    docker rmi hlthy-coach:latest 2>nul
    docker system prune -f
    echo [INFO] Cleanup complete! ✅
    goto :end
)

REM Default help
echo Usage: %0 {build^|run^|stop^|restart^|logs^|test^|deploy^|clean}
echo.
echo Commands:
echo   build   - Build the Docker image
echo   run     - Start the container with docker-compose
echo   stop    - Stop the container
echo   restart - Rebuild and restart the container
echo   logs    - Show container logs
echo   test    - Test API health
echo   deploy  - Full deployment with health checks
echo   clean   - Remove containers and clean up

:end
endlocal
