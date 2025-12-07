export const runtime = "nodejs";
import fs from "fs";

const TMP_FILE = "/tmp/latest-reading.json";

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

    fs.writeFileSync(TMP_FILE, JSON.stringify(reading));

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("update error:", err);
    return res.status(500).json({ error: "internal error" });
  }
}
