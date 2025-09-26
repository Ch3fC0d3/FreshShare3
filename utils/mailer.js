// utils/mailer.js
// Minimal Nodemailer wrapper. If SMTP env vars are missing, it no-ops.
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  // optional dependency; will no-op if missing
  console.warn('[mailer] nodemailer is not installed; emails will be skipped');
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!nodemailer) return null;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass }
  });
}

async function send(options) {
  try {
    const transport = getTransport();
    if (!transport) {
      // No SMTP configured; log and skip.
      console.log('[mailer] SMTP not configured, skipping email:', options && options.subject);
      return { ok: false, skipped: true };
    }
    const info = await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    });
    console.log('[mailer] sent', info && info.messageId);
    return { ok: true };
  } catch (e) {
    console.error('[mailer] send error:', e && e.message);
    return { ok: false, error: e };
  }
}

module.exports = { send };
