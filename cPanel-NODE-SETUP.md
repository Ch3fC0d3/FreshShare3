# cPanel Node.js Application Setup Guide

## Understanding cPanel Node.js Environment

The cPanel Node.js environment uses a specific setup that differs from standard Node.js installations:

1. Node.js is installed in a virtual environment at `~/nodevenv/freshshare1.3/14/`
2. The Node.js executable is a wrapper script at `~/nodevenv/freshshare1.3/14/bin/node`
3. The npm executable is a wrapper script at `~/nodevenv/freshshare1.3/14/bin/npm`
4. Environment variables are managed through `set_env_vars.py`

## Setting Up Your Application

### 1. Create Application Directory Structure

```bash
# Express server in public_html
mkdir -p ~/public_html

# Fastify backend in a separate directory
mkdir -p ~/fastify-backend
```

### 2. Upload Your Application Files

Use FTP or Git to upload your application files to the appropriate directories:

- Express server files to `~/public_html/`
- Fastify backend files to `~/fastify-backend/`


### 3. Create Startup Scripts

#### Express Server Startup Script (`~/public_html/start-express.sh`)

```bash
#!/bin/bash

# Set environment variables
export NODE_ENV=production
export PORT=3001

# Log startup
echo "Starting Express server..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Set path to cPanel Node.js
export PATH=$HOME/nodevenv/freshshare1.3/14/bin:$PATH

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Start the server
node server.js > express.log 2>&1 &

echo "Express server started in background. Check express.log for output."
```

#### Fastify Backend Startup Script (`~/fastify-backend/start-fastify.sh`)

```bash
#!/bin/bash

# Set environment variables
export NODE_ENV=production
export PORT=8080

# Log startup
echo "Starting Fastify backend..."

# Navigate to the project directory
cd "$(dirname "$0")"

# Set path to cPanel Node.js
export PATH=$HOME/nodevenv/freshshare1.3/14/bin:$PATH

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Check if database needs initialization
if [ ! -f "db-initialized.flag" ]; then
  echo "Initializing database..."
  node db-init.js
  
  # Create flag file to indicate database has been initialized
  touch db-initialized.flag
  echo "Database initialized."
fi

# Start the server using ts-node
npx ts-node server.ts > fastify.log 2>&1 &

echo "Fastify backend started in background. Check fastify.log for output."
```

### 4. Set Permissions

```bash
# Make scripts executable
chmod +x ~/public_html/start-express.sh
chmod +x ~/fastify-backend/start-fastify.sh
```

### 5. Start Your Applications

```bash
# Start Fastify backend first
cd ~/fastify-backend
./start-fastify.sh

# Wait a few seconds for Fastify to initialize
sleep 5

# Start Express server
cd ~/public_html
./start-express.sh
```

### 6. Verify Running Services

```bash
# Check if both services are running
ps aux | grep node

# Check logs for any errors
cat ~/public_html/express.log
cat ~/fastify-backend/fastify.log
```

## Troubleshooting

### Common Issues

1. **Command not found errors**: Make sure to set the Node.js path correctly:

   ```bash
   export PATH=$HOME/nodevenv/freshshare1.3/14/bin:$PATH
   ```

2. **Permission denied**: Ensure scripts are executable:

   ```bash
   chmod +x ~/public_html/start-express.sh
   chmod +x ~/fastify-backend/start-fastify.sh
   ```

3. **Port already in use**: Check if another process is using the same port:

   ```bash
   netstat -tulpn | grep -E '3001|8080'
   ```

4. **Missing dependencies**: Install required packages:

   ```bash
   cd ~/public_html
   npm install
   cd ~/fastify-backend
   npm install
   ```

### Restarting After Server Reboot

To ensure your applications start automatically after server reboot, add the startup commands to your cPanel cron jobs:

1. Go to cPanel > Advanced > Cron Jobs
2. Add a new cron job:

   ```bash
   @reboot ~/fastify-backend/start-fastify.sh
   ```
3. Add another cron job:

   ```bash
   @reboot sleep 10 && ~/public_html/start-express.sh
   ```

This will ensure both services start automatically whenever the server reboots.

## Emergency Fix for 503 Errors

If you're experiencing 503 errors and need a quick solution, you can use the mock server approach:

```bash
# Set Node.js path for cPanel environment
export PATH=$HOME/nodevenv/freshshare1.3/14/bin:$PATH

# Create simplified startup scripts
cat > ~/public_html/cpanel-start.sh << 'EOF'
#!/bin/bash
export PATH=$HOME/nodevenv/freshshare1.3/14/bin:$PATH
export NODE_ENV=production
export PORT=3001
cd ~/public_html
node proxy-server.js > proxy.log 2>&1 &
echo "Proxy server started"
EOF

cat > ~/public_html/cpanel-mock.sh << 'EOF'
#!/bin/bash
export PATH=$HOME/nodevenv/freshshare1.3/14/bin:$PATH
export NODE_ENV=production
export PORT=8080
cd ~/public_html
node mock-fastify-server.js > mock.log 2>&1 &
echo "Mock server started"
EOF

# Make scripts executable
chmod +x ~/public_html/cpanel-start.sh
chmod +x ~/public_html/cpanel-mock.sh

# Start the servers
cd ~/public_html
./cpanel-mock.sh
sleep 3
./cpanel-start.sh

# Verify servers are running
ps aux | grep node
```

This approach uses a mock Fastify server and a proxy server to get your site back online quickly without requiring the full application stack.

### Setting Up Automatic Restart for Emergency Fix

To ensure the emergency fix servers restart automatically after a server reboot:

1. Go to cPanel > Advanced > Cron Jobs
2. Add these cron jobs:

   ```bash
   @reboot ~/public_html/cpanel-mock.sh
   @reboot sleep 5 && ~/public_html/cpanel-start.sh
   ```
