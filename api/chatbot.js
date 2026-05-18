/*
 * Tehreem FashionScape AI Chatbot - Vercel Serverless Function
 * Provider: OpenRouter (OpenAI-compatible /chat/completions)
 */

async function openaiFetch(url, options) {
  // Vercel provides global fetch in Node 18+; this fallback keeps compatibility.
  if (typeof fetch === "function") return fetch(url, options);
  const mod = await import("node-fetch");
  const fetchFn = mod.default || mod;
  return fetchFn(url, options);
}

function jsonResponse(body, init = {}) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    // Same-origin in Vercel normally doesn't require CORS, but we keep it safe.
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { ...headers, ...(init.headers || {}) },
  });
}

function corsPreflightResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Vercel serverless route handler
module.exports = async function handler(req) {
  try {
    if (!req) {
      return jsonResponse({ error: "Missing request." }, { status: 400 });
    }

    if (req.method === "OPTIONS") return corsPreflightResponse();
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, { status: 405 });
    }

    const startedAt = Date.now();
    const requestId = Math.random().toString(16).slice(2);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonResponse(
        { error: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 },
      );
    }

    const baseUrl = (process.env.OPENAI_BASE_URL || "").trim();
    if (!baseUrl) {
      return jsonResponse(
        { error: "Missing OPENAI_BASE_URL environment variable." },
        { status: 500 },
      );
    }

    const modelToUse = process.env.MODEL;
    if (!modelToUse) {
      return jsonResponse(
        { error: "Missing MODEL environment variable." },
        { status: 500 },
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Malformed request body. JSON is required." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return jsonResponse(
        { error: "Malformed request body. JSON is required." },
        { status: 400 },
      );
    }

    const { messages, temperature } = body || {};

    const safeMessages = Array.isArray(messages) ? messages : [];
    if (!safeMessages.length) {
      return jsonResponse({ error: "Missing messages." }, { status: 400 });
    }

    // Inject assistant system prompt here to enforce brand-safe behavior.
    // Preserve behavior from backend/server.js.
    const systemPrompt =
      "You are the Tehreem FashionScape AI assistant for a modern fashion eCommerce store. " +
      "Store Name: Tehreem FashionScape. " +
      "Managed By: Abdul Sattar Maher. " +
      "Business Type: Fashion eCommerce Store. " +
      "Main Categories: Men, Women, Kids, Shoes, Sandals. " +
      "You help shoppers with Men, Women, Kids, Shoes, and Sandals—product browsing guidance, styling tips, sizes guidance (when asked), and general shopping help. " +
      "Tone: short, friendly, modern, helpful. Keep replies to 1–4 short sentences. Avoid overly formal or luxury-overdramatic language. " +
      "Never invent store-specific facts. If you do not know an exact answer (owner name, address, delivery times, contact numbers, exact return policy, exact payment policy), say: “I don’t have that information right now. Please contact store support for exact details.” " +
      "For return/payment questions, do not fabricate details. Use: “Return and payment details may vary by order. Please check the checkout or contact support for exact information.” " +
      "If asked: “Who is the owner?”, “Who manages this store?”, or “Who created this brand?”, respond exactly: “Tehreem FashionScape is managed by Abdul Sattar Maher.” " +
      "If asked about products or availability, suggest browsing relevant categories/collections on the site and encourage exploring Men/Women/Kids/Shoes/Sandals naturally.";

    const finalMessages = safeMessages.length
      ? [{ role: "system", content: systemPrompt }, ...safeMessages]
      : [{ role: "system", content: systemPrompt }];

    const tempToUse = typeof temperature === "number" ? temperature : 0.7;

    const payload = {
      model: modelToUse,
      messages: finalMessages,
      temperature: tempToUse,
    };

    const completionsUrl = `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    let response;
    try {
      response = await openaiFetch(completionsUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          // Preserve OpenRouter headers exactly (from backend/server.js)
          "HTTP-Referer": "http://127.0.0.1:3000",
          "X-Title": "Tehreem FashionScape AI Assistant",
        },
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      return jsonResponse(
        {
          error: "Network error while contacting OpenAI.",
          details: { message: networkErr?.message || String(networkErr) },
        },
        { status: 502 },
      );
    }

    let data;
    try {
      data = await response.json();
    } catch {
      return jsonResponse(
        {
          error: "Invalid response from OpenAI (not JSON).",
          details: { status: response.status, text: "" },
        },
        { status: 502 },
      );
    }

    if (!response.ok) {
      const openAiMsg =
        data?.error?.message || data?.error?.type || "Provider request failed.";

      // Classify common errors for clearer logs (preserve structure)
      const lower = String(openAiMsg).toLowerCase();
      if (
        lower.includes("incorrect") ||
        lower.includes("invalid") ||
        lower.includes("authentication")
      ) {
        // eslint-disable-next-line no-console
        console.error(
          `[chatbot-backend][${requestId}] OpenAI auth error:`,
          openAiMsg,
        );
      } else if (lower.includes("quota") || lower.includes("rate limit")) {
        // eslint-disable-next-line no-console
        console.error(
          `[chatbot-backend][${requestId}] OpenAI quota/rate limit error:`,
          openAiMsg,
        );
      } else {
        // eslint-disable-next-line no-console
        console.error(
          `[chatbot-backend][${requestId}] OpenAI error: status=${response.status} msg=${openAiMsg}`,
          data?.error || data,
        );
      }

      return jsonResponse(
        { error: openAiMsg, details: data },
        { status: response.status },
      );
    }

    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      return jsonResponse(
        {
          error: "OpenAI returned an unexpected response format.",
          details: data,
        },
        { status: 502 },
      );
    }

    const ms = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.log(`[chatbot-backend][${requestId}] Success in ${ms}ms`);

    return jsonResponse(data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[chatbot-backend] Unhandled error:", err);
    return jsonResponse(
      { error: err?.message || "Server error" },
      { status: 500 },
    );
  }
};
