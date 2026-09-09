const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');
const submitBtn = form.querySelector('button');

const params = new URLSearchParams(window.location.search);
const redirectTo = params.get('redirect') || '/';

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  errorEl.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in...';

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Sign in failed.');
    }

    window.location.href = redirectTo;
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Sign in';
  }
});
