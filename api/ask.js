// /api/ask.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed - use POST" });
  }

  try {
    // ✅ Safely parse body
    const { question = "", action = "ask" } = await req.json?.() || {};

    if (!question.trim()) {
      return res.status(400).json({ error: "Empty question" });
    }

    // --- Simple context
    const context = `
[1] Proposal A - BrandX Spring Sale: Target 18-34; Slot #5 30s; 1.2M impressions; CPM $12.
[2] Proposal B - BrandY Launch: Slot #2 60s; 900k impressions; pending approval.
[3] FAQ: Approval time 3–5 business days.
    `;

    const system = `You are AdPitch Assistant. Use context, cite sources like [1], [2]. Be concise.`;

    let userPrompt;
    if (action === "summarize") {
      userPrompt = `Summarize in 80–100 words. CONTEXT: ${context} QUESTION: ${question}`;
    } else if (action === "draft_email") {
      userPrompt = `Draft a short stakeholder email. CONTEXT: ${context} QUESTION: ${question}`;
    } else {
      userPrompt = `CONTEXT: ${context} QUESTION: ${question}`;
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo", // ✅ safe default model
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      return res.status(500).json({ error: "OpenAI error", detail: errTxt });
    }

    const data = await resp.json();
    const answer = data.choices?.[0]?.message?.content || "No answer";

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: "Server error", detail: err.message });
  }
}
