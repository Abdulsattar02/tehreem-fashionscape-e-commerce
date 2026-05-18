// Minimal premium AI Chatbot backend for Tehreem FashionScape
// Provides POST /api/chatbot for the existing frontend widget.
// Provider: OpenRouter (OpenAI-compatible /chat/completions)


const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

async function openaiFetch(url, options) {
  const mod = await import('node-fetch');
  const fetchFn = mod.default || mod;
  return fetchFn(url, options);
}

dotenv.config();

// Startup logs (no secrets exposed)
console.log('[chatbot-backend] BASE URL:', process.env.OPENAI_BASE_URL);
console.log('[chatbot-backend] MODEL:', process.env.MODEL);
console.log('[chatbot-backend] KEY EXISTS:', !!process.env.OPENAI_API_KEY);


const app = express();

const hasKey = !!process.env.OPENAI_API_KEY;
console.log(`[chatbot-backend] OPENAI_API_KEY loaded: ${hasKey}`);
if (!hasKey) {
  console.warn('[chatbot-backend] Missing OPENAI_API_KEY. Set it in backend/.env or via environment variables.');
}


// CORS: allow local dev + production.
// Keep permissive but correct for localhost.
app.use(
  cors({
    origin: true,
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/chatbot', async (req, res) => {
  const startedAt = Date.now();
  const requestId = Math.random().toString(16).slice(2);

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`[chatbot-backend][${requestId}] POST /api/chatbot body received`);

    if (!apiKey) {
      console.error(`[chatbot-backend][${requestId}] Missing OPENAI_API_KEY`);
      return res.status(500).json({
        error: 'Missing OPENAI_API_KEY environment variable.'
      });
    }

    // Basic request validation + logging
    if (!req.body || typeof req.body !== 'object') {
      console.error(`[chatbot-backend][${requestId}] Malformed JSON body:`, req.body);
      return res.status(400).json({ error: 'Malformed request body. JSON is required.' });
    }

    const { messages, temperature } = req.body || {};

    const modelToUse = process.env.MODEL;
    const tempToUse = typeof temperature === 'number' ? temperature : 0.7;

    const safeMessages = Array.isArray(messages) ? messages : [];
    if (!safeMessages.length) {
      console.error(`[chatbot-backend][${requestId}] Missing messages. Payload keys:`, Object.keys(req.body || {}));
      return res.status(400).json({ error: 'Missing messages.' });
    }

    // Inject assistant system prompt here to enforce brand-safe behavior.
    const systemPrompt = (
      "You are the Tehreem FashionScape AI assistant for a modern fashion eCommerce store. " +
      "Store Name: Tehreem FashionScape. " +
      "Managed By: Abdul Sattar Maher. " +
      "Business Type: Fashion eCommerce Store. " +
      "Main Categories: Men, Women, Kids, Shoes, Sandals. " +
      "You help shoppers with Men, Women, Kids, Shoes, and Sandals—product browsing guidance, styling tips, sizes guidance (when asked), and general shopping help. " +
      "Tone: short, friendly, modern, helpful. Keep replies to 1–4 short sentences. Avoid overly formal or luxury-overdramatic language. " +
      "Never invent store-specific facts. If you do not know an exact answer (owner name, address, delivery times, contact numbers, exact return policy, exact payment policy), say: \"I don’t have that information right now. Please contact store support for exact details.\" " +
      "For return/payment questions, do not fabricate details. Use: \"Return and payment details may vary by order. Please check the checkout or contact support for exact information.\" " +
      "If asked: \"Who is the owner?\", \"Who manages this store?\", or \"Who created this brand?\", respond exactly: \"Tehreem FashionScape is managed by Abdul Sattar Maher.\" " +
      "If asked about products or availability, suggest browsing relevant categories/collections on the site and encourage exploring Men/Women/Kids/Shoes/Sandals naturally."
    );


    const finalMessages = Array.isArray(safeMessages) && safeMessages.length
      ? [{ role: 'system', content: systemPrompt }, ...safeMessages]
      : [{ role: 'system', content: systemPrompt }];

    const payload = {
      model: modelToUse,
      messages: finalMessages,
      temperature: tempToUse
    };

    const baseUrl = (process.env.OPENAI_BASE_URL || '').trim();
    if (!baseUrl) {
      console.error(`[chatbot-backend][${requestId}] Missing OPENAI_BASE_URL`);
      return res.status(500).json({ error: 'Missing OPENAI_BASE_URL environment variable.' });
    }

    const completionsUrl = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

    console.log(`[chatbot-backend][${requestId}] Calling OpenRouter at ${completionsUrl} model=${modelToUse} messages=${safeMessages.length}`);


    let response;
    try {
      const fetchFn = async () => {
        const mod = await import('node-fetch');
        return mod.default || mod;
      };
      const fetchImpl = await fetchFn();
      response = await fetchImpl(completionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://127.0.0.1:3000',
          'X-Title': 'Tehreem FashionScape AI Assistant'
        },
        body: JSON.stringify(payload)
      });
    } catch (networkErr) {
      console.error(`[chatbot-backend][${requestId}] Network error calling OpenAI:`, networkErr);
      return res.status(502).json({
        error: 'Network error while contacting OpenAI.',
        details: { message: networkErr?.message || String(networkErr) }
      });
    }

    let data;
    try {
      data = await response.json();
    } catch (jsonErr) {
      const text = await response.text().catch(() => '');
      console.error(`[chatbot-backend][${requestId}] Failed to parse OpenAI response JSON. status=${response.status} text=${text.slice(0, 500)}`);
      return res.status(502).json({
        error: 'Invalid response from OpenAI (not JSON).',
        details: { status: response.status, text: text.slice(0, 500) }
      });
    }

    if (!response.ok) {
      const openAiMsg = data?.error?.message || data?.error?.type || 'Provider request failed.';


      // Classify common errors for clearer logs
      const lower = String(openAiMsg).toLowerCase();
      if (lower.includes('incorrect') || lower.includes('invalid') || lower.includes('authentication')) {
        console.error(`[chatbot-backend][${requestId}] OpenAI auth error:`, openAiMsg);
      } else if (lower.includes('quota') || lower.includes('rate limit')) {
        console.error(`[chatbot-backend][${requestId}] OpenAI quota/rate limit error:`, openAiMsg);
      } else {
        console.error(`[chatbot-backend][${requestId}] OpenAI error: status=${response.status} msg=${openAiMsg}`, data?.error || data);
      }

      return res.status(response.status).json({
        error: openAiMsg,
        details: data
      });
    }

    // Ensure expected shape is present
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      console.error(`[chatbot-backend][${requestId}] OpenAI response missing choices[0].message.content`, data);
      return res.status(502).json({
        error: 'OpenAI returned an unexpected response format.',
        details: data
      });
    }

    const ms = Date.now() - startedAt;
    console.log(`[chatbot-backend][${requestId}] Success in ${ms}ms`);

    return res.json(data);
  } catch (err) {
    console.error('[chatbot-backend] Unhandled error:', err);
    return res.status(500).json({
      error: err?.message || 'Server error'
    });
  }
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Chatbot backend listening on http://localhost:${port}`);
});

