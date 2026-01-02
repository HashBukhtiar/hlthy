@echo off
REM HLTHY Coach - Google Cloud Production Deployment Script (Windows)

setlocal EnableDelayedExpansion

echo 🏋️ HLTHY Coach - Production Deployment to Google Cloud
echo ====================================================

REM Check if gcloud is installed
where gcloud >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Google Cloud CLI ^(gcloud^) is not installed.
    echo [ERROR] Please install it from: https://cloud.google.com/sdk/docs/install
    exit /b 1
)

REM Check if user is authenticated
for /f "tokens=*" %%i in ('gcloud auth list --filter=status:ACTIVE --format="value(account)"') do set ACTIVE_ACCOUNT=%%i
if "!ACTIVE_ACCOUNT!"=="" (
    echo [ERROR] Not authenticated with Google Cloud.
    echo [ERROR] Please run: gcloud auth login
    exit /b 1
)

REM Get current project
for /f "tokens=*" %%i in ('gcloud config get-value project 2^>nul') do set PROJECT_ID=%%i
if "!PROJECT_ID!"=="" (
    echo [ERROR] No Google Cloud project set.
    echo [ERROR] Please run: gcloud config set project YOUR_PROJECT_ID
    exit /b 1
)

echo [INFO] Using Google Cloud project: !PROJECT_ID!

REM Parse command line arguments
set ACTION=%1
if "!ACTION!"=="" set ACTION=deploy

if "!ACTION!"=="build" (
    echo [STEP] Building and pushing Docker image to Google Cloud...
    gcloud builds submit --config cloudbuild.yaml .
    if !errorlevel! neq 0 (
        echo [ERROR] Build failed!
        exit /b 1
    )
    echo [INFO] Build complete! ✅
) else if "!ACTION!"=="deploy" (
    echo [STEP] Deploying HLTHY Coach to Google Cloud Run...
    
    echo [INFO] 1. Building and pushing image...
    gcloud builds submit --config cloudbuild.yaml .
    if !errorlevel! neq 0 (
        echo [ERROR] Build failed!
        exit /b 1
    )
    
    echo [INFO] 2. Deployment complete! ✅
    
    REM Get the service URL
    for /f "tokens=*" %%i in ('gcloud run services describe hlthy-ai-service --region=northamerica-northeast2 --format="value(status.url)"') do set SERVICE_URL=%%i
    
    echo [INFO] 🚀 Service deployed successfully!
    echo [INFO] 📡 Service URL: !SERVICE_URL!
    echo [INFO] 🏥 Health check: !SERVICE_URL!/api/health
    echo [INFO] 🧠 Intent classification: !SERVICE_URL!/api/classify-intent
    
    echo [STEP] Testing deployment...
    timeout /t 10 > nul
    
    curl -f "!SERVICE_URL!/api/health" > nul 2>&1
    if !errorlevel! equ 0 (
        echo [INFO] ✅ Health check passed!
        echo [INFO] 🎉 Deployment fully successful!
    ) else (
        echo [ERROR] ❌ Health check failed
        exit /b 1
    )
) else if "!ACTION!"=="status" (
    echo [STEP] Checking service status...
    gcloud run services describe hlthy-ai-service --region=northamerica-northeast2 --format="table(metadata.name,status.url,status.conditions[0].type,status.conditions[0].status)"
) else if "!ACTION!"=="logs" (
    echo [STEP] Showing service logs...
    gcloud logs read "resource.type=cloud_run_revision AND resource.labels.service_name=hlthy-ai-service" --limit=50 --format="table(timestamp,textPayload)"
) else if "!ACTION!"=="rollback" (
    echo [STEP] Rolling back to previous version...
    gcloud run services update-traffic hlthy-ai-service --to-revisions=LATEST=0,hlthy-ai-service-previous=100 --region=northamerica-northeast2
    echo [INFO] Rollback complete! ✅
) else if "!ACTION!"=="delete" (
    echo [WARN] This will DELETE the hlthy-ai-service from Google Cloud Run!
    set /p CONFIRM="Are you sure? (yes/no): "
    if /i "!CONFIRM!"=="yes" (
        gcloud run services delete hlthy-ai-service --region=northamerica-northeast2 --quiet
        echo [INFO] Service deleted! ✅
    ) else (
        echo [INFO] Deletion cancelled.
    )
) else (
    echo Usage: %0 {build^|deploy^|status^|logs^|rollback^|delete}
    echo.
    echo Commands:
    echo   build     - Build and push Docker image to Google Cloud
    echo   deploy    - Full deployment to Google Cloud Run ^(default^)
    echo   status    - Check service status
    echo   logs      - Show recent service logs
    echo   rollback  - Rollback to previous version
    echo   delete    - Delete the service
    echo.
    echo Prerequisites:
    echo   - Google Cloud CLI installed and authenticated
    echo   - Project ID configured: gcloud config set project YOUR_PROJECT_ID
    exit /b 1
)

echo.
echo 🎉 Script completed successfully!
