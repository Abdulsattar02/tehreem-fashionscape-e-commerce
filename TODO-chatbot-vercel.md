# Chatbot Vercel hang fix — TODO

## Info gathered
- `tehreem-fashion-ecommerce/api/chatbot.js` is a Vercel serverless handler that already returns JSON on many paths.
- Frontend typing UI is shown via `showTyping()` in `tehreem-fashion-ecommerce/assets/js/chatbot.js` and removed only after `askOpenAI()` resolves.
- `backend/server.js` defines a separate Express API at `/api/chatbot` (not used by Vercel functions, but helps confirm intended OpenRouter request shape).
- Current serverless function in `api/chatbot.js` has a mismatch vs the required spec: it uses `HTTP-Referer: http://127.0.0.1:3000` (and base URL headers differ from requested). Also it sets CORS headers via `Response` while frontend relies on `/api/chatbot` response.
- The hang is typically caused by the serverless function never returning (e.g., OpenRouter fetch never resolves) or frontend waiting forever.

## Plan (high level)
1. Update `tehreem-fashion-ecommerce/api/chatbot.js`
   - Ensure ALL code paths return `res.status(...).json(...)` (serverless-compatible: `return new Response(...json...)` OR consistently `return res.json`).
   - Add defensive `console.error('CHATBOT ERROR:', error)` in every catch.
   - Add OpenRouter request headers + body exactly as required.
   - Add request timeout (AbortController) so typing never hangs forever.
   - Add explicit fallback response message.
2. Update `tehreem-fashion-ecommerce/assets/js/chatbot.js`
   - Add fetch timeout + ensure `removeTyping()` runs in a `finally` block.
   - Add error throwing when `!response.ok` and return fallback message.
   - Ensure parsing matches OpenRouter: `data.choices?.[0]?.message?.content`.
3. Run local smoke test (optional) and ensure function always returns JSON.
4. Commit changes.
5. Push to GitHub.
6. Redeploy on Vercel.
7. Verify chatbot responds (no infinite typing).

## Progress
- [ ] Step 1: Patch Vercel `api/chatbot.js`
- [ ] Step 2: Patch frontend `assets/js/chatbot.js`
- [ ] Step 3: Smoke test / sanity check
- [ ] Step 4: Commit
- [ ] Step 5: Push + redeploy
- [ ] Step 6: Verify in Vercel logs / production

