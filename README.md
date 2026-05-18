# Tehreem FashionScape

Tehreem FashionScape is a modern fashion eCommerce frontend with an AI chatbot backend to help shoppers browse categories, get styling guidance, and receive shopping support.

## Features

- Responsive fashion eCommerce UI (HTML/CSS/JS)
- Product browsing and shopping interactions (cart/wishlist behaviors)
- AI chatbot backend using OpenRouter (OpenAI-compatible `/chat/completions`)
- Brand-safe assistant system prompt (includes official store info)

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI Provider: OpenRouter (OpenAI-compatible API)
- Environment management: `dotenv`

## Local Setup (Frontend)

1. Open the project folder:
   - `tehreem-fashion-ecommerce/`
2. Start a static server:
   - Use your browser directly, or
   - Use VS Code **Live Server** extension
3. Open `index.html` in your browser.

## Backend Setup (Chatbot)

1. Go to the backend folder:
   ```bash
   cd tehreem-fashion-ecommerce/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create your environment file:
   - Copy `.env.example` to `.env` (in `tehreem-fashion-ecommerce/backend/`)
   - Update values as needed
4. Start the backend:
   ```bash
   npm start
   ```
5. Backend health check:
   - Visit: `http://localhost:5000/api/health`

## `.env` Setup (OpenRouter)

Create `tehreem-fashion-ecommerce/backend/.env` with values like:

- `OPENAI_API_KEY`: your OpenRouter API key
- `OPENAI_BASE_URL`: `https://openrouter.ai/api/v1`
- `MODEL`: model name (example uses Llama 3 instruct)
- `PORT`: default `5000`
- `NODE_ENV`: usually `development`

You can use `tehreem-fashion-ecommerce/.env.example` as a template.

## Run Instructions

- Start backend:
  ```bash
  cd tehreem-fashion-ecommerce/backend
  npm start
  ```
- Open the frontend:
  - `tehreem-fashion-ecommerce/index.html`

## Security / GitHub Safety Note

**Never commit your real API keys.** Add secrets only to `.env` files (which are excluded via `.gitignore`).

## License

All rights reserved © Tehreem FashionScape
 