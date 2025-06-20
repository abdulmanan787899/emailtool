const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors({ origin: '*' }));
app.use(express.static(path.join(__dirname, 'public')));

// Load existing emails
const EMAILS_FILE = 'emails.json';
let scheduledEmails = [];
if (fs.existsSync(EMAILS_FILE)) {
  scheduledEmails = JSON.parse(fs.readFileSync(EMAILS_FILE));
}

// ✅ Nodemailer SMTP config (Thunderbird style)
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 587, // STARTTLS (same as Thunderbird)
  secure: false, // Use STARTTLS instead of SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    ciphers: 'SSLv3', // optional but common in desktop mail clients
    rejectUnauthorized: false // allow self-signed certs
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100
});

// Helper to save emails to file
function saveEmails() {
  fs.writeFileSync(EMAILS_FILE, JSON.stringify(scheduledEmails, null, 2));
}

// Helper to validate email
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// 🔁 Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const pending = scheduledEmails.filter(e => !e.sent && new Date(e.date) <= now);

  for (const email of pending) {
    try {
      await transporter.sendMail({
        from: `"Growzin" <${process.env.EMAIL_USER}>`,
        to: email.to,
        subject: email.subject,
        text: email.text
      });
      email.sent = true;
      email.sentAt = new Date().toISOString();
      console.log(`✅ Email sent to ${email.to}`);
    } catch (err) {
      console.error(`❌ Failed to send email to ${email.to}:`, err.message || err);
    }
  }

  saveEmails();
});

// API Routes
app.get('/health', (req, res) => res.send('OK'));

app.post('/schedule', (req, res) => {
  const { to, subject, text, date } = req.body;

  if (!to || !subject || !text || !date) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!isValidEmail(to)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const emailDate = new Date(date);
  if (isNaN(emailDate)) {
    return res.status(400).json({ error: 'Invalid date format' });
  }

  const email = {
    id: Date.now(),
    to,
    subject,
    text,
    date: emailDate.toISOString(),
    sent: false
  };

  scheduledEmails.push(email);
  saveEmails();
  res.status(201).json({ message: 'Email scheduled successfully', email });
});

app.get('/emails', (req, res) => {
  res.json(scheduledEmails);
});

// Launch server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
