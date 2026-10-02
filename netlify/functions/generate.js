exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Method not allowed"}) };
  }
  try {
    const { topic } = JSON.parse(event.body || "{}");
    if (!topic || !topic.trim()) {
      return { statusCode: 400, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"Topic is required"}) };
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return { statusCode: 500, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error:"GEMINI_API_KEY is not configured in Netlify"}) };
    }

    const prompt = `Create social media content for this video topic: "${topic}".
Return ONLY valid JSON with exactly these keys:
"title": a concise YouTube title,
"caption": a natural engaging caption suitable for TikTok, Instagram and Facebook,
"hashtags": 6 to 10 relevant hashtags as one space-separated string.
Do not use markdown fences.`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=" + encodeURIComponent(key),
      {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:prompt}]}]})}
    );
    const raw = await response.json();
    if (!response.ok) {
      return { statusCode: response.status, headers: {"Content-Type":"application/json"}, body: JSON.stringify({error: raw?.error?.message || "Gemini request failed"}) };
    }
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = text.replace(/^```json\s*/i,"").replace(/```$/,"").trim();
    let data;
    try { data = JSON.parse(clean); } catch { data = {title:"",caption:text,hashtags:""}; }
    return { statusCode:200, headers:{"Content-Type":"application/json"}, body:JSON.stringify(data) };
  } catch (e) {
    return { statusCode:500, headers:{"Content-Type":"application/json"}, body:JSON.stringify({error:e.message || "Server error"}) };
  }
};
