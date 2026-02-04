/*
const { GoogleGenerativeAI } = require("@google/generative-ai");

class ChatController {
  async processMessage(req, res) {
    try {
      const { message, conversationHistory } = req.body;
      
      // 1. Initialize Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash", // Fast and efficient model
        systemInstruction: `You are a helpful civic issue reporting assistant for Chennai. 
        Your goal is to extract 4 details: 
        1. Category (Road, Garbage, Streetlight, Water, Drainage)
        2. Description
        3. Location
        4. Severity
        
        If details are missing, ask for them naturally.
        When you have ALL 4, return ONLY this JSON:
        { "readyToSubmit": true, "issueData": { "category": "...", "description": "...", "location": "...", "severity": "..." } }`
      });

      // 2. Format History for Gemini (User = 'user', Bot = 'model')
      const chatHistory = (conversationHistory || []).map(msg => ({
        role: msg.role === 'bot' || msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // 3. Start Chat Session
      const chat = model.startChat({
        history: chatHistory,
      });

      // 4. Send User Message
      const result = await chat.sendMessage(message);
      const botReply = result.response.text();

      // 5. Check if it's JSON (Ready to Submit)
      let parsedData = null;
      try {
        // Sometimes AI adds markdown like \`\`\`json ... \`\`\`
        const cleanJson = botReply.replace(/```json|```/g, '').trim();
        parsedData = JSON.parse(cleanJson);
      } catch (e) {
        // Not JSON, just normal conversation
      }

      res.json({
        success: true,
        reply: parsedData ? parsedData : botReply,
        isJson: !!parsedData
      });

    } catch (error) {
      console.error('Gemini Error:', error);
      res.status(500).json({
        success: false,
        error: 'AI Service Error',
        reply: "I'm having trouble connecting to the AI. Please try again."
      });
    }
  }
}

module.exports = new ChatController();
*/
/*
class ChatController {
  async processMessage(req, res) {
    try {
      const { message } = req.body;
      const lowerMsg = message.toLowerCase();

      // Simulate AI thinking time (makes it feel real)
      await new Promise(resolve => setTimeout(resolve, 1000));

      let reply = "I can help you report civic issues. Please mention the Category (Road, Garbage, etc.) and Location.";
      let issueData = null;

      // --- SIMPLE KEYWORD LOGIC ---
      
      // 1. Check for Road/Pothole
      if (lowerMsg.includes('pothole') || lowerMsg.includes('road')) {
        if (lowerMsg.includes('street') || lowerMsg.includes('nagar') || lowerMsg.includes('road')) {
          // If they mentioned a location (street/nagar), assume we are done!
          issueData = {
            category: "Road Maintenance",
            description: message,
            location: "Detected from chat (Mock Location)",
            severity: "Normal"
          };
        } else {
          reply = "I understand this is a Road issue. Could you tell me the exact location?";
        }
      }
      
      // 2. Check for Garbage
      else if (lowerMsg.includes('garbage') || lowerMsg.includes('waste')) {
        reply = "Is the garbage overflowing or is it a missed collection?";
      }

      // 3. Return Response
      res.json({
        success: true,
        reply: issueData ? issueData : reply, // If we have data, send object, else send text
        isJson: !!issueData // Tell frontend if this is final data or chat text
      });

    } catch (error) {
      console.error('Chat Error:', error);
      res.status(500).json({ success: false, reply: "System Error" });
    }
  }
}

module.exports = new ChatController();
*/

class ChatController {
  async processMessage(req, res) {
    try {
      const { message } = req.body;
      const lowerMsg = message.toLowerCase();

      // Simulate AI thinking time
      await new Promise(resolve => setTimeout(resolve, 1000));

      let finalResponse = null;

      // 1. Check for Road/Pothole
      if (lowerMsg.includes('pothole') || lowerMsg.includes('road')) {
        if (lowerMsg.includes('street') || lowerMsg.includes('nagar') || lowerMsg.includes('road')) {
          // SUCCESS: We have a "Location" (street/nagar/road)
          finalResponse = {
            readyToSubmit: true, // <--- THIS WAS MISSING
            issueData: {
              category: "Road Maintenance",
              description: message,
              location: "Detected Location (Simulated)",
              severity: "Normal"
            }
          };
        } else {
          // Partial match: Ask for location
          finalResponse = "I understand this is a Road issue. Could you tell me the exact location?";
        }
      } 
      // 2. Check for Garbage
      else if (lowerMsg.includes('garbage') || lowerMsg.includes('waste')) {
        finalResponse = "Is the garbage overflowing or is it a missed collection?";
      } 
      // 3. Default
      else {
        finalResponse = "I can help you report civic issues. Please mention the Category (Road, Garbage) and Location.";
      }

      // Check if it's a JSON object (Success) or just a String (Question)
      const isJson = typeof finalResponse === 'object';

      res.json({
        success: true,
        reply: finalResponse, 
        isJson: isJson
      });

    } catch (error) {
      console.error('Chat Error:', error);
      res.status(500).json({ success: false, reply: "System Error" });
    }
  }
}

module.exports = new ChatController();