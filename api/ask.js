// api/ask.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed - use POST" });
  }

  try {
    // Vercel provides raw body, parse manually
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const data = JSON.parse(Buffer.concat(buffers).toString());

    const question = data.question || "";
    const action = data.action || "ask";

    if (!question.trim()) {
      return res.status(400).json({ error: "Empty question" });
    }

    // Simple static context
    const context = `
[1] Proposal A - BrandX Spring Sale: 1.2M impressions; CPM $12.
[2] Proposal B - BrandY Launch: Pending approval; Slot #2; CPM $20.
[3] FAQ: Approvals usually take 3–5 business days.
    `;

    const system = "You are AdPitch Assistant. Use context, cite sources like [1]. Be concise.";

    let userPrompt = `CONTEXT: ${context}\nQUESTION: ${question}`;
    if (action === "summarize") {
      userPrompt = `Summarize this proposal in 80 words. CONTEXT: ${context} QUESTION: ${question}`;
    }
    if (action === "draft_email") {
      userPrompt = `Draft a short stakeholder email. CONTEXT: ${context} QUESTION: ${question}`;
    }

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      return res.status(500).json({ error: "OpenAI API error", detail: txt });
    }

    const result = await response.json();
    const answer = result.choices?.[0]?.message?.content || "No response";

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: "Server crash", detail: err.message });
  }
}
