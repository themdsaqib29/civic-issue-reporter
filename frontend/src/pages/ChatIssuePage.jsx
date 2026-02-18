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
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
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
    
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await apiClient.post('/chat/message', {
        message: userMessage,
        conversationHistory: messages.map(m => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.content
        }))
      });

      if (response.data.isJson && response.data.reply.readyToSubmit) {
        setIssueData(response.data.reply.issueData);
        setMessages(prev => [...prev, {
          role: 'bot',
          content: 'Great! I\'ve gathered all the details. You can optionally attach a photo below, then submit your report.'
        }]);
      } else {
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

  const handleImageUpload = async (file) => {
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }
    
    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      // Use the environment variable for the API key
      const apiKey = process.env.REACT_APP_IMGBB_API_KEY;
      
      if (!apiKey) {
          alert('Error: ImgBB API key is missing from environment variables.');
          return;
      }

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setImageUrl(data.data.url);
        alert('✅ Image attached successfully!');
      } else {
        alert('❌ Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitIssue = async () => {
    try {
      setLoading(true);
    
      const payload = {
        title: `${issueData.category} Issue`,
        description: issueData.description,
        category: issueData.category,
        location_address: issueData.location,
        severity: issueData.severity || 'normal',
        image_url: imageUrl || null,
        location_lat: 13.0827,
        location_lng: 80.2707
      };
    
      const response = await apiClient.post('/issues', payload);
    
      if (response.data.success) {
        alert(`Issue submitted successfully! Priority: ${response.data.priorityLevel}`);
        navigate('/');
      } else {
        alert('Failed to submit issue: ' + (response.data.error || 'Unknown error'));
      }
    } catch (error) {
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

      {/* Conditionally render either the Summary/Upload OR the Chat Input */}
      {issueData ? (
        <div style={styles.issuePreview}>
          <h3>Issue Summary</h3>
          <p><strong>Category:</strong> {issueData.category}</p>
          <p><strong>Description:</strong> {issueData.description}</p>
          <p><strong>Location:</strong> {issueData.location}</p>
          <p><strong>Severity:</strong> {issueData.severity}</p>

          {/* IMAGE UPLOAD IS NOW INSIDE THE SUMMARY SECTION */}
          <div style={{ marginTop: '15px', marginBottom: '15px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #ddd' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
              📸 Attach Photo Evidence (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleImageUpload(file);
                }
              }}
              disabled={uploadingImage}
              style={{ width: '100%', padding: '8px' }}
            />
            
            {uploadingImage && <div style={{ color: '#007bff', marginTop: '10px' }}>Uploading to server...</div>}
            
            {imageUrl && (
              <div style={{ marginTop: '15px' }}>
                <img src={imageUrl} alt="Issue Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '2px solid #28a745' }} />
                <button
                  onClick={() => { setImageUrl(''); }}
                  style={{ display: 'block', marginTop: '10px', padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  ❌ Remove Photo
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleSubmitIssue}
            disabled={loading || uploadingImage} // Prevent submission while image is uploading
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