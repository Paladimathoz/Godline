#!/usr/bin/env node
const { addUser, removeUser, loadUsers } = require('../users');

const [, , command, ...args] = process.argv;

function usage() {
  console.error('Usage:');
  console.error('  node scripts/manage-users.js add <username> <password> <driver|admin>');
  console.error('  node scripts/manage-users.js remove <username>');
  console.error('  node scripts/manage-users.js list');
  process.exit(1);
}

try {
  if (command === 'add') {
    const [username, password, role] = args;
    if (!username || !password || !role) usage();
    addUser(username, password, role);
    console.log(`User "${username}" (${role}) added.`);
  } else if (command === 'remove') {
    const [username] = args;
    if (!username) usage();
    removeUser(username);
    console.log(`User "${username}" removed.`);
  } else if (command === 'list') {
    const users = loadUsers();
    if (users.length === 0) {
      console.log('No users yet.');
    } else {
      users.forEach((u) => console.log(`${u.username} (${u.role})`));
    }
  } else {
    usage();
  }
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
