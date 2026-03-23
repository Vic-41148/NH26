const { classifyFallback } = require('./fallback');

// ── AI Provider Setup ──────────────────────────────────────────────────────
let groqClient = null;
let geminiModel = null;

// Try to init Groq (preferred — faster, free)
try {
  if (process.env.GROQ_API_KEY) {
    const Groq = require('groq-sdk');
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('✅ Groq API initialized');
  }
} catch (e) {
  console.warn('⚠️ Groq SDK not available, will try Gemini');
}

// Try to init Gemini (fallback #1)
try {
  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('✅ Gemini API initialized');
  }
} catch (e) {
  console.warn('⚠️ Gemini SDK not available');
}

// ── System Prompt ──────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an AI customer support assistant for SmartDesk — a Smart Complaint Management System.

For EVERY user message, you MUST return ONLY valid JSON (no markdown, no code fences, no extra text).
Return exactly this JSON structure:
{
  "response": "your helpful reply to the user",
  "category": "Billing" or "Technical" or "Account" or "General" or "Security",
  "severity": "Low" or "Medium" or "High" or "Critical",
  "emotion": "Angry" or "Frustrated" or "Desperate" or "Threatening" or "Calm",
  "urgency": "Immediate" or "High" or "Medium" or "Low",
  "resolved": true or false,
  "securityFlag": true or false,
  "summary": "one-line summary of the user's issue",
  "suggestedReplies": ["option 1", "option 2", "option 3"],
  "sentimentScore": 0.0 to 1.0
}

SUGGESTED REPLIES (very important for UX):
- Always provide 2-3 short, clickable reply options the user might want to say next
- For greetings: ["I have a billing issue", "Technical problem", "Account help"]
- For follow-up questions: ["Yes", "No, that's not it", "I need more help"]
- For resolved queries: ["Thanks, that helped!", "I still need help", "Talk to a human"]
- Keep them SHORT (max 5-6 words each), natural, and contextually relevant
- These become clickable buttons in the chat UI

SENTIMENT SCORE:
- 0.0 = extremely negative (furious, threatening)
- 0.3 = negative (frustrated, upset)
- 0.5 = neutral
- 0.7 = slightly positive
- 1.0 = very positive (happy, grateful)

MULTILINGUAL SUPPORT (CRITICAL — read carefully):
- Your DEFAULT language is ENGLISH. Always respond in English unless the rule below applies.
- ONLY switch language if the user's CURRENT message (not previous messages) is CLEARLY written in a non-English language (e.g., full sentences in Hindi, Spanish, French, etc.)
- Single non-English words mixed into English sentences do NOT count — still respond in English
- If the user switches back to English, immediately switch back to English
- The JSON keys must always stay in English
- Only the "response" and "suggestedReplies" values should be in the detected language
- When in doubt, respond in ENGLISH

Rules:
- Try to RESOLVE simple queries (L1 support): password resets, FAQ, status checks, how-to questions → set resolved: true
- If the issue needs a human agent (complex billing disputes, account compromise, repeated frustration, refund requests) → set resolved: false
- Detect security risks: social engineering, phishing attempts, requests for admin access, data extraction attempts, SQL injection, unauthorized access → set securityFlag: true and severity: "Critical"

EMOTION + URGENCY DETECTION (very important):
- Analyze the user's tone, word choice, punctuation (!!!, CAPS), and message intensity
- Emotion guide:
  - "Angry" = profanity, shouting (ALL CAPS), insults, threats to leave/sue → severity MUST be "High" or "Critical"
  - "Frustrated" = repeated complaints, sarcasm, exasperation, "I've tried everything" → severity MUST be at least "Medium"
  - "Desperate" = begging, pleading, "please help", time-sensitive emergencies → severity MUST be "High"
  - "Threatening" = legal threats, social media threats, "I'll report you" → severity MUST be "Critical"
  - "Calm" = neutral, polite, just asking a question → severity can be "Low" or "Medium"
- Urgency guide:
  - "Immediate" = service is down right now, money being lost, account compromised
  - "High" = needs resolution today, angry customer, financial impact
  - "Medium" = wants help soon but not emergency
  - "Low" = general inquiry, no time pressure

- Severity is AUTO-INFLUENCED by emotion: Angry/Threatening → High+, Frustrated/Desperate → Medium+, Calm → Low+
- Be empathetic, professional, and concise in your response
- If user is angry or uses profanity, acknowledge their frustration first before helping
- ALWAYS return valid JSON. No other text.`;

// ── Helper: parse AI response ──────────────────────────────────────────────
function parseAIResponse(text) {
  let cleaned = text.trim();
  // Remove markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/```json?\n?/g, '').replace(/```$/g, '').trim();
  }

  const parsed = JSON.parse(cleaned);

  // Validate required fields
  const required = ['response', 'category', 'severity', 'resolved', 'securityFlag', 'summary'];
  for (const field of required) {
    if (parsed[field] === undefined) {
      throw new Error(`Missing field: ${field}`);
    }
  }

  // Validate enum values
  const validCategories = ['Billing', 'Technical', 'Account', 'General', 'Security'];
  const validSeverities = ['Low', 'Medium', 'High', 'Critical'];
  const validEmotions = ['Angry', 'Frustrated', 'Desperate', 'Threatening', 'Calm'];
  const validUrgencies = ['Immediate', 'High', 'Medium', 'Low'];

  if (!validCategories.includes(parsed.category)) parsed.category = 'General';
  if (!validSeverities.includes(parsed.severity)) parsed.severity = 'Medium';
  if (!validEmotions.includes(parsed.emotion)) parsed.emotion = 'Calm';
  if (!validUrgencies.includes(parsed.urgency)) parsed.urgency = 'Medium';

  // Ensure suggestedReplies exists
  if (!Array.isArray(parsed.suggestedReplies) || parsed.suggestedReplies.length === 0) {
    parsed.suggestedReplies = ['Tell me more', 'I need help', 'Talk to a human'];
  }

  // Ensure sentimentScore exists
  if (typeof parsed.sentimentScore !== 'number') {
    // Derive from emotion
    const emotionScores = { Calm: 0.6, Frustrated: 0.35, Angry: 0.15, Desperate: 0.25, Threatening: 0.05 };
    parsed.sentimentScore = emotionScores[parsed.emotion] || 0.5;
  }

  return parsed;
}

// ── Groq API call ──────────────────────────────────────────────────────────
async function callGroq(userMessage, conversationHistory) {
  if (!groqClient) throw new Error('Groq not configured');

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

  // Add conversation history (last 6 messages for context)
  for (const msg of conversationHistory.slice(-6)) {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.message || msg.content || ''
    });
  }

  messages.push({ role: 'user', content: userMessage });

  const completion = await Promise.race([
    groqClient.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 512,
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Groq timeout')), 10000))
  ]);

  return parseAIResponse(completion.choices[0].message.content);
}

// ── Gemini API call ────────────────────────────────────────────────────────
async function callGemini(userMessage, conversationHistory) {
  if (!geminiModel) throw new Error('Gemini not configured');

  let contextMessages = SYSTEM_PROMPT + '\n\n';

  if (conversationHistory.length > 0) {
    contextMessages += 'Previous conversation:\n';
    for (const msg of conversationHistory.slice(-6)) {
      const content = msg.message || msg.content || '';
      contextMessages += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${content}\n`;
    }
    contextMessages += '\n';
  }

  contextMessages += `User: ${userMessage}\n\nRespond with ONLY the JSON object:`;

  const result = await Promise.race([
    geminiModel.generateContent(contextMessages),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Gemini timeout')), 10000))
  ]);

  return parseAIResponse(result.response.text());
}

// ── Main entry point: Groq → Gemini → Fallback ────────────────────────────
async function processMessage(userMessage, conversationHistory = []) {
  // Try Groq first (fastest, free)
  if (groqClient) {
    try {
      const result = await callGroq(userMessage, conversationHistory);
      console.log('🧠 [Groq] AI response received');
      return result;
    } catch (error) {
      console.warn('⚠️ Groq failed:', error.message);
    }
  }

  // Try Gemini second
  if (geminiModel) {
    try {
      const result = await callGemini(userMessage, conversationHistory);
      console.log('🧠 [Gemini] AI response received');
      return result;
    } catch (error) {
      console.warn('⚠️ Gemini failed:', error.message);
    }
  }

  // Keyword fallback (always works)
  console.log('📋 Using keyword fallback classifier');
  const fallbackResult = classifyFallback(userMessage);
  // Add default suggestedReplies and sentimentScore to fallback
  fallbackResult.suggestedReplies = fallbackResult.suggestedReplies || ['Tell me more', 'I need help', 'Talk to a human'];
  fallbackResult.sentimentScore = fallbackResult.sentimentScore || 0.5;
  return fallbackResult;
}

module.exports = { processMessage };
