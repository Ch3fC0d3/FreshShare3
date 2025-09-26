/**
 * File-based logger with rotation and levels.
 * Writes to /logs/<filename>, rotates when file exceeds maxSize.
 */
const fs = require('fs');
const path = require('path');

class FileLogger {
  /**
   * @param {string} filename - Base filename e.g. 'orders.log'
   * @param {{ maxSizeBytes?: number, maxFiles?: number, console?: boolean }} options
   */
  constructor(filename = 'debug.log', options = {}) {
    const logsDir = path.join(__dirname, 'logs');
    try { if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true }); } catch(_) {}
    this.basePath = path.join(logsDir, filename);
    this.maxSize = Number(options.maxSizeBytes || (2 * 1024 * 1024)); // 2MB default
    this.maxFiles = Math.max(1, Number(options.maxFiles || 5));
    this.consoleEnabled = options.console !== false; // default true

    // Initialize file if missing
    try {
      if (!fs.existsSync(this.basePath)) {
        fs.writeFileSync(this.basePath, this._header());
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error initializing log file:', err);
    }
  }

  info(...args) { this._write('INFO', args, 'log'); }
  warn(...args) { this._write('WARN', args, 'warn'); }
  error(...args) { this._write('ERROR', args, 'error'); }
  debug(...args) { this._write('DEBUG', args, 'debug'); }
  // Backward compat
  log(...args) { this.info(...args); }

  logObject(label, obj) { this.info(`${label}:`, JSON.stringify(obj, null, 2)); }

  _header() {
    return `=== Log started at ${new Date().toISOString()} ===\n`;
  }

  _serialize(args) {
    return args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
  }

  _write(level, args, consoleMethod) {
    const ts = new Date().toISOString();
    const line = `[${ts}] ${level}: ${this._serialize(args)}\n`;
    try {
      this._rotateIfNeeded();
      fs.appendFileSync(this.basePath, line);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('FileLogger write failed:', err);
    }
    try {
      if (this.consoleEnabled && console && typeof console[consoleMethod] === 'function') {
        console[consoleMethod](...args);
      }
    } catch(_) {}
  }

  _rotateIfNeeded() {
    try {
      const stat = fs.existsSync(this.basePath) ? fs.statSync(this.basePath) : null;
      if (stat && stat.size >= this.maxSize) {
        // Rotate: shift .(maxFiles-1) -> .maxFiles, ..., .1 -> .2, current -> .1
        for (let i = this.maxFiles - 1; i >= 1; i--) {
          const src = `${this.basePath}.${i}`;
          const dst = `${this.basePath}.${i + 1}`;
          if (fs.existsSync(src)) {
            try { fs.renameSync(src, dst); } catch(_) {}
          }
        }
        try { fs.renameSync(this.basePath, `${this.basePath}.1`); } catch(_) {}
        // New file with header
        fs.writeFileSync(this.basePath, this._header());
      }
    } catch (_) {}
  }
}

module.exports = FileLogger;
