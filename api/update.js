// /api/update.js  (CommonJS)

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

// Global memory store
if (!global.latestReading) {
  global.latestReading = null;
}

module.exports = async function handler(req, res) {
  console.log("UPDATE endpoint hit", req.method, req.body);

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
      timestamp: Date.now(),
    };

    global.latestReading = reading;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("UPDATE handler ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
