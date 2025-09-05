@echo off
echo Starting FreshShare UPC Lookup Server...
echo.

:: Kill any existing Node.js processes that might be using port 3002
echo Checking for existing processes on port 3002...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Found process: %%a
    taskkill /F /PID %%a
    echo Process %%a terminated
)
echo.

:: Set environment variables
set PORT=3002
set NODE_ENV=production

:: Start the server with output logging
echo Starting server on port %PORT%...
echo Logs will be saved to server-output.log
node server.js > server-output.log 2>&1

:: Note: The command window will remain open while the server is running
:: Press Ctrl+C to stop the server
