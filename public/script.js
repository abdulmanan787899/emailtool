// Utility function to show notifications
function showNotification(message, success = true) {
  const notification = document.getElementById('notification') || createNotificationElement();
  notification.textContent = message;
  notification.style.color = success ? 'lightgreen' : 'red';
  setTimeout(() => {
    notification.textContent = '';
  }, 4000);
}

function createNotificationElement() {
  const div = document.createElement('div');
  div.id = 'notification';
  div.style.marginTop = '10px';
  document.body.appendChild(div);
  return div;
}

// Base URL for backend
const BASE_URL = 'https://email-scheduler-7ekc.onrender.com';

// LOGIN PAGE LOGIC
if (document.getElementById('login-btn')) {
  document.getElementById('login-btn').addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!username || !password) return showNotification('Please fill in both fields', false);

    try {
      const res = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Login successful!');
        setTimeout(() => window.location.href = 'index.html', 1000);
      } else {
        showNotification(data.error || 'Login failed', false);
      }
    } catch {
      showNotification('Network error', false);
    }
  });

  document.getElementById('go-to-signup').addEventListener('click', e => {
    e.preventDefault();
    window.location.href = 'signup.html';
  });
}

// SIGNUP PAGE LOGIC
if (document.getElementById('signup-btn')) {
  document.getElementById('signup-btn').addEventListener('click', async () => {
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value.trim();
    if (!username || !password) return showNotification('Please fill in both fields', false);

    try {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Registration successful! Redirecting...');
        setTimeout(() => window.location.href = 'login.html', 1500);
      } else {
        showNotification(data.error || 'Signup failed', false);
      }
    } catch {
      showNotification('Network error', false);
    }
  });

  document.getElementById('go-to-login').addEventListener('click', e => {
    e.preventDefault();
    window.location.href = 'login.html';
  });
}

// MAIN APP PAGE LOGIC
if (document.getElementById('schedule-email-btn')) {
  document.getElementById('schedule-email-btn').addEventListener('click', async () => {
    const to = document.getElementById('email-to').value.trim();
    const subject = document.getElementById('email-subject').value.trim();
    const content = document.getElementById('email-content').value.trim();
    const scheduledTime = document.getElementById('email-schedule-time').value;

    if (!to || !subject || !content || !scheduledTime) {
      return showNotification('Please fill all fields', false);
    }

    try {
      const res = await fetch(`${BASE_URL}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipient: to,
          subject,
          content,
          scheduledTime,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Email scheduled successfully!');
        // Clear inputs
        document.getElementById('email-to').value = '';
        document.getElementById('email-subject').value = '';
        document.getElementById('email-content').value = '';
        document.getElementById('email-schedule-time').value = '';
      } else {
        showNotification(data.error || 'Failed to schedule email', false);
      }
    } catch {
      showNotification('Network error', false);
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    try {
      const res = await fetch(`${BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
      if (res.ok) {
        window.location.href = 'login.html';
      }
    } catch {
      showNotification('Logout failed', false);
    }
  });
}
