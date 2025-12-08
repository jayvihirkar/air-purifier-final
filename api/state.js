// /api/state.js

export const runtime = "nodejs";

const ML_URL = "https://air-purifier-ml-backend.onrender.com/predict";

// Helper: Convert AQI → Text
function getAirStatus(aqi) {
  if (aqi >= 201) return "VERY UNHEALTHY";
  if (aqi >= 151) return "UNHEALTHY";
  if (aqi >= 101) return "UNHEALTHY (SENSITIVE GROUPS)";
  if (aqi >= 51) return "MODERATE";
  return "GOOD";
}

// Predict future AQI using your ML backend
async function getMLPrediction(lags) {
  try {
    const now = new Date();

    const payload = {
      hour: now.getHours(),
      weekday: now.getDay(),
      lag_1: lags.lag1 || 0,
      lag_2: lags.lag2 || 0,
      lag_3: lags.lag3 || 0,
    };

    const resp = await fetch(ML_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    return data.prediction ?? null;
  } catch (err) {
    console.error("ML Prediction Error:", err);
    return null;
  }
}

export default async function handler(req, res) {
  try {
    // Read latest ESP32 data from RAM
    const reading = global.latestReading;

    if (!reading) {
      return res.status(404).json({ error: "No sensor data yet." });
    }

    // Prepare lag values (same AQI for now)
    const lags = {
      lag1: reading.aqi,
      lag2: reading.aqi,
      lag3: reading.aqi,
    };

    const predicted = await getMLPrediction(lags);

    const prediction = {
      next30MinAQI: predicted ?? reading.aqi,
      trend:
        predicted !== null
          ? predicted > reading.aqi
            ? "Worsening"
            : "Improving"
          : "Unknown",
      reason: predicted !== null ? "ML model prediction" : "No ML response",
    };

    return res.status(200).json({
      currentAQI: reading.aqi,
      airStatus: getAirStatus(reading.aqi),
      dominantPollutant: "MQ135 Composite",
      prediction,
      deviceId: reading.deviceId,
      lastUpdated: reading.timestamp,
    });
  } catch (err) {
    console.error("state error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}
