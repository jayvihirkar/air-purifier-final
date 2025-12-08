// /api/update.js
const supabase = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Use POST" });

  try {
    const data = req.body;

    const { error } = await supabase
      .from("readings")
      .insert({
        aqi: data.aqi,
        ppm: data.ppm,
        adc: data.adc,
        voltage: data.voltage,
        fan1: data.fan1,
        fan2: data.fan2,
        automode: data.autoMode,
        device_id: data.deviceId || "esp32",
      });

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    return res.status(500).json({ error: "failed", details: err.message });
  }
};
