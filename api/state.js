export const config = {
  runtime: "nodejs20.x"
};

import fs from 'fs';

const TMP_FILE = '/tmp/latest-reading.json';

function getAirStatus(aqi) {
  if (aqi >= 201) return 'VERY UNHEALTHY';
  if (aqi >= 151) return 'UNHEALTHY';
  if (aqi >= 101) return 'UNHEALTHY (SENSITIVE GROUPS)';
  if (aqi >= 51) return 'MODERATE';
  return 'GOOD';
}

export default async function handler(req, res) {
  try {
    if (!fs.existsSync(TMP_FILE)) {
      return res.status(404).json({ error: 'No sensor data yet.' });
    }

    const reading = JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));

    const prediction = {
      next30MinAQI: reading.aqi + 5,
      trend: reading.aqi < 80 ? 'Improving' : 'Worsening',
      reason: "Simple rule-based prediction"
    };

    return res.status(200).json({
      currentAQI: reading.aqi,
      airStatus: getAirStatus(reading.aqi),
      dominantPollutant: 'MQ135 Composite',
      prediction,
      deviceId: reading.deviceId,
      lastUpdated: reading.timestamp
    });
  } catch (err) {
    console.error('state error:', err);
    return res.status(500).json({ error: 'internal error' });
  }
}
