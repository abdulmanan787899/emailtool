const express = require('express');
const session = require('express-session');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();

app.use(cors({
  origin: 'http://localhost:3000',  // change or add your frontend URL for deployment
  credentials: true
}));

app.use(express.json());
app.use(express.static('public')); // serve frontend files from public folder

// --- SESSION SETUP ---
app.use(session({
  secret: 'supersecretkey123!',  // use env var in production
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
}));

// --- USERS (in-memory demo) ---
const users = [];

// --- EMAILS STORAGE ---
const EMAIL_FILE = path.join(__dirname, 'emails.json');
let emails = fs.existsSync(EMAIL_FILE) ? JSON.parse(fs.readFileSync(EMAIL_FILE)) : [];

function saveEmails() {
  fs.writeFileSync(EMAIL_FILE, JSON.stringify(emails, null, 2));
}

// --- AUTH ROUTES ---

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  users.push({ username, password });
  res.json({ message: 'Registration successful' });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  req.session.user = { username };
  res.json({ message: 'Login successful', username });
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out successfully' });
  });
});

function authMiddleware(req, res, next) {
  if (req.session.user) next();
  else res.status(401).json({ error: 'Unauthorized' });
}

// --- EMAIL ROUTES ---

app.post('/send-email', authMiddleware, (req, res) => {
  const { to, subject, text, from } = req.body;
  if (!to || !subject || !text) return res.status(400).json({ error: 'Missing required fields' });

  const mailOptions = {
    from: from || 'info@growzin.com',
    to,
    subject,
    text
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('❌ Error sending email:', error);
      return res.status(500).send('Failed to send email');
    }

    const email = {
      id: Date.now(),
      sender: mailOptions.from,
      recipient: to,
      subject,
      content: text,
      status: 'sent',
      sentTime: new Date().toISOString(),
      opened: false
    };

    emails.push(email);
    saveEmails();

    console.log('✅ Email sent immediately:', info.response);
    res.json({ message: 'Email sent successfully' });
  });
});

app.post('/schedule-email', authMiddleware, (req, res) => {
  const { sender, recipient, subject, content, scheduledTime } = req.body;
  if (!recipient || !subject || !content || !scheduledTime) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const email = {
    id: Date.now(),
    sender: sender || 'info@growzin.com',
    recipient,
    subject,
    content,
    status: 'pending',
    scheduledTime,
    opened: false
  };

  emails.push(email);
  saveEmails();

  console.log(`📅 Email scheduled for ${scheduledTime} to ${recipient}`);
  res.json({ message: 'Email scheduled successfully' });
});

app.get('/emails', authMiddleware, (req, res) => {
  res.json(emails);
});

// --- Nodemailer Transporter ---
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'info@growzin.com',
    pass: 'Growzin786#' // Use environment variables in production
  }
});

// --- Cron job to send scheduled emails every 10 seconds ---
cron.schedule('*/10 * * * * *', () => {
  const now = new Date();
  emails.forEach((email, index) => {
    if (email.status === 'pending' && new Date(email.scheduledTime) <= now) {
      const mailOptions = {
        from: email.sender || 'info@growzin.com',
        to: email.recipient,
        subject: email.subject,
        text: email.content,
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`❌ Failed to send scheduled email to ${email.recipient}:`, error);
          return;
        }

        emails[index].status = 'sent';
        emails[index].sentTime = new Date().toISOString();
        emails[index].opened = false;
        saveEmails();

        console.log(`✅ Scheduled email sent to ${email.recipient}:`, info.response);
      });
    }
  });
});

// --- Serve frontend properly ---

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback route for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
