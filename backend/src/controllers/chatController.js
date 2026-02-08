// TEMP in-memory issue state (per server, dev-safe)

let issueState = {
  category: null,
  description: null,
  location: null,
  severity: null,
};

const { GoogleGenerativeAI } = require("@google/generative-ai");

const MODEL_NAME = "gemini-3-flash-preview"; // STABLE & SUPPORTED

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Gemini health check (DO NOT hard-fail server)
 */
async function initializeGemini() {
  try {
    console.log("🔍 Verifying Gemini API key...");
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY missing");
    }
    console.log(`✅ Gemini initialized with model: ${MODEL_NAME}`);
  } catch (err) {
    console.error("❌ Gemini init warning:", err.message);
  }
}

/**
 * Normalize frontend history → Gemini format
 */
function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];

  const cleaned = history
    .filter(m => m?.content && typeof m.content === "string")
    .map(m => ({
      role: m.role === "assistant" || m.role === "bot" ? "model" : "user",
      parts: [{ text: m.content.trim() }]
    }));

  // Gemini rule: first message must be user
  while (cleaned.length && cleaned[0].role !== "user") {
    cleaned.shift();
  }

  return cleaned.slice(-30);
}

/**
 * Chat endpoint
 */
async function processMessage(req, res) {
  try {
    const { message, history = [] } = req.body;
    const msg = message.toLowerCase();

// very simple deterministic extraction
if (!issueState.severity && /(low|medium|high|urgent)/.test(msg)) {
  issueState.severity = msg.match(/low|medium|high|urgent/)[0];
}

if (!issueState.category) {
  if (/pothole|road/.test(msg)) {
    issueState.category = "road";
  } else if (/drainage|sewer|blocked drain/.test(msg)) {
    issueState.category = "drainage";
  } else if (/garbage|waste|trash/.test(msg)) {
    issueState.category = "sanitation";
  } else if (/streetlight|light/.test(msg)) {
    issueState.category = "streetlight";
  }
}


if (!issueState.description && msg.length > 15) {
  issueState.description = message;
}

if (!issueState.location && /(near|at|opposite|behind|street|road|nagar|colony|lane|area|chennai)/.test(msg)) {
  issueState.location = message;
}


    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const normalized = message.trim().toLowerCase();

if (["hi", "hello"].includes(normalized)) {
  issueState = {
    category: null,
    description: null,
    location: null,
    severity: null,
  };
}


    if (!issueState.category) {
  return res.json({ reply: "What is the category of the issue? (e.g., road, sanitation)" });
}

if (!issueState.location) {
  return res.json({ reply: "Where is the issue located?" });
}

if (!issueState.description) {
  return res.json({ reply: "Please briefly describe the issue." });
}

if (!issueState.severity) {
  return res.json({ reply: "What is the severity? (Low / Medium / High)" });
}


    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const SYSTEM_PROMPT = `
You are a civic issue reporting assistant.
Collect:
1. Category
2. Description
3. Location
4. Severity

Ask one missing detail at a time.
When all are present, confirm clearly.
`;

    const cleanedHistory = sanitizeHistory(history);

    if (
  issueState.category &&
  issueState.description &&
  issueState.location &&
  issueState.severity
) {
  return res.json({
    isJson: true,
    reply: {
      readyToSubmit: true,
      issueData: issueState,
    },
  });
}


    // Inject system prompt ONLY into first user message
    if (cleanedHistory.length === 0) {
      cleanedHistory.push({
        role: "user",
        parts: [{ text: SYSTEM_PROMPT + "\n\nUser: " + message }]
      });
    }

    const chat = model.startChat({ history: cleanedHistory });

    const result =
      cleanedHistory.length > 1
        ? await chat.sendMessage(message.trim())
        : await chat.sendMessage("");

    const reply = result?.response?.text?.();

    if (!reply) throw new Error("Empty Gemini response");

    res.json({
      reply,
      model: MODEL_NAME
    });

  } catch (error) {
    console.error("❌ Gemini Error:", error.message);

    res.status(500).json({
      error: "Gemini processing failed",
      details: error.message
    });
  }
}

function healthCheck(req, res) {
  res.json({
    status: "ok",
    model: MODEL_NAME,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  processMessage,
  healthCheck,
  initializeGemini
};
