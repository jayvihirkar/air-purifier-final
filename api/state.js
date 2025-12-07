// api/state.js

let latestReading = global.latestReading || null;
let history = global.history || [];

// Simple AQI category helper (frontend also has a version)
function getAirStatus(aqi) {
  if (aqi >= 201) return 'VERY UNHEALTHY';
  if (aqi >= 151) return 'UNHEALTHY';
  if (aqi >= 101) return 'UNHEALTHY (SENSITIVE GROUPS)';
  if (aqi >= 51)  return 'MODERATE';
  return 'GOOD';
}

/**
 * ---- "ML Model" Stub ----
 * Replace this with your actual model logic.
 * You get the full history array. Each element:
 * {
 *   aqi, ppm, adc, voltage, fan1, fan2, autoMode, deviceId, timestamp
 * }
 */
function predictNext30MinAQI(history) {
  if (!history || history.length === 0) {
    return {
      next30MinAQI: 0,
      trend: 'Unknown',
      reason: 'No historical data available yet.'
    };
  }

  // Use last N points for a super light-weight trend
  const N = Math.min(10, history.length);
  const recent = history.slice(-N);
  const aqiValues = recent.map(r => r.aqi);
  const avgCurrent = aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length;

  // Compute slope (very rough)
  let slope = 0;
  for (let i = 1; i < recent.length; i++) {
    slope += (recent[i].aqi - recent[i - 1].aqi);
  }
  slope /= Math.max(1, (recent.length - 1));

  // Assume 1 reading per ~2–4s, 30min ~ 500–900s => we won't scale too high.
  // Just a gentle projection.
  const projected = avgCurrent + slope * 5;
  const next30 = Math.round(Math.max(0, projected));

  let trend, reason;
  if (slope > 1) {
    trend = 'Worsening';
    reason = 'Recent AQI readings are trending upward.';
  } else if (slope < -1) {
    trend = 'Improving';
    reason = 'Recent AQI readings are trending downward.';
  } else {
    trend = 'Stable';
    reason = 'Recent AQI readings are relatively flat.';
  }

  return {
    next30MinAQI: next30,
    trend,
    reason
  };
}

export default async function handler(req, res) {
  latestReading = global.latestReading || latestReading;
  history = global.history || history;

  if (!latestReading) {
    // No ESP32 data yet - frontend will fallback to mock.
    return res.status(404).json({ error: 'No sensor data yet.' });
  }

  const currentAQI = latestReading.aqi || 0;
  const airStatus = getAirStatus(currentAQI);
  const mlPrediction = predictNext30MinAQI(history);

  const response = {
    currentAQI,
    airStatus,
    dominantPollutant: 'MQ135 composite (approx)',
    prediction: mlPrediction,
    deviceId: latestReading.deviceId || 'esp32-1',
    lastUpdated: latestReading.timestamp
  };

  return res.status(200).json(response);
}
