// api/update.js
export const runtime = "nodejs";
import fs from "fs";

const TMP_FILE = "/tmp/latest-reading.json";
const LAG_FILE = "/tmp/lag.json";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
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
      deviceId: body.deviceId || "esp32",
      timestamp: Date.now()
    };

    // Save main reading
    fs.writeFileSync(TMP_FILE, JSON.stringify(reading));

    // Update lag file
    let lags = { lag_1: null, lag_2: null, lag_3: null };
    if (fs.existsSync(LAG_FILE)) {
      lags = JSON.parse(fs.readFileSync(LAG_FILE, "utf8"));
    }

    // Shift lag values
    const newLags = {
      lag_1: reading.aqi,
      lag_2: lags.lag_1,
      lag_3: lags.lag_2
    };

    fs.writeFileSync(LAG_FILE, JSON.stringify(newLags));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("update error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}
