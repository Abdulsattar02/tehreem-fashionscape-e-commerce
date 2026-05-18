# TODO - Vercel fullstack migration

- [ ] Step 1: Inspect current backend and frontend chatbot integration (already analyzed).
- [x] Step 2: Create `api/chatbot.js` as Vercel serverless function and move logic from `backend/server.js`.
- [x] Step 3: Ensure `api/chatbot.js` uses only `process.env.OPENAI_API_KEY`, `process.env.OPENAI_BASE_URL`, `process.env.MODEL`.
- [x] Step 4: Preserve OpenRouter integration (endpoint + headers), system prompt, concise ecommerce behavior, and error handling.
- [x] Step 5: Add CORS-safe handling appropriate for Vercel.
- [x] [UPDATED] Step 6: Update frontend `assets/js/chatbot.js` to call `/api/chatbot` (remove localhost:5000) and avoid sending model from frontend.
- [x] Step 7: Run a quick local node syntax check / minimal test (as possible) to ensure no typos.


- [ ] Step 8: (Optional) Create `vercel.json` only if required for routing/handler.

