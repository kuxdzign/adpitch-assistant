// /api/ask.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed - use POST' });
  }

  let body = '';
  try {
    body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => { data += chunk; });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
    body = JSON.parse(body);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON body', detail: err.message });
  }

  const { question = '', action = 'ask' } = body;
  if (!question.trim()) {
    return res.status(400).json({ error: 'Empty question' });
  }


    // --- Simple built-in context (simulating RAG)
    const context = `
[1] Proposal A - BrandX Spring Sale: Target 18-34; Slot #5 prime-time 30s; 1.2M impressions; CPM $12.
[2] Proposal B - BrandY Launch: Slot #2 60s; 900k impressions; pending approval; creative not final.
[3] AdSlot Metadata: Slot #2 CPM $20; Slot #5 CPM $12; Slot #11 CPM $6.
[4] FAQ: Approval time 3-5 days; docs needed: brief, creative specs, signed proposal.
[5] Notes: Marketing prefers BrandY shift to Slot #5; Sales suggests bundle discount for BrandX.
[6] Support: Proposal B pending; legal awaiting creative approval; ~4 days expected.
    `;

    const system = `You are AdPitch Assistant — concise, product-savvy assistant for ad-sales teams. Use CONTEXT, cite sources like [1], [2]. If unsure, say "I don't know". Keep answers short.`;

    let userPrompt = '';
    if (action === 'summarize') {
      userPrompt = `TASK: Summarize in 100 words for stakeholder. CONTEXT: ${context} QUESTION: ${question}`;
    } else if (action === 'draft_email') {
      userPrompt = `TASK: Draft a 3-sentence stakeholder email with next step. CONTEXT: ${context} QUESTION: ${question}`;
    } else {
      userPrompt = `CONTEXT: ${context} QUESTION: ${question} INSTRUCTIONS: Answer concisely with sources.`;
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      return res.status(500).json({ error: 'Missing OPENAI_API_KEY' });
    }

    const payload = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.15,
      max_tokens: 400
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(500).json({ error: 'OpenAI error', detail: text });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'No answer';

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
