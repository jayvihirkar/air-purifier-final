export const runtime = "nodejs";

import fs from "fs";

const TMP_FILE = "/tmp/latest-reading.json";
const ML_URL = "https://air-purifier-ml-backend.onrender.com/predict";

function getAirStatus(aqi) {
  if (aqi >= 201) return "VERY UNHEALTHY";
  if (aqi >= 151) return "UNHEALTHY";
  if (aqi >= 101) return "UNHEALTHY (SENSITIVE GROUPS)";
  if (aqi >= 51) return "MODERATE";
  return "GOOD";
}

async function getMlPrediction(reading) {
  try {
    const resp = await fetch(ML_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ppm: reading.ppm,
        aqi: reading.aqi,
        voltage: reading.voltage,
        adc: reading.adc
      })
    });

    if (!resp.ok) {
      console.error("ML API Error:", resp.status);
      return defaultPrediction(reading);
    }

    const data = await resp.json();

    return {
      next30MinAQI: data.predicted_aqi ?? reading.aqi + 5,
      trend:
        data.trend ??
        (data.predicted_aqi > reading.aqi ? "Worsening" : "Improving"),
      reason: data.reason ?? "ML prediction service returned minimal data."
    };
  } catch (err) {
    console.error("ML FETCH ERROR:", err);
    return defaultPrediction(reading);
  }
}

function defaultPrediction(reading) {
  return {
    next30MinAQI: reading.aqi + 5,
    trend: reading.aqi < 80 ? "Improving" : "Worsening",
    reason: "Fallback rule-based prediction (ML unavailable)."
  };
}

export default async function handler(req, res) {
  try {
    if (!fs.existsSync(TMP_FILE)) {
      return res.status(404).json({ error: "No sensor data yet." });
    }

    const reading = JSON.parse(fs.readFileSync(TMP_FILE, "utf8"));

    const prediction = await getMlPrediction(reading);

    return res.status(200).json({
      currentAQI: reading.aqi,
      airStatus: getAirStatus(reading.aqi),
      dominantPollutant: "MQ135 Sensor",
      prediction,
      deviceId: reading.deviceId,
      lastUpdated: reading.timestamp
    });
  } catch (err) {
    console.error("state.js error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

