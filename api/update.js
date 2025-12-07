// api/update.js

let latestReading = global.latestReading || null;
let history = global.history || [];

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const body = req.body || {};

    const reading = {
      aqi: Number(body.aqi ?? 0),
      ppm: Number(body.ppm ?? 0),
      adc: Number(body.adc ?? 0),
      voltage: Number(body.voltage ?? 0),
      fan1: !!body.fan1,
      fan2: !!body.fan2,
      autoMode: !!body.autoMode,
      deviceId: body.deviceId || 'esp32-1',
      timestamp: Date.now()
    };

    latestReading = reading;
    history.push(reading);
    if (history.length > 120) history.shift();

    // Persist in global for warm instances
    global.latestReading = latestReading;
    global.history = history;

    // For now we don't send control commands.
    // Later you can compute something here and return
    // control instructions to ESP32.
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Error in /api/update:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
