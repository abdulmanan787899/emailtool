const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const session = require('express-session');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'emailtoolsecret',
  resave: false,
  saveUninitialized: true
}));

// Serve static frontend files (index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Load scheduled emails from file
const emailDataFile = 'emails.json';
let scheduledEmails = fs.existsSync(emailDataFile)
  ? JSON.parse(fs.readFileSync(emailDataFile))
  : [];

// Save emails to file
function saveEmails() {
  fs.writeFileSync(emailDataFile, JSON.stringify(scheduledEmails, null, 2));
}

// Email sending function
async function sendEmail({ to, subject, text }) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your_email@gmail.com', // Replace with your email
      pass: 'your_app_password'     // Replace with your app password
    }
  });

  await transporter.sendMail({
    from: '"Email Tool" <your_email@gmail.com>',
    to,
    subject,
    text
  });
}

// Schedule email sending
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const toSend = scheduledEmails.filter(e => !e.sent && new Date(e.time) <= now);
  
  for (const email of toSend) {
    try {
      await sendEmail(email);
      email.sent = true;
      email.sentAt = new Date();
    } catch (err) {
      console.error('Failed to send scheduled email:', err.message);
    }
  }

  saveEmails();
});

// API routes
app.post('/schedule', (req, res) => {
  const { to, subject, text, time } = req.body;

  if (!to || !subject || !text || !time) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const email = { to, subject, text, time, sent: false };
  scheduledEmails.push(email);
  saveEmails();

  res.json({ success: true, message: 'Email scheduled' });
});

app.get('/emails', (req, res) => {
  res.json(scheduledEmails);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
