require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const METERS_PER_MILE = 1609.344;
const DISCREPANCY_THRESHOLD_PERCENT = Number(process.env.DISCREPANCY_THRESHOLD_PERCENT || 10);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

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
