const { GoogleGenAI } = require('@google/genai');

let askAiClient = null;
if (process.env.GEMINI_API_KEY) {
  askAiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// ============================================
// LOCATION MANAGEMENT (Centralized & Efficient)
// ============================================
const LOCATION_KEYWORDS = [
  'vadapalani', 'anna nagar', 'velachery', 't nagar', 'tambaram', 'adyar',
  'pallavaram', 'mylapore', 'guindy', 'porur', 'nanganallur', 'meenambakkam',
  'chrompet', 'ambattur', 'nungambakkam', 'besant nagar', 'sholinganallur',
  'perungudi', 'triplicane', 'egmore', 'kodambakkam', 'kk nagar', 'alandur',
  'pammal', 'pazhavanthangal', 'st thomas mount', 'medavakkam', 'selaiyur',
  'perungalathur', 'mudichur', 'gerugambakkam', 'manapakkam', 'valasaravakkam',
  'virugambakkam', 'west mambalam', 'kilpauk', 'thiruvanmiyur', 'mandaveli',
  'royapettah', 'saidapet', 'teynampet', 'alwarpet', 'gopalapuram', 'nandanam',
  'choolaimedu', 'purasaiwalkam', 'villivakkam', 'perambur', 'mkb nagar',
  'madhavaram', 'ennore', 'manali', 'avadi', 'poonamallee', 'koyambedu',
  'moggapair', 'korattur', 'maduravoyal', 'iyyapanthangal', 'ramavaram',
  'thirumazhisai', 'thiruneermalai', 'thirusulam', 'pozhal', 'red hills',
  'sholavaram', 'minjur'
];

const LOCATION_PATTERN = new RegExp(`\\b(${LOCATION_KEYWORDS.join('|')})\\b`, 'gi');
const LOCATION_WITH_CONTEXT = new RegExp(
  `(?:in|at|near|opposite|beside|behind)\\s+([^!?]*?(?:${LOCATION_KEYWORDS.join('|')})[^!?]*)(?:\\s*[!?.]|$)`,
  'i'
);

// In-memory conversation state (per user session)
function extractLocation(message) {
  // First, try to find "trigger + context + location"
  // E.g., "in 9th street, r.k. nagar, kilpauk" → captures full address
  const contextMatch = message.match(LOCATION_WITH_CONTEXT);
  if (contextMatch) {
    return contextMatch[1]
      .trim()
      .replace(/\b(low|medium|high|severity)\b/gi, '')
      .trim();
  }

  // Fallback: Find any location keyword and capture from there
  const locationMatch = message.match(
    new RegExp(`\\b([a-z\\s,]+)?(?:${LOCATION_KEYWORDS.join('|')})(?:\\s+[^!?,]*)?`, 'i')
  );
  
  if (locationMatch) {
    return locationMatch[0]
      .trim()
      .replace(/\b(low|medium|high|severity)\b/gi, '')
      .trim();
  }

  return null;
}


function cleanDescription(message) {
  // Remove location trigger phrases and everything after them
  return message
    .replace(/(in|at|near|opposite|beside|behind)\s+[^!?]+/gi, '')  // Remove location phrases
    .replace(/\b(low|medium|high|severity)\b/gi, '')  // Remove priority words
    .trim();
}


const userSessions = new Map();

/**
 * Helper: Extract info from a single message (smart but rule-based)
 */
function extractFromMessage(msg, originalMessage) {
  const extracted = {};

  // CATEGORY
  if (/road|pothole|crack|tar|highway|pavement|asphalt|damage|damaged/.test(msg))
    extracted.category = 'Road Maintenance';
  else if (/garbage|waste|trash|dustbin|cleaning|litter|dump/.test(msg))
    extracted.category = 'Garbage Collection';
  else if (/light|lamp|dark|pole|bulb|street.*light|electric|wire|transformer|short circuit|shock|power/.test(msg))
    extracted.category = 'Streetlight';
  else if (/water|stagnat|pipe|leak|supply|tap|burst/.test(msg))
    extracted.category = 'Water Supply';
  else if (/drain|sewage|block|overflow|clog|flood/.test(msg))
    extracted.category = 'Drainage';
  else if (/health|mosquito|disease|sanitation/.test(msg))
    extracted.category = 'Public Health';

  // SEVERITY
  if (/(low|medium|high)/.test(msg)) {
    extracted.severity = msg.match(/low|medium|high/)[0];
  }

  // LOCATION - Check if location keywords exist
  if (LOCATION_PATTERN.test(msg)) {
    extracted.location = true;  // Just mark it exists, extract later
  }

  return extracted;
}

class ChatController {

  // Get or create a session
  getSession(userId) {
    if (!userSessions.has(userId)) {
      userSessions.set(userId, {
        category: null,
        rawDescription: null,
        location: null,
        severity: null,
        phase: 'category' // category → location → severity → complete
      });
    }
    return userSessions.get(userId);
  }

  // Clear session
  clearSession(userId) {
    userSessions.delete(userId);
  }

  processMessage = async (req, res) => {
    try {
      const { message } = req.body;
      const userId = req.userId || 'demo-user';

      if (!message || !message.trim()) {
        return res.json({ success: false, reply: "Please say something!" });
      }

      const msg = message.trim().toLowerCase();

      // =====================
      // RESET COMMANDS
      // =====================
      if (['hi', 'hello', 'hey', 'start', 'restart', 'reset', 'new'].includes(msg)) {
        this.clearSession(userId);
        return res.json({
          success: true,
          reply:
            "Hi! I'm your Chennai Civic Assistant.\n\n" +
            "What issue would you like to report?\n\n" +
            "Examples:\n" +
            "• Pothole on the road\n" +
            "• Garbage not collected\n" +
            "• Streetlight not working\n" +
            "• Water supply problem\n" +
            "• Drainage blocked",
          isJson: false
        });
      }

      // =====================
// @ASKAI HANDLER
// =====================
if (msg.startsWith('@askai')) {
  const userQuery = message.replace(/@askai\s*/i, '').trim();

  if (!userQuery) {
    return res.json({
      success: true,
      reply: "👋 I'm AskAI! Ask me anything about Chennai civic services.\n\nExamples:\n• @askai how do I report a pothole?\n• @askai which department handles water supply?\n• @askai what are office hours for civic complaints?",
      isJson: false
    });
  }

  if (!askAiClient) {
    return res.json({
      success: true,
      reply: "⚠️ AskAI is not configured. Please contact the administrator.",
      isJson: false
    });
  }

  try {
    const prompt = `You are AskAI, a helpful assistant built into the Chennai Civic Issue Reporter platform — a student-built web application for reporting and tracking civic issues in Chennai.

YOUR JOB: Answer questions about this platform AND provide real Chennai civic department contact details when asked.

PLATFORM KNOWLEDGE:
- Citizens report issues via AI chat: Road Maintenance, Garbage Collection, Streetlight, Water Supply, Drainage, Public Health
- Each issue gets an AI priority score 1-10 based on severity
- Citizens can upvote issues — more votes = higher priority score
- Issues are auto-assigned to the correct department
- Department admins review and resolve issues
- Citizens get email notifications when issue is resolved
- Statuses: Pending → Acknowledged → In Progress → Resolved
- Use @askai in chat to ask questions about the platform

CHENNAI DEPARTMENT CONTACTS (use when asked):
- Road Maintenance: Greater Chennai Corporation (GCC) — 044-25619206
- Garbage / Sanitation: GCC Solid Waste Management — 044-25384519
- Streetlight: GCC Electrical Wing — 044-25383165
- Water Supply: Chennai Metro Water — 044-45674567 / 1916
- Drainage / Sewage: Chennai Metro Water — 044-45674567
- Public Health: GCC Health Wing — 044-25619206
- General GCC Helpline: 1913

RESPONSE RULES:
1. Answer exactly what the user asked — no more, no less
2. Only mention the platform if the user specifically asks about it
3. Keep responses under 100 words
4. Be friendly and concise
5. Never mention Namma Chennai app or any competing platforms

User question: ${userQuery}`;

    const result = await askAiClient.models.generateContent({
  model: 'gemini-3-flash-preview',
  contents: prompt
});
const aiReply = result.text;

    return res.json({
      success: true,
      reply: `🤖 *AskAI:*\n\n${aiReply}`,
      isJson: false
    });
  } catch (error) {
    console.error('AskAI error:', error);
    return res.json({
      success: true,
      reply: "⚠️ AskAI couldn't process that right now. Try again in a moment.",
      isJson: false
    });
  }
}

      const session = this.getSession(userId);

      // =====================
      // SMART PRE-EXTRACTION (single-message support)
      // =====================
      const extracted = extractFromMessage(msg, message);

      if (extracted.category && !session.category) {
  session.category = extracted.category;

  // Always try to extract a clean description
  const desc = cleanDescription(message);

  if (desc && desc.length > 3) {
    session.rawDescription = desc;
  }
}


      if (extracted.location && !session.location) {
  const loc = extractLocation(message);
  if (loc) {
    session.location = loc;
  }
}


      if (extracted.severity && !session.severity) {
        session.severity = extracted.severity;
      }

      // Adjust phase automatically based on what we have
      if (session.category && session.location && session.severity) {
        session.phase = 'complete';
      } else if (session.category && session.location) {
        session.phase = 'severity';
      } else if (session.category) {
        session.phase = 'location';
      }

      // =====================
      // PHASE 1: CATEGORY
      // =====================
      if (session.phase === 'category') {
        return res.json({
          success: true,
          reply:
            "I couldn't identify the issue type.\n\n" +
            "Is it related to:\n" +
            "• Roads / Potholes\n" +
            "• Garbage Collection\n" +
            "• Streetlights\n" +
            "• Water Supply\n" +
            "• Drainage",
          isJson: false
        });
      }

      // =====================
      // PHASE 2: LOCATION
      // =====================
      if (session.phase === 'location') {
        return res.json({
          success: true,
          reply:
            `Got it! This is a ${session.category} issue.\n` +
            "Where exactly is this located?\n\n" +
            "Example: 'Anna Nagar Main Road near Metro Station'",
          isJson: false
        });
      }

      // =====================
      // PHASE 3: SEVERITY
      // =====================
      if (session.phase === 'severity') {
        return res.json({
          success: true,
          reply: "What is the severity of this issue? (Low / Medium / High)",
          isJson: false
        });
      }

      // =====================
      // PHASE 4: COMPLETE
      // =====================
      if (session.phase === 'complete') {
        const finalResponse = {
          readyToSubmit: true,
          issueData: {
            category: session.category,
            description: session.rawDescription,
            location: session.location,
            severity: session.severity
          }
        };

        this.clearSession(userId);

        return res.json({
          success: true,
          reply: finalResponse,
          isJson: true
        });
      }

      // Fallback
      return res.json({
        success: true,
        reply: "Type 'reset' to start a new issue.",
        isJson: false
      });

    } catch (error) {
      console.error('Chat Error:', error);
      res.status(500).json({
        success: false,
        reply: "System error. Please try again."
      });
    }
  }
}

module.exports = new ChatController();
