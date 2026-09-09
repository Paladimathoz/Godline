const whoamiEl = document.getElementById('whoami');
const logoutBtn = document.getElementById('logout-btn');
const form = document.getElementById('add-user-form');
const formErrorEl = document.getElementById('form-error');
const usersBody = document.getElementById('users-body');

let currentUsername = null;

(async function init() {
  const meResponse = await fetch('/api/me');
  if (!meResponse.ok) {
    window.location.href = '/login/';
    return;
  }
  const me = await meResponse.json();
  if (me.role !== 'admin') {
    window.location.href = '/';
    return;
  }
  currentUsername = me.username;
  whoamiEl.textContent = `${me.username} (${me.role})`;

  await loadUsers();
})();

logoutBtn.addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/login/';
});

async function loadUsers() {
  const response = await fetch('/api/users');
  if (response.status === 401) {
    window.location.href = '/login/';
    return;
  }
  if (response.status === 403) {
    window.location.href = '/';
    return;
  }
  const users = await response.json();
  renderUsers(users);
}

function renderUsers(users) {
  usersBody.innerHTML = '';

  if (users.length === 0) {
    const row = document.createElement('tr');
    row.className = 'empty-row';
    const cell = document.createElement('td');
    cell.colSpan = 3;
    cell.textContent = 'No accounts yet.';
    row.appendChild(cell);
    usersBody.appendChild(row);
    return;
  }

  users.forEach((user) => {
    const row = document.createElement('tr');

    const usernameCell = document.createElement('td');
    usernameCell.textContent = user.username;

    const roleCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = 'role-badge';
    badge.textContent = user.role;
    roleCell.appendChild(badge);

    const actionCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteUser(user.username));
    actionCell.appendChild(deleteBtn);

    row.append(usernameCell, roleCell, actionCell);
    usersBody.appendChild(row);
  });
}

async function deleteUser(username) {
  const confirmMessage =
    username === currentUsername
      ? `Delete your own account "${username}"? You'll be signed out immediately.`
      : `Delete account "${username}"?`;
  if (!window.confirm(confirmMessage)) return;

  const response = await fetch(`/api/users/${encodeURIComponent(username)}`, { method: 'DELETE' });
  const data = await response.json();

  if (!response.ok) {
    window.alert(data.error || 'Could not delete account.');
    return;
  }

  if (username === currentUsername) {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login/';
    return;
  }

  await loadUsers();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  formErrorEl.hidden = true;

  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  const data = await response.json();

  if (!response.ok) {
    formErrorEl.textContent = data.error || 'Could not add account.';
    formErrorEl.hidden = false;
    return;
  }

  form.reset();
  await loadUsers();
});
