require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const path = require('path');
const { addUser, loadUsers, removeUser, verifyPassword } = require('./users');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const METERS_PER_MILE = 1609.344;
const DISCREPANCY_THRESHOLD_PERCENT = Number(process.env.DISCREPANCY_THRESHOLD_PERCENT || 10);

if (loadUsers().length === 0 && process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD) {
  addUser(process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD, 'admin');
  console.log(`Created initial admin user "${process.env.ADMIN_USERNAME}" from environment variables.`);
}

let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET not set; using a random secret for this run. Sessions will not survive a restart. Set SESSION_SECRET in .env for production.');
}

app.use(express.json());
app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
    },
  })
);

// Public: login page and login/logout API.
app.use('/login', express.static(path.join(__dirname, 'public/auth')));

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = verifyPassword(username, password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  req.session.user = { username: user.username, role: user.role };
  res.json({ username: user.username, role: user.role });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Everything below requires a signed-in driver or admin.
app.use((req, res, next) => {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  return res.redirect('/login/');
});

app.get('/api/me', (req, res) => {
  res.json(req.session.user);
});

function requireAdmin(req, res, next) {
  if (req.session.user.role === 'admin') return next();
  if (req.path.startsWith('/api/')) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  return res.redirect('/');
}

app.get('/api/users', requireAdmin, (req, res) => {
  res.json(loadUsers().map((u) => ({ username: u.username, role: u.role })));
});

app.post('/api/users', requireAdmin, (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required.' });
  }
  try {
    addUser(username, password, role);
    res.status(201).json({ username, role });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:username', requireAdmin, (req, res) => {
  const { username } = req.params;
  const users = loadUsers();
  const target = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!target) {
    return res.status(404).json({ error: `User "${username}" not found.` });
  }

  const adminCount = users.filter((u) => u.role === 'admin').length;
  if (target.role === 'admin' && adminCount <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last remaining admin account.' });
  }

  try {
    removeUser(username);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.use('/admin', requireAdmin, express.static(path.join(__dirname, 'public/admin')));

app.use(express.static(path.join(__dirname, 'public/app')));

app.get('/api/distance', async (req, res) => {
  const origin = (req.query.origin || '').trim();
  const destination = (req.query.destination || '').trim();
  const claimedMilesRaw = req.query.claimedMiles;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'Both origin and destination postcodes are required.' });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return res.status(500).json({ error: 'Server is not configured with a GOOGLE_MAPS_API_KEY.' });
  }

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
    url.searchParams.set('origins', origin);
    url.searchParams.set('destinations', destination);
    url.searchParams.set('units', 'imperial');
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(502).json({ error: `Google Maps API error: ${data.status}`, details: data.error_message });
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') {
      return res.status(422).json({ error: `Could not calculate a route between those postcodes (${element?.status || 'UNKNOWN'}).` });
    }

    const distanceMiles = element.distance.value / METERS_PER_MILE;
    const result = {
      origin: data.origin_addresses[0],
      destination: data.destination_addresses[0],
      distanceMiles: Number(distanceMiles.toFixed(2)),
      durationText: element.duration.text,
    };

    if (claimedMilesRaw !== undefined && claimedMilesRaw !== '') {
      const claimedMiles = Number(claimedMilesRaw);
      if (!Number.isNaN(claimedMiles)) {
        const differenceMiles = Number((claimedMiles - distanceMiles).toFixed(2));
        const discrepancyPercent = Number(((Math.abs(differenceMiles) / distanceMiles) * 100).toFixed(1));
        result.claimedMiles = claimedMiles;
        result.differenceMiles = differenceMiles;
        result.discrepancyPercent = discrepancyPercent;
        result.flagged = discrepancyPercent > DISCREPANCY_THRESHOLD_PERCENT;
        result.discrepancyThresholdPercent = DISCREPANCY_THRESHOLD_PERCENT;
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Unexpected error calculating distance.' });
  }
});

app.listen(PORT, () => {
  console.log(`Godline postcode distance checker running on http://localhost:${PORT}`);
});
