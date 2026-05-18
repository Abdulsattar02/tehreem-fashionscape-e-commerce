/* Premium AI Chatbot - Tehreem FashionScape */

(() => {
  'use strict';

  const CHAT_LS_KEY = 'tf_chatbot_seen_welcome_v1';

  const ROOT = document.querySelector('[data-tf-chatbot-root]');
  if (!ROOT) return;

  const panel = ROOT.querySelector('[data-tf-chatbot-panel]');
  const launchBtn = ROOT.querySelector('[data-tf-chatbot-launch]');
  const closeBtn = ROOT.querySelector('[data-tf-chatbot-close]');
  const input = ROOT.querySelector('[data-tf-chatbot-input]');
  const sendBtn = ROOT.querySelector('[data-tf-chatbot-send]');
  const messagesEl = ROOT.querySelector('[data-tf-chatbot-messages]');

  const TYPING_ID = 'tf-chatbot-typing-row';
  let isOpen = false;
  let isRequestInFlight = false;

  // Keep frontend behavior; model selection happens in backend via env.
  const MODEL = 'gpt-4o-mini';


  // IMPORTANT: Never expose API key directly in frontend production.
  // Use backend proxy in production.

  const WELCOME_TEXT = `Welcome to Tehreem FashionScape \nHow can I help you today?`;

  const escapeHtml = (str) => {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '<')
      .replaceAll('>', '>')
      .replaceAll('"', '"')
      .replaceAll("'", '&#039;');
  };

  const appendBubble = ({ role, text, isTyping }) => {
    const row = document.createElement('div');
    row.className = `tf-chatbot-row ${role === 'user' ? 'tf-chatbot-row--user' : 'tf-chatbot-row--assistant'}`;

    const bubble = document.createElement('div');
    bubble.className = 'tf-chatbot-bubble';

    if (isTyping) {
      bubble.innerHTML = `
        <span class="tf-chatbot-typing">Fashion assistant is typing
          <span class="tf-chatbot-dots" aria-hidden="true"><i></i><i></i><i></i></span>
        </span>
      `;
      row.id = TYPING_ID;
      row.appendChild(bubble);
      messagesEl.appendChild(row);
      return;
    }

    bubble.innerHTML = escapeHtml(text);
    row.appendChild(bubble);
    messagesEl.appendChild(row);
  };

  const scrollToBottom = () => {
    // Auto-scroll without layout shift. Use rAF to ensure DOM is painted.
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  };

  const showTyping = () => {
    if (document.getElementById(TYPING_ID)) return;
    appendBubble({ role: 'assistant', text: '', isTyping: true });
    scrollToBottom();
  };

  const removeTyping = () => {
    const el = document.getElementById(TYPING_ID);
    if (el) el.remove();
  };

  const typeAssistantText = async (fullText) => {
    // Replace typing row bubble content with typing animation
    const typingRow = document.getElementById(TYPING_ID);
    const targetRow = typingRow || null;

    let bubble;
    if (targetRow) {
      bubble = targetRow.querySelector('.tf-chatbot-bubble');
      bubble.innerHTML = '';
    } else {
      appendBubble({ role: 'assistant', text: '', isTyping: false });
      bubble = messagesEl.lastElementChild.querySelector('.tf-chatbot-bubble');
    }

    const chars = fullText.split('');
    bubble.innerHTML = '';

    for (let i = 0; i < chars.length; i++) {
      bubble.innerHTML += escapeHtml(chars[i]);
      // Smooth typing: keep it light
      // Stop early if user closes
      if (!isOpen) return;
      if (i % 2 === 0) await new Promise(r => setTimeout(r, 12));
    }

    scrollToBottom();
  };

  const hasSeenWelcome = () => {
    try {
      return localStorage.getItem(CHAT_LS_KEY) === '1';
    } catch {
      return false;
    }
  };

  const setWelcomeSeen = () => {
    try {
      localStorage.setItem(CHAT_LS_KEY, '1');
    } catch {
      // ignore
    }
  };

  const showWelcomeIfNeeded = () => {
    if (hasSeenWelcome()) return;
    appendBubble({ role: 'assistant', text: WELCOME_TEXT, isTyping: false });
    setWelcomeSeen();
    scrollToBottom();
  };

  const sanitizeUserText = (t) => String(t || '').trim().slice(0, 500);

  const buildAssistantSystemPrompt = () => {
    return (
      'You are a premium fashion assistant for Tehreem FashionScape. ' +
      'Help users with outfit suggestions, sizes, product recommendations, fashion tips, and order help. ' +
      'Maintain a luxury tone, concise, and helpful. ' +
      'If the user asks for product availability, suggest browsing categories and provide general guidance.'
    );
  };

  const askOpenAI = async (userText) => {
    // Production safety: frontend should call backend proxy.
    // Here we use a proxy-style endpoint by default: /api/chatbot.
    // If not available, show a graceful error.

    const payload = {
      model: MODEL,
      messages: [
        { role: 'system', content: buildAssistantSystemPrompt() },
        { role: 'user', content: userText }
      ],
      temperature: 0.4
    };

    // Prefer backend proxy (prevents key exposure). 
    // Endpoint expected: POST /api/chatbot with { messages, model } or similar.
    // We'll keep it simple and forward payload.
    try {
    const proxyRes = await fetch('http://localhost:5000/api/chatbot', {
        method: 'POST',

        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (proxyRes.ok) {
        const proxyData = await proxyRes.json();
        const content = proxyData?.choices?.[0]?.message?.content || proxyData?.content;
        if (typeof content === 'string' && content.trim()) return content;
      } else {
        // Try to surface readable backend error (do not change UI styling)
        const proxyData = await proxyRes.json().catch(() => ({}));
        const backendError = proxyData?.error || proxyData?.details?.error?.message;
        if (typeof backendError === 'string' && backendError.trim()) {
          return backendError;
        }
      }

      // If proxy fails, do NOT try to call OpenAI directly from frontend.
      // Show fallback message.
      return 'I couldn’t reach the assistant right now. Please try again in a moment.';
    } catch {
      // Fallback to friendly message
      return 'I couldn’t reach the assistant right now. Please try again in a moment.';
    }

    // Note: Direct OpenAI frontend call is intentionally avoided.
    // Required structure example (for reference only):
    // fetch("https://api.openai.com/v1/chat/completions")
  };

  const openChat = () => {
    if (isOpen) return;
    isOpen = true;
    if (panel) panel.classList.add('is-open');
    ROOT.classList.add('is-open');

    // focus input without causing layout shift
    requestAnimationFrame(() => {
      if (input) input.focus();
    });

    showWelcomeIfNeeded();
  };

  const closeChat = () => {
    if (!isOpen) return;
    isOpen = false;
    if (panel) panel.classList.remove('is-open');
    ROOT.classList.remove('is-open');
    removeTyping();
  };

  const onLaunch = (e) => {
    e?.preventDefault?.();
    openChat();
  };

  const onClose = (e) => {
    e?.preventDefault?.();
    closeChat();
  };

  const onOutsideClick = (e) => {
    if (!isOpen) return;
    const target = e.target;
    if (!(target instanceof Element)) return;

    const clickedInside = target.closest('[data-tf-chatbot-panel]') || target.closest('[data-tf-chatbot-launch]');
    if (!clickedInside) closeChat();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeChat();
    }
  };

  const send = async () => {
    if (isRequestInFlight) return;
    const userText = sanitizeUserText(input?.value);
    if (!userText) return;

    // Prevent duplicate messages: if same text already last user message, skip.
    const lastUser = messagesEl.querySelector('.tf-chatbot-row--user .tf-chatbot-bubble');
    if (lastUser && lastUser.textContent.trim() === userText) {
      input.value = '';
      return;
    }

    appendBubble({ role: 'user', text: userText, isTyping: false });
    scrollToBottom();

    if (input) input.value = '';

    isRequestInFlight = true;
    if (sendBtn) sendBtn.disabled = true;

    showTyping();

    const assistantText = await askOpenAI(userText);
    removeTyping();

    // Typing animation
    await typeAssistantText(String(assistantText || '').trim() || 'No response yet.');

    isRequestInFlight = false;
    if (sendBtn) sendBtn.disabled = false;
  };

  launchBtn?.addEventListener('click', onLaunch);
  closeBtn?.addEventListener('click', onClose);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onOutsideClick);

  sendBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    if (!isOpen) openChat();
    void send();
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void send();
    }
  });

  // Ensure panel closed by default (no layout shift)
  if (panel && panel.classList.contains('is-open')) panel.classList.remove('is-open');
})();

