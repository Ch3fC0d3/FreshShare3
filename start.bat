@echo off
setlocal

REM Stop processes holding ports 3001 and 3002
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3001"') do (
    echo Terminating process on port 3001 (PID %%p)
    taskkill /PID %%p /F >nul 2>&1
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3002"') do (
    echo Terminating process on port 3002 (PID %%p)
    taskkill /PID %%p /F >nul 2>&1
)

REM Start the FreshShare development server
pushd "%~dp0"
call npm install
call npm run dev
popd

endlocal
