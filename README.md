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
3. Copy `.env.example` to `.env` and fill in your key:
   ```
   cp .env.example .env
   ```
4. Start the server:
   ```
   npm start
   ```
5. Open `http://localhost:3000`.

### Usage

Enter the "from" and "to" postcodes and, optionally, the mileage the driver claimed. The app calculates the actual driving distance in miles and flags the entry if the claimed mileage differs from the calculated distance by more than `DISCREPANCY_THRESHOLD_PERCENT` (default 10%, configurable in `.env`).

### API

`GET /api/distance?origin=<postcode>&destination=<postcode>&claimedMiles=<number>`

Returns JSON with the resolved addresses, calculated distance in miles, driving duration, and (if `claimedMiles` was supplied) the difference, discrepancy percentage, and whether it was flagged.
