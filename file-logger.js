/**
 * File-based logger for debugging USDA API integration issues
 * This module ensures logs get captured even if console output is not visible
 */
const fs = require('fs');
const path = require('path');

class FileLogger {
  constructor(filename = 'debug.log') {
    this.logPath = path.join(__dirname, filename);
    this.buffer = '';
    
    // Create or clear log file
    try {
      fs.writeFileSync(this.logPath, '=== Log started at ' + new Date().toISOString() + ' ===\n\n');
      console.log(`FileLogger initialized: ${this.logPath}`);
    } catch (err) {
      console.error('Error initializing log file:', err);
    }
  }
  
  log(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] INFO: ${message}\n`;
    
    // Output to console and write to file
    console.log(message);
    this._writeToFile(logEntry);
  }
  
  error(...args) {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR: ${message}\n`;
    
    // Output to console and write to file
    console.error(message);
    this._writeToFile(logEntry);
  }
  
  _writeToFile(message) {
    try {
      // Append to the log file
      fs.appendFileSync(this.logPath, message);
      
      // For debugging: create a marker file to prove the logger is working
      fs.writeFileSync(path.join(__dirname, 'logger-active.txt'), 'Logger is active');
    } catch (err) {
      console.error('Error writing to log file:', err);
    }
  }
  
  // Helper to log objects
  logObject(label, obj) {
    this.log(`${label}:`, JSON.stringify(obj, null, 2));
  }
}

module.exports = FileLogger;
