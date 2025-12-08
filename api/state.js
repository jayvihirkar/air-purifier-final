// api/state.js
export const runtime = "nodejs";

import fs from "fs";

const TMP_FILE = "/tmp/latest-reading.json";
const LAG_FILE = "/tmp/lag.json";

const ML_URL = "https://air-purifier-ml-backend.onrender.com/predict";

function getAirStatus(aqi) {
  if (aqi >= 201) return "VERY UNHEALTHY";
  if (aqi >= 151) return "UNHEALTHY";
  if (aqi >= 101) return "UNHEALTHY (SENSITIVE GROUPS)";
  if (aqi >= 51) return "MODERATE";
  return "GOOD";
}

async function getMlPrediction(lags) {
  try {
    const now = new Date();
    const hour = now.getHours();
    const weekday = now.getDay();

    const payload = {
      hour,
      weekday,
      lag_1: lags.lag_1 ?? 0,
      lag_2: lags.lag_2 ?? 0,
      lag_3: lags.lag_3 ?? 0
    };

    const resp = await fetch(ML_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      console.error("ML backend error:", resp.status);
      return fallbackPrediction(lags);
    }

    const data = await resp.json();

    return {
      next30MinAQI: data.predicted_aqi,
      trend: data.trend,
      reason: data.reason
    };
  } catch (err) {
    console.error("ML fetch failed:", err);
    return fallbackPrediction(lags);
  }
}

function fallbackPrediction(lags) {
  return {
    next30MinAQI: Math.max(0, (lags.lag_1 ?? 0) + 5),
    trend: (lags.lag_1 ?? 0) < 80 ? "Improving" : "Worsening",
    reason: "Fallback prediction (ML offline)"
  };
}

export default async function handler(req, res) {
  try {
    if (!fs.existsSync(TMP_FILE)) {
      return res.status(404).json({ error: "No sensor data yet." });
    }

    const reading = JSON.parse(fs.readFileSync(TMP_FILE, "utf8"));
    let lags = { lag_1: null, lag_2: null, lag_3: null };

    if (fs.existsSync(LAG_FILE)) {
      lags = JSON.parse(fs.readFileSync(LAG_FILE, "utf8"));
    }

    const prediction = await getMlPrediction(lags);

    return res.status(200).json({
      currentAQI: reading.aqi,
      airStatus: getAirStatus(reading.aqi),
      dominantPollutant: "MQ135 Composite",
      prediction,
      deviceId: reading.deviceId,
      lastUpdated: reading.timestamp
    });
  } catch (err) {
    console.error("state error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}
