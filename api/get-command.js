const supabase = require("./_supabase");

module.exports = async function handler(req, res) {
  const deviceId = req.query.deviceId || "esp32";

  const { data, error } = await supabase
    .from("commands")
    .select("*")
    .eq("device_id", deviceId)
    .order("id", { ascending: false })
    .limit(1)
    .single();

  if (error || !data)
    return res.status(200).json({ power: true, mode: "auto" });

  return res.status(200).json(data);
};
