import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';

function ChatIssuePage() {
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Hi! I\'m here to help you report civic issues. What problem would you like to report?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [issueData, setIssueData] = useState(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    
    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // Send to backend
      const response = await apiClient.post('/chat/message', {
        message: userMessage,
        conversationHistory: messages.map(m => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.content
        }))
      });

      if (response.data.isJson && response.data.reply.readyToSubmit) {
        // Issue data extracted successfully
        setIssueData(response.data.reply.issueData);
        setMessages(prev => [...prev, {
          role: 'bot',
          content: 'Great! I\'ve gathered all the details. Please review and submit your issue.'
        }]);
      } else {
        // Continue conversation
        const botReply = response.data.isJson ? response.data.reply : response.data.reply;
        setMessages(prev => [...prev, {
          role: 'bot',
          content: typeof botReply === 'string' ? botReply : botReply.content || 'I didn\'t quite understand. Could you rephrase?'
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'bot',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  /*const handleSubmitIssue = async () => {
    try {
      setLoading(true);
      
      // Submit issue to backend
      const response = await apiClient.post('/issues/report', {
        title: `${issueData.category} Issue`,
        description: issueData.description,
        category: issueData.category,
        location_address: issueData.location,
        // You'll add GPS coordinates later
        location_lat: 13.0827, // Default Chennai coords for now
        location_lng: 80.2707
      });

      if (response.data.success) {
        alert('Issue submitted successfully!');
        navigate('/');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit issue');
    } finally {
      setLoading(false);
    }
  };*/

  const handleSubmitIssue = async () => {
    try {
      setLoading(true);
    
      console.log('Submitting issue data:', issueData); // DEBUG
    
      // Prepare the payload
      const payload = {
        title: `${issueData.category} Issue`,
        description: issueData.description,
        category: issueData.category,
        location_address: issueData.location,
        severity: issueData.severity || 'normal',
        location_lat: 13.0827, // Default Chennai coords
        location_lng: 80.2707
      };
    
      console.log('Sending payload:', payload); // DEBUG
    
      // Submit issue to backend
      const response = await apiClient.post('/issues', payload);
    
      console.log('Response:', response.data); // DEBUG
    
      if (response.data.success) {
        alert(`Issue submitted successfully! Priority: ${response.data.priorityLevel}`);
        navigate('/');
      } else {
        alert('Failed to submit issue: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Submit error:', error);
      console.error('Error response:', error.response?.data); // DEBUG
    
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit issue';
      alert('Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2>Report an Issue</h2>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          Back to Home
        </button>
      </div>

      <div style={styles.chatContainer}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              ...styles.message,
              ...(msg.role === 'user' ? styles.userMessage : styles.botMessage)
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && <div style={styles.typing}>Bot is typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      {issueData ? (
        <div style={styles.issuePreview}>
          <h3>Issue Summary</h3>
          <p><strong>Category:</strong> {issueData.category}</p>
          <p><strong>Description:</strong> {issueData.description}</p>
          <p><strong>Location:</strong> {issueData.location}</p>
          <p><strong>Severity:</strong> {issueData.severity}</p>
          <button
            onClick={handleSubmitIssue}
            disabled={loading}
            style={styles.submitButton}
          >
            {loading ? 'Submitting...' : 'Submit Issue'}
          </button>
          <button
            onClick={() => setIssueData(null)}
            style={styles.editButton}
          >
            Edit Details
          </button>
        </div>
      ) : (
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            style={styles.input}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={styles.sendButton}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f5f5f5',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'white',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  chatContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  message: {
    maxWidth: '70%',
    padding: '12px 16px',
    borderRadius: '12px',
    wordWrap: 'break-word',
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007bff',
    color: 'white',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    border: '1px solid #ddd',
  },
  typing: {
    alignSelf: 'flex-start',
    color: '#666',
    fontStyle: 'italic',
    padding: '8px',
  },
  inputContainer: {
    display: 'flex',
    gap: '10px',
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #ddd',
  },
  input: {
    flex: 1,
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  sendButton: {
    padding: '12px 24px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  issuePreview: {
    padding: '20px',
    backgroundColor: 'white',
    borderTop: '1px solid #ddd',
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px',
  },
  editButton: {
    padding: '12px 24px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default ChatIssuePage;