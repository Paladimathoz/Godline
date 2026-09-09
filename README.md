# Godline

## Postcode Distance Checker

Verifies driver-claimed mileage by calculating the driving distance between two postcodes using the Google Maps Distance Matrix API.

The Google Maps API key is used server-side only, so it is never exposed to the browser.

### Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Get a Google Maps API key with the **Distance Matrix API** enabled, and restrict it to server IPs (or leave unrestricted for local testing).
3. Copy `.env.example` to `.env` and fill in your key, a `SESSION_SECRET`, and (for the first run) an `ADMIN_USERNAME`/`ADMIN_PASSWORD`:
   ```
   cp .env.example .env
   ```
   Generate a session secret with:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
4. Start the server:
   ```
   npm start
   ```
   On first run, if `ADMIN_USERNAME`/`ADMIN_PASSWORD` are set and no users exist yet, an initial admin account is created automatically. You can then remove those two variables from `.env`.
5. Open `http://localhost:3000` — you'll be redirected to `/login/` until you sign in.

### Access control

The app is login-gated: only accounts you create (role `driver` or `admin`) can sign in and use the checker. Admins additionally get a "Manage users" link (`/admin/`) to add and delete accounts from the browser; drivers don't see it and are redirected away if they hit the URL directly. The last remaining admin account can't be deleted, so you can't lock yourself out.

Users are stored in `data/users.json` (bcrypt-hashed passwords, gitignored — never commit it). You can manage them from `/admin/` once signed in as an admin, or from the CLI:

```
node scripts/manage-users.js add <username> <password> <driver|admin>
node scripts/manage-users.js list
node scripts/manage-users.js remove <username>
```

Sessions are cookie-based (8 hour expiry) and use an in-memory store, which is fine for a single-instance deployment; if you ever run multiple server instances behind a load balancer, swap in a shared session store (e.g. Redis).

### Usage

Once signed in, enter the "from" and "to" postcodes and, optionally, the mileage the driver claimed. The app calculates the actual driving distance in miles and flags the entry if the claimed mileage differs from the calculated distance by more than `DISCREPANCY_THRESHOLD_PERCENT` (default 10%, configurable in `.env`).

### API

All `/api/*` routes except `/api/login` require an active session.

- `POST /api/login` — `{ username, password }` → sets a session cookie.
- `POST /api/logout` — destroys the session.
- `GET /api/me` — returns the signed-in user's `{ username, role }`.
- `GET /api/distance?origin=<postcode>&destination=<postcode>&claimedMiles=<number>` — returns the resolved addresses, calculated distance in miles, driving duration, and (if `claimedMiles` was supplied) the difference, discrepancy percentage, and whether it was flagged.

Admin-only (require role `admin`, otherwise 403):

- `GET /api/users` — list accounts (`username`, `role`).
- `POST /api/users` — `{ username, password, role }` → creates an account.
- `DELETE /api/users/:username` — deletes an account (rejected for the last remaining admin).
