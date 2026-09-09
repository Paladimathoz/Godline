const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const VALID_ROLES = ['driver', 'admin'];

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

function saveUsers(users) {
  fs.mkdirSync(path.dirname(USERS_FILE), { recursive: true });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function findUser(username) {
  return loadUsers().find((u) => u.username.toLowerCase() === username.toLowerCase());
}

function addUser(username, password, role) {
  if (!username || !password) throw new Error('Username and password are required.');
  if (!VALID_ROLES.includes(role)) throw new Error(`Role must be one of: ${VALID_ROLES.join(', ')}`);
  if (findUser(username)) throw new Error(`User "${username}" already exists.`);

  const users = loadUsers();
  users.push({ username, passwordHash: bcrypt.hashSync(password, 10), role });
  saveUsers(users);
}

function removeUser(username) {
  const users = loadUsers();
  const next = users.filter((u) => u.username.toLowerCase() !== username.toLowerCase());
  if (next.length === users.length) throw new Error(`User "${username}" not found.`);
  saveUsers(next);
}

function verifyPassword(username, password) {
  const user = findUser(username);
  if (!user) return null;
  return bcrypt.compareSync(password, user.passwordHash) ? user : null;
}

module.exports = { loadUsers, findUser, addUser, removeUser, verifyPassword, VALID_ROLES };
