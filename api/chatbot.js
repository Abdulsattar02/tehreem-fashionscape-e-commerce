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

function parseBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(null);
      }
    });
  });
}

async function handler(req, res) {
  const requestStartedAt = Date.now();
  const requestId = Math.random().toString(16).slice(2);
  let timeoutId = null;

  try {
    console.log("FUNCTION STARTED");
    console.log("STEP 1: Request received");
    console.log(`[chatbot][${requestId}] method=${req.method}`);

    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      console.log(`[chatbot][${requestId}] OPTIONS request, returning 204`);
      return res.status(204).end();
    }

    // Only POST allowed
    if (req.method !== "POST") {
      console.log(`[chatbot][${requestId}] Not POST, returning 405`);
      return res.status(405).json({ reply: FALLBACK_REPLY });
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
      return res.status(500).json({ reply: FALLBACK_REPLY });
    }

    // Parse request body
    console.log("STEP 3: Parsing request body");
    const parsedBody = await parseBody(req);
    if (!parsedBody || typeof parsedBody !== "object") {
      console.error(`[chatbot][${requestId}] Invalid JSON body`);
      return res.status(400).json({ reply: FALLBACK_REPLY });
    }

    const { messages, temperature } = parsedBody;
    const safeMessages = Array.isArray(messages) ? messages : [];
    if (!safeMessages.length) {
      console.error(`[chatbot][${requestId}] No messages provided`);
      return res.status(400).json({ reply: FALLBACK_REPLY });
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

    // Simple timeout with AbortController
    console.log("STEP 5: Starting fetch with 10s timeout");
    const controller = new AbortController();
    const timeoutMs = 10000;
    timeoutId = setTimeout(() => {
      console.log(`[chatbot][${requestId}] Aborting fetch after ${timeoutMs}ms`);
      controller.abort();
    }, timeoutMs);

    // Single fetch call
    console.log(`[chatbot][${requestId}] Fetching from OpenRouter...`);
    const fetchResponse = await fetch(completionsUrl, {
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
    console.log(`[chatbot][${requestId}] OpenRouter status: ${fetchResponse.status}`);

    // Parse response
    console.log("STEP 7: Parsing OpenRouter response");
    const data = await fetchResponse
      .json()
      .catch(() => ({ error: "invalid-json" }));

    if (!fetchResponse.ok) {
      console.error(
        `[chatbot][${requestId}] OpenRouter error status=${fetchResponse.status}`,
        data?.error || data,
      );
      return res.status(200).json({ reply: FALLBACK_REPLY });
    }

    // Extract reply
    console.log("STEP 8: Extracting reply from response");
    const replyText = data?.choices?.[0]?.message?.content;
    if (typeof replyText !== "string" || !replyText.trim()) {
      console.error(
        `[chatbot][${requestId}] No valid reply in response`,
        data,
      );
      return res.status(200).json({ reply: FALLBACK_REPLY });
    }

    const ms = Date.now() - requestStartedAt;
    console.log(`[chatbot][${requestId}] SUCCESS in ${ms}ms`);
    console.log("STEP 9: Returning success response");

    // Return response with { reply } format for frontend compatibility
    return res.status(200).json({ reply: replyText.trim() });
  } catch (error) {
    console.error("CHATBOT ERROR:", error?.message || error);
    console.log("STEP X: Error caught, returning fallback");
    return res.status(200).json({ reply: FALLBACK_REPLY });
  } finally {
    // Guarantee cleanup: clear timeout to prevent event loop hanging
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      console.log("Timeout cleared");
    }
  }
}

export default handler;

