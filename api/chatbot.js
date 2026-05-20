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

// Removed: withTimeout() - using simple AbortController instead

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
  let timeoutId = null;

  try {
    console.log("STEP 1: Request received");
    console.log(`[chatbot][${requestId}] method=${req?.method}`);

    // Handle CORS preflight
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

    // Only POST allowed
    if (req.method !== "POST") {
      console.log(`[chatbot][${requestId}] Not POST, returning 405`);
      return jsonReply({ reply: FALLBACK_REPLY }, 405);
    }

    // Validate environment variables
    console.log("STEP 2: Validating environment");
    const envOpenRouterKey = process.env.OPENAI_API_KEY;
    const envBaseUrl = process.env.OPENAI_BASE_URL;
    const envModel = process.env.MODEL || "openai/gpt-4o-mini";

    if (!envOpenRouterKey || !envBaseUrl) {
      console.error(
        `[chatbot][${requestId}] Missing OPENAI_API_KEY or OPENAI_BASE_URL`,
      );
      return jsonReply({ reply: FALLBACK_REPLY }, 500);
    }

    // Parse request body
    console.log("STEP 3: Parsing request body");
    const parsedBody = await readJson(req);
    if (!parsedBody || typeof parsedBody !== "object") {
      console.error(`[chatbot][${requestId}] Invalid JSON body`);
      return jsonReply({ reply: FALLBACK_REPLY }, 400);
    }

    const { messages, temperature } = parsedBody;
    const safeMessages = Array.isArray(messages) ? messages : [];
    if (!safeMessages.length) {
      console.error(`[chatbot][${requestId}] No messages provided`);
      return jsonReply({ reply: FALLBACK_REPLY }, 400);
    }

    const tempToUse = typeof temperature === "number" ? temperature : 0.7;

    // Prepare OpenRouter request
    console.log("STEP 4: Preparing OpenRouter request");
    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...safeMessages,
    ];

    const completionsUrl = `${envBaseUrl.replace(/\/$/, "")}/chat/completions`;
    console.log(`[chatbot][${requestId}] URL: ${completionsUrl}`);

    // Simple AbortController timeout (no Promise.race)
    console.log("STEP 5: Starting fetch with 10s timeout");
    const controller = new AbortController();
    const timeoutMs = 10000;
    timeoutId = setTimeout(() => {
      console.log(`[chatbot][${requestId}] Aborting fetch after ${timeoutMs}ms`);
      controller.abort();
    }, timeoutMs);

    // Single fetch call
    const response = await fetch(completionsUrl, {
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

    console.log("STEP 6: Fetch completed");
    console.log(`[chatbot][${requestId}] OpenRouter status: ${response?.status}`);

    // Parse response
    console.log("STEP 7: Parsing OpenRouter response");
    const data = await response
      .json()
      .catch(() => ({ error: "invalid-json" }));

    if (!response.ok) {
      console.error(
        `[chatbot][${requestId}] OpenRouter error status=${response.status}`,
        data?.error || data,
      );
      return jsonReply({ reply: FALLBACK_REPLY }, 200);
    }

    // Extract reply
    console.log("STEP 8: Extracting reply from response");
    const replyText = data?.choices?.[0]?.message?.content;
    if (typeof replyText !== "string" || !replyText.trim()) {
      console.error(
        `[chatbot][${requestId}] No valid reply in response`,
        data,
      );
      return jsonReply({ reply: FALLBACK_REPLY }, 200);
    }

    const ms = Date.now() - requestStartedAt;
    console.log(`[chatbot][${requestId}] SUCCESS in ${ms}ms`);
    console.log("STEP 9: Returning success response");

    // Return response with { reply } format for frontend compatibility
    return jsonReply({ reply: replyText.trim() }, 200);
  } catch (error) {
    console.error("CHATBOT ERROR:", error?.message || error);
    console.log("STEP X: Error caught, returning fallback");
    return jsonReply({ reply: FALLBACK_REPLY }, 200);
  } finally {
    // Guarantee cleanup: clear timeout to prevent event loop hanging
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      console.log("Timeout cleared");
    }
  }
}

export default handler;

