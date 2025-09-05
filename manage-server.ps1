# FreshShare UPC Lookup Server Management Script
# This script provides comprehensive management for the UPC lookup server

param (
    [Parameter()]
    [ValidateSet("start", "stop", "restart", "status", "diagnose")]
    [string]$Action = "start",
    
    [Parameter()]
    [int]$Port = 3002,
    
    [Parameter()]
    [string]$ServerScript = "simplified-server.js"
)

# Set script variables
$logFile = "server-output.log"
$pidFile = "server.pid"

# Function to check if port is in use
function Test-PortInUse {
    param($Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return ($connections -ne $null)
}

# Function to find processes using a port
function Get-ProcessByPort {
    param($Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($process) {
                return $process
            }
        }
    }
    return $null
}

# Function to start the server
function Start-Server {
    Write-Host "Starting FreshShare UPC Lookup Server on port $Port..." -ForegroundColor Green
    
    # Check if port is already in use
    if (Test-PortInUse -Port $Port) {
        $process = Get-ProcessByPort -Port $Port
        if ($process) {
            Write-Host "Port $Port is already in use by process $($process.Id) ($($process.Name))" -ForegroundColor Yellow
            $choice = Read-Host "Do you want to terminate this process? (Y/N)"
            if ($choice -eq "Y" -or $choice -eq "y") {
                Stop-Process -Id $process.Id -Force
                Write-Host "Process terminated" -ForegroundColor Green
            } else {
                Write-Host "Server startup aborted" -ForegroundColor Red
                return
            }
        }
    }
    
    # Clear log file
    if (Test-Path $logFile) {
        Clear-Content $logFile
    }
    
    # Start the server
    Write-Host "Starting Node.js server with $ServerScript..." -ForegroundColor Green
    $env:PORT = $Port
    $env:NODE_ENV = "production"
    
    try {
        # Start the server process
        $process = Start-Process -FilePath "node" -ArgumentList $ServerScript -PassThru -RedirectStandardOutput $logFile -RedirectStandardError $logFile -NoNewWindow
        
        # Save the process ID
        $process.Id | Out-File $pidFile
        
        Write-Host "Server started with PID: $($process.Id)" -ForegroundColor Green
        Write-Host "Server output is being logged to: $logFile" -ForegroundColor Green
        Write-Host "Access the server at: http://localhost:$Port" -ForegroundColor Cyan
        
        # Wait a moment and check if the process is still running
        Start-Sleep -Seconds 2
        if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) {
            Write-Host "Server is running" -ForegroundColor Green
        } else {
            Write-Host "Server failed to start. Check the log file: $logFile" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Error starting server: $_" -ForegroundColor Red
    }
}

# Function to stop the server
function Stop-UpcServer {
    Write-Host "Stopping FreshShare UPC Lookup Server..." -ForegroundColor Yellow
    
    $serverPid = $null
    
    # Try to get PID from file
    if (Test-Path $pidFile) {
        $serverPid = Get-Content $pidFile
    }
    
    # If we have a PID, try to stop that process
    if ($serverPid) {
        try {
            $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
            if ($process) {
                Stop-Process -Id $serverPid -Force
                Write-Host "Server process (PID: $serverPid) terminated" -ForegroundColor Green
                Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
                return
            }
        }
        catch {
            Write-Host "Error stopping server process: $_" -ForegroundColor Red
        }
    }
    
    # If we couldn't stop by PID, try to find by port
    $process = Get-ProcessByPort -Port $Port
    if ($process) {
        try {
            Stop-Process -Id $process.Id -Force
            Write-Host "Server process (PID: $($process.Id)) terminated" -ForegroundColor Green
            Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        }
        catch {
            Write-Host "Error stopping server process: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "No server process found running on port $Port" -ForegroundColor Yellow
    }
}

# Function to check server status
function Get-ServerStatus {
    Write-Host "Checking FreshShare UPC Lookup Server status..." -ForegroundColor Cyan
    
    $serverPid = $null
    $serverRunning = $false
    
    # Try to get PID from file
    if (Test-Path $pidFile) {
        $serverPid = Get-Content $pidFile
        $process = Get-Process -Id $serverPid -ErrorAction SilentlyContinue
        if ($process) {
            $serverRunning = $true
            Write-Host "Server is running with PID: $serverPid" -ForegroundColor Green
        }
    }
    
    # Check if port is in use
    if (Test-PortInUse -Port $Port) {
        $process = Get-ProcessByPort -Port $Port
        if ($process) {
            Write-Host "Port $Port is in use by process $($process.Id) ($($process.Name))" -ForegroundColor $(if ($serverRunning) { "Green" } else { "Yellow" })
            if (-not $serverRunning) {
                Write-Host "Warning: Port is in use but not by our registered server process" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Port $Port is not in use" -ForegroundColor $(if ($serverRunning) { "Yellow" } else { "Red" })
        if ($serverRunning) {
            Write-Host "Warning: Server process is running but not listening on port $Port" -ForegroundColor Yellow
        }
    }
    
    # Check log file
    if (Test-Path $logFile) {
        $logSize = (Get-Item $logFile).Length
        $logDate = (Get-Item $logFile).LastWriteTime
        Write-Host "Log file: $logFile (Size: $([math]::Round($logSize/1KB, 2)) KB, Last updated: $logDate)" -ForegroundColor Cyan
        
        # Show last few lines of log
        Write-Host "Last 5 lines of log:" -ForegroundColor Cyan
        Get-Content $logFile -Tail 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    } else {
        Write-Host "No log file found" -ForegroundColor Yellow
    }
}

# Function to diagnose server issues
function Invoke-ServerDiagnostics {
    Write-Host "Running FreshShare UPC Lookup Server diagnostics..." -ForegroundColor Cyan
    
    # Check Node.js installation
    try {
        $nodeVersion = node --version
        Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "Node.js is not installed or not in PATH" -ForegroundColor Red
        return
    }
    
    # Check if server script exists
    if (Test-Path $ServerScript) {
        Write-Host "Server script found: $ServerScript" -ForegroundColor Green
    } else {
        Write-Host "Server script not found: $ServerScript" -ForegroundColor Red
        return
    }
    
    # Check port availability
    if (Test-PortInUse -Port $Port) {
        $process = Get-ProcessByPort -Port $Port
        Write-Host "Port $Port is in use by process $($process.Id) ($($process.Name))" -ForegroundColor Yellow
    } else {
        Write-Host "Port $Port is available" -ForegroundColor Green
    }
    
    # Check for required files
    $requiredFiles = @("server.js", "simplified-server.js", "package.json")
    foreach ($file in $requiredFiles) {
        if (Test-Path $file) {
            Write-Host "Required file found: $file" -ForegroundColor Green
        } else {
            Write-Host "Required file missing: $file" -ForegroundColor $(if ($file -eq $ServerScript) { "Red" } else { "Yellow" })
        }
    }
    
    # Check package.json for dependencies
    if (Test-Path "package.json") {
        try {
            $packageJson = Get-Content "package.json" | ConvertFrom-Json
            Write-Host "Package name: $($packageJson.name)" -ForegroundColor Cyan
            Write-Host "Dependencies:" -ForegroundColor Cyan
            
            if ($packageJson.dependencies) {
                $packageJson.dependencies.PSObject.Properties | ForEach-Object {
                    Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor Gray
                }
            } else {
                Write-Host "  No dependencies found" -ForegroundColor Yellow
            }
        }
        catch {
            Write-Host "Error parsing package.json: $_" -ForegroundColor Red
        }
    }
    
    # Check for node_modules
    if (Test-Path "node_modules") {
        Write-Host "node_modules directory found" -ForegroundColor Green
    } else {
        Write-Host "node_modules directory not found - dependencies may not be installed" -ForegroundColor Yellow
        Write-Host "Try running: npm install" -ForegroundColor Cyan
    }
    
    # Network connectivity check
    Write-Host "Testing network connectivity..." -ForegroundColor Cyan
    try {
        $testConnection = Test-NetConnection -ComputerName "localhost" -Port $Port -WarningAction SilentlyContinue
        if ($testConnection.TcpTestSucceeded) {
            Write-Host "Successfully connected to localhost:$Port" -ForegroundColor Green
        } else {
            Write-Host "Failed to connect to localhost:$Port" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "Error testing network connection: $_" -ForegroundColor Red
    }
    
    # Check for recent errors in log
    if (Test-Path $logFile) {
        Write-Host "Checking log file for errors..." -ForegroundColor Cyan
        $errorLines = Get-Content $logFile | Where-Object { $_ -match "error|exception|fail|cannot|unable" }
        if ($errorLines) {
            Write-Host "Found potential errors in log file:" -ForegroundColor Yellow
            $errorLines | Select-Object -Last 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
        } else {
            Write-Host "No obvious errors found in log file" -ForegroundColor Green
        }
    }
}

# Main script execution
switch ($Action) {
    "start" {
        Start-Server
    }
    "stop" {
        Stop-UpcServer
    }
    "restart" {
        Stop-UpcServer
        Start-Sleep -Seconds 2
        Start-Server
    }
    "status" {
        Get-ServerStatus
    }
    "diagnose" {
        Invoke-ServerDiagnostics
    }
    default {
        Write-Host "Invalid action. Use: start, stop, restart, status, or diagnose" -ForegroundColor Red
    }
}
