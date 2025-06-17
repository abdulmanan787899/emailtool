// ✅ Notification utilities at the top
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

// ✅ Base URL
const BASE_URL = 'https://email-scheduler-7ekc.onrender.com';

// ✅ Login/signup logic (no change here) ...
// Your original login/signup code stays as-is

// ✅ Main app page logic with UTC fix
if (document.getElementById('schedule-email-btn')) {
  document.getElementById('schedule-email-btn').addEventListener('click', async () => {
    const to = document.getElementById('email-to').value.trim();
    const subject = document.getElementById('email-subject').value.trim();
    const content = document.getElementById('email-content').value.trim();
    
    const localTime = document.getElementById('email-schedule-time').value;
    const scheduledTime = new Date(localTime).toISOString(); // convert to UTC

    if (!to || !subject || !content || !scheduledTime) {
      return showNotification('Please fill all fields', false);
    }

    try {
      const res = await fetch(`${BASE_URL}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          to,
          subject,
          text: content,
          time: scheduledTime,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Email scheduled successfully!');
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
      const res = await fetch(`${BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        window.location.href = 'login.html';
      }
    } catch {
      showNotification('Logout failed', false);
    }
  });
}
