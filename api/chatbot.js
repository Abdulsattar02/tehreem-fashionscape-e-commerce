/**
 * Tehreem FashionScape AI Chatbot (Vercel serverless)
 * Provider: OpenRouter OpenAI-compatible /chat/completions
 */

const FALLBACK_REPLY =
  "I’m temporarily unavailable right now. Please try again shortly.";

const SYSTEM_PROMPT =
  "You are the Tehreem FashionScape AI assistant for a modern fashion eCommerce store. " +
  "Store Name: Tehreem FashionScape. " +
  "Managed By: Abdul Sattar Maher. " +
  "Business Type: Fashion eCommerce Store. " +
  "Main Categories: Men, Women, Kids, Shoes, Sandals. " +
  "You help shoppers with Men, Women, Kids, Shoes, and Sandals—product browsing guidance, styling tips, sizes guidance (when asked), and general shopping help. " +
  "Tone: short, friendly, modern, helpful. Keep replies to 1–4 short sentences. " +
  "Never invent store-specific facts. If you do not know an exact answer (owner name, address, delivery times, contact numbers, exact return policy, exact payment policy), say: “I don’t have that information right now. Please contact store support for exact details.” " +
  "For return/payment questions, do not fabricate details. Use: “Return and payment details may vary by order. Please check the checkout or contact support for exact information.” " +
  "If asked: “Who is the owner?”, “Who manages this store?”, or “Who created this brand?”, respond exactly: “Tehreem FashionScape is managed by Abdul Sattar Maher.” " +
  "If asked about products or availability, suggest browsing relevant categories/collections on the site and encourage exploring Men/Women/Kids/Shoes/Sandals naturally.";

function jsonReply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // Vercel generally doesn't require CORS for same-origin, but keep safe.
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function withTimeout(ms, signal) {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`timeout-after-${ms}ms`));
    }, ms);

    if (signal) {
      signal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("aborted"));
        },
        { once: true },
      );
    }
  });
}

async function readJson(req) {
  try {
    return await req.json();
  } catch (e) {
    return null;
  }
}

async function handler(req) {
  const requestStartedAt = Date.now();
  const requestId = Math.random().toString(16).slice(2);

  try {
    console.log(`[chatbot][${requestId}] request received method=${req?.method}`);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (req.method !== "POST") {
      return jsonReply({ reply: FALLBACK_REPLY }, 405);
    }

    const envOpenRouterKey = process.env.OPENAI_API_KEY;
    const envBaseUrl = process.env.OPENAI_BASE_URL;
    const envModel = process.env.MODEL || "openai/gpt-4o-mini";

    if (!envOpenRouterKey || !envBaseUrl) {
      console.error(
        `[chatbot][${requestId}] Missing env OPENAI_API_KEY or OPENAI_BASE_URL`,
      );
      return jsonReply({ reply: FALLBACK_REPLY }, 500);
    }

    const parsedBody = await readJson(req);
    if (!parsedBody || typeof parsedBody !== "object") {
      console.error(`[chatbot][${requestId}] Missing/invalid JSON body`);
      return jsonReply({ reply: FALLBACK_REPLY }, 400);
    }

    const { messages, temperature } = parsedBody;
    const safeMessages = Array.isArray(messages) ? messages : [];
    if (!safeMessages.length) {
      console.error(`[chatbot][${requestId}] Missing messages array`);
      return jsonReply({ reply: FALLBACK_REPLY }, 400);
    }

    const tempToUse = typeof temperature === "number" ? temperature : 0.7;

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...safeMessages,
    ];

    const completionsUrl = `${envBaseUrl.replace(/\/$/, "")}/chat/completions`;

    const controller = new AbortController();
    const timeoutMs = 10000;
    const timeoutPromise = withTimeout(timeoutMs, controller.signal);

    const openRouterReq = fetch(completionsUrl, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${envOpenRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://tehreem-fashionscape-e-commerce.vercel.app",
        "X-Title": "Tehreem FashionScape AI Assistant",
      },
      body: JSON.stringify({
        model: envModel,
        messages: finalMessages,
        temperature: tempToUse,
      }),
    });

    const response = await Promise.race([openRouterReq, timeoutPromise]);
    console.log(`[chatbot][${requestId}] openrouter status=${response?.status}`);

    const data = await response
      .json()
      .catch(() => ({ error: "invalid-json" }));

    if (!response.ok) {
      console.error(
        `[chatbot][${requestId}] openrouter non-200`,
        data?.error || data,
      );
      return jsonReply({ reply: FALLBACK_REPLY }, 200);
    }

    const replyText = data?.choices?.[0]?.message?.content;
    if (typeof replyText !== "string" || !replyText.trim()) {
      console.error(
        `[chatbot][${requestId}] missing replyText in response`,
        data,
      );
      return jsonReply({ reply: FALLBACK_REPLY }, 200);
    }

    const ms = Date.now() - requestStartedAt;
    console.log(`[chatbot][${requestId}] success ${ms}ms`);

    // Frontend compatibility: must be { reply: "text" }
    return jsonReply({ reply: replyText.trim() }, 200);
  } catch (error) {
    // Defensive: always reply quickly
    // eslint-disable-next-line no-console
    console.error("CHATBOT ERROR:", error);
    return jsonReply({ reply: FALLBACK_REPLY }, 200);
  }
}

export default handler;

