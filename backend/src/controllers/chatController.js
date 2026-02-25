// In-memory conversation state (per user session)
function cleanLocation(message) {
  // Extract only the location part
  const match = message.match(
    /(vadapalani|anna nagar|velachery|t nagar|tambaram|adyar|pallavaram|mylapore|guindy|porur|nanganallur|meenambakkam|chrompet|ambattur|nungambakkam|besant nagar|sholinganallur|perungudi|triplicane|egmore|kodambakkam|kk nagar|adyar|alandur|pammal|pazhavanthangal|st thomas mount|medavakkam|selaiyur|perungalathur|mudichur|gerugambakkam|manapakkam|valasaravakkam|virugambakkam|west mambalam|kilpauk|thiruvanmiyur|mandaveli|royapettah|saidapet|teynampet|alwarpet|gopalapuram|nandanam|choolaimedu|purasaiwalkam|villivakkam|perambur|mkb nagar|madhavaram|ennore|manali|avadi|poonamallee|koyambedu|moggapair|korattur|maduravoyal|iyyapanthangal|ramavaram|thirumazhisai|thiruneermalai|thirusulam|pozhal|red hills|sholavaram|minjur|near|at|opposite|beside|behind)\s.+/i
  );

  if (!match) return null;

  return match[0]
    .replace(/\blow\b|\bmedium\b|\bhigh\b|\bseverity\b/gi, '')
    .trim();
}


function cleanDescription(message) {
  // Remove common location phrases
  return message
    .replace(/(vadapalani|anna nagar|velachery|t nagar|tambaram|adyar|pallavaram|mylapore|guindy|porur|nanganallur|meenambakkam|chrompet|ambattur|nungambakkam|besant nagar|sholinganallur|perungudi|triplicane|egmore|kodambakkam|kk nagar|adyar|alandur|pammal|pazhavanthangal|st thomas mount|medavakkam|selaiyur|perungalathur|mudichur|gerugambakkam|manapakkam|valasaravakkam|virugambakkam|west mambalam|kilpauk|thiruvanmiyur|mandaveli|royapettah|saidapet|teynampet|alwarpet|gopalapuram|nandanam|choolaimedu|purasaiwalkam|villivakkam|perambur|mkb nagar|madhavaram|ennore|manali|avadi|poonamallee|koyambedu|moggapair|korattur|maduravoyal|iyyapanthangal|ramavaram|thirumazhisai|thiruneermalai|thirusulam|pozhal|red hills|sholavaram|minjur|near|at|opposite|beside|behind)\b.*/i, '')
    .replace(/\blow\b|\bmedium\b|\bhigh\b|\bseverity\b/gi, '')
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

  // LOCATION (only if location-like words exist)
  if (/(vadapalani|anna nagar|velachery|t nagar|tambaram|adyar|pallavaram|mylapore|guindy|porur|nanganallur|meenambakkam|chrompet|ambattur|nungambakkam|besant nagar|sholinganallur|perungudi|triplicane|egmore|kodambakkam|kk nagar|adyar|alandur|pammal|pazhavanthangal|st thomas mount|medavakkam|selaiyur|perungalathur|mudichur|gerugambakkam|manapakkam|valasaravakkam|virugambakkam|west mambalam|kilpauk|thiruvanmiyur|mandaveli|royapettah|saidapet|teynampet|alwarpet|gopalapuram|nandanam|choolaimedu|purasaiwalkam|villivakkam|perambur|mkb nagar|madhavaram|ennore|manali|avadi|poonamallee|koyambedu|moggapair|korattur|maduravoyal|iyyapanthangal|ramavaram|thirumazhisai|thiruneermalai|thirusulam|pozhal|red hills|sholavaram|minjur|opposite|beside|behind|at\s|near\s)/.test(msg)) {
  extracted.location = originalMessage;
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
  const loc = cleanLocation(message);
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
