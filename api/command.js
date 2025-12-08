const supabase = require("./_supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Use POST" });

  try {
    const { deviceId, power, mode, fan1, fan2 } = req.body;

    const { error } = await supabase
      .from("commands")
      .insert({
        device_id: deviceId,
        power,
        mode,
        fan1,
        fan2
      });

    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("COMMAND ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};
