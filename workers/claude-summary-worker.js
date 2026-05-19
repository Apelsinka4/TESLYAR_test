const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const data = await request.json();
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
        max_tokens: 700,
        temperature: 0.2,
        system: "Ти фінансовий аналітик Amazon marketplace. Пиши українською, коротко, без вигаданих даних. Поверни тільки JSON.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Побудуй executive summary для P&L dashboard. Формат відповіді: {"headline":"1 короткий висновок","summary":"3-5 речень для sales manager"}. Дані: ${JSON.stringify(data)}`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      return json({ error: "Claude request failed" }, response.status);
    }

    const payload = await response.json();
    const text = payload.content?.find((item) => item.type === "text")?.text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    return json(JSON.parse(match ? match[0] : text));
  },
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
