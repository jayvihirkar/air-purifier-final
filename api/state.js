import { supabase } from "./_supabase.js";

const ML_URL = "https://air-purifier-ml-backend.onrender.com/predict";

function getAirStatus(aqi) {
  if (aqi >= 201) return "VERY UNHEALTHY";
  if (aqi >= 151) return "UNHEALTHY";
  if (aqi >= 101) return "UNHEALTHY (SENSITIVE GROUPS)";
  if (aqi >= 51) return "MODERATE";
  return "GOOD";
}

async function mlPredict(aqi) {
  try {
    const now = new Date();

    const body = {
      hour: now.getHours(),
      weekday: now.getDay(),
      lag_1: aqi,
      lag_2: aqi,
      lag_3: aqi,
    };

    const resp = await fetch(ML_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = await resp.json();
    return json.prediction ?? aqi;
  } catch {
    return aqi;
  }
}

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase
      .from("readings")
      .select("*")
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "No sensor data" });

    const predicted = await mlPredict(data.aqi);

    return res.json({
      currentAQI: data.aqi,
      airStatus: getAirStatus(data.aqi),
      dominantPollutant: "MQ135 Composite",
      prediction: {
        next30MinAQI: predicted,
        trend: predicted > data.aqi ? "Worsening" : "Improving",
        reason: "ML prediction",
      },
      deviceId: data.device_id,
      lastUpdated: data.created_at,
    });
  } catch (err) {
    console.error("STATE ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
}
