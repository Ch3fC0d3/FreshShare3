# Cleanup script for FreshShare project
# This will remove unnecessary files

$filesToRemove = @(
    # Duplicate server files
    "server-atlas.js",
    "server-fixed-new.js",
    "server-fixed.js",
    "simple-server.js",
    
    # MongoDB test files
    "check-mongodb-direct.js",
    "check-mongodb-new.js",
    "check-mongodb.js",
    "mongodb-connection-test.js",
    "mongodb-latest-test.js",
    "mongodb-test-updated.js",
    "test-mongodb-connection.js",
    "setup-local-mongodb.js",
    
    # Miscellaneous test files
    "dns-test.js",
    "image-upload-test.js",
    "network-test.js",
    "simple-local-db-test.js",
    "test-atlas-connection.js",
    "test-create-group.js",
    "test-usda-api.js",
    "vs-code-test.js",
    
    # Test/demo HTML pages
    "dashboard-test.html",
    "connection-test.html",
    "test-upc-browser.html",
    "usda-test.html",
    
    # Logs and test outputs
    "api-test-log.txt",
    "connection-test.log",
    "port-test.log",
    "test-output.log",
    "server-debug.log",
    "server-diagnostic.log",
    "server-diagnostics.log",
    "server-start.log",
    "server-output.log",
    "server_output.log",
    "upc-lookup.log",
    "usda_api_test_results.log",
    "usda-direct-results.log",
    "usda-demo_key-success.txt",
    
    # Duplicate config files
    "db.config.js",
    "marketplace.controller.js",
    "marketplace.routes.js",
    
    # Mock files
    "mock-auth-controller.js",
    "mock-jwt-middleware.js",
    
    # Backup files
    "views/layouts/layout.ejs.bak",
    ".env.local.new",
    "myfrovov.coreftp"
)

$removedCount = 0
$notFoundCount = 0
$errorCount = 0

Write-Host "Starting cleanup process..."

foreach ($file in $filesToRemove) {
    if (Test-Path $file) {
        try {
            Remove-Item $file -Force
            Write-Host "Removed: $file" -ForegroundColor Green
            $removedCount++
        } catch {
            Write-Host "Error removing $file : $_" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "Not found: $file" -ForegroundColor Yellow
        $notFoundCount++
    }
}

Write-Host "`nCleanup Summary:"
Write-Host "Files removed: $removedCount" -ForegroundColor Green
Write-Host "Files not found: $notFoundCount" -ForegroundColor Yellow
Write-Host "Errors encountered: $errorCount" -ForegroundColor Red
