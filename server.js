const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'your_secret_key',
  resave: false,
  saveUninitialized: true
}));

// Simple user system (replace with a DB for production)
const USERS_FILE = 'users.json';
const EMAILS_FILE = 'emails.json';

if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([]));
if (!fs.existsSync(EMAILS_FILE)) fs.writeFileSync(EMAILS_FILE, JSON.stringify([]));

const readJSON = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJSON = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.email === email && u.password === password);

  if (user) {
    req.session.user = user;
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
});

// Signup endpoint
app.post('/api/signup', (req, res) => {
  const { email, password } = req.body;
  let users = readJSON(USERS_FILE);

  if (users.find(u => u.email === email)) {
    return res.status(400).json({ success: false, message: 'User already exists' });
  }

  const newUser = { email, password };
  users.push(newUser);
  writeJSON(USERS_FILE, users);
  res.json({ success: true });
});

// Email scheduling endpoint
app.post('/api/schedule', (req, res) => {
  const { to, subject, text, scheduleTime } = req.body;

  const emails = readJSON(EMAILS_FILE);
  const newEmail = { to, subject, text, scheduleTime };
  emails.push(newEmail);
  writeJSON(EMAILS_FILE, emails);

  res.json({ success: true });
});

// Email sending logic
cron.schedule('* * * * *', () => {
  const emails = readJSON(EMAILS_FILE);
  const now = new Date();

  const pending = emails.filter(email => {
    const scheduled = new Date(email.scheduleTime);
    return scheduled <= now;
  });

  if (pending.length > 0) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'your_email@gmail.com',      // replace with your Gmail
        pass: 'your_app_password'          // use App Password, not Gmail password
      }
    });

    pending.forEach(email => {
      transporter.sendMail({
        from: 'your_email@gmail.com',
        to: email.to,
        subject: email.subject,
        text: email.text
      }, (error, info) => {
        if (error) {
          console.error('Email failed:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    });

    const remaining = emails.filter(email => {
      const scheduled = new Date(email.scheduleTime);
      return scheduled > now;
    });

    writeJSON(EMAILS_FILE, remaining);
  }
});

// Serve frontend on all other routes (Render fix)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
