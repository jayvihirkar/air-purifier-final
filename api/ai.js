// api/ai.js

const MODEL_NAME = 'gemini-2.5-flash-preview-09-2025';

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not set');
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  const candidate = data.candidates && data.candidates[0];

  return (
    candidate?.content?.parts?.map(p => p.text).join('\n') ||
    'I could not generate an answer.'
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const { userText, liveAQIData, isInitial } = req.body || {};

    const aqi = liveAQIData?.currentAQI ?? 'unknown';
    const status = liveAQIData?.airStatus ?? 'Unknown';
    const dom = liveAQIData?.dominantPollutant ?? 'Unknown';
    const pred = liveAQIData?.prediction?.next30MinAQI ?? 'unknown';
    const trend = liveAQIData?.prediction?.trend ?? 'Unknown';
    const reason = liveAQIData?.prediction?.reason ?? '';

    const baseContext =
      `You are an AI Advisor for a smart indoor air purifier. ` +
      `Be concise, calm, practical, and scientific. Avoid marketing tone. ` +
      `Focus on health, ventilation, and purifier usage.\n\n` +
      `Current room status:\n` +
      `- AQI now: ${aqi} (${status})\n` +
      `- Dominant pollutant: ${dom}\n` +
      `- Predicted AQI in ~30 minutes: ${pred} (trend: ${trend})\n` +
      (reason ? `- Model reasoning: ${reason}\n` : '') +
      `Guidelines:\n` +
      `- Never say "I am an AI".\n` +
      `- Use max 3 very short bullet points.\n` +
      `- Keep tone minimal and accurate.\n\n`;

    let fullPrompt;

    if (isInitial) {
      fullPrompt =
        baseContext +
        `Give ONE short actionable tip based on current AQI. Start directly with advice. No greetings.`;
    } else {
      fullPrompt =
        baseContext +
        `User question:\n"${userText}"\n\n` +
        `Respond using general air quality science + above context.`;
    }

    const answer = await callGemini(fullPrompt);

    return res.status(200).json({ answer });
  } catch (err) {
    console.error('/api/ai error:', err);
    return res.status(500).json({ error: 'AI error', detail: err.message });
  }
}
