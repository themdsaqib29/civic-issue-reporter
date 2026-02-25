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
  
  // Inline Editing State
  const [isEditing, setIsEditing] = useState(false);
  
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // SILENT AUTO-RESET ON PAGE LOAD
  useEffect(() => {
    apiClient.post('/chat/message', { message: 'reset' }).catch(err => console.error("Auto-reset failed", err));
  }, []);

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
          content: 'Great! I\'ve gathered all the details. You can review them, attach an optional photo, and submit your report below.'
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
        alert(`✅ Issue submitted successfully! Priority: ${response.data.priorityLevel}`);
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
        <h2 style={{ margin: 0 }}>Report an Issue</h2>
        <button onClick={() => navigate('/')} style={styles.backButton}>
          ← Back to Home
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>📋 Issue Summary</h3>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} style={styles.editButton}>
                ✏️ Edit Details
              </button>
            )}
          </div>

          {/* INLINE EDITING FORM */}
          {isEditing ? (
            <div style={styles.editForm}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Category:</label>
                <select 
                  value={issueData.category} 
                  onChange={(e) => setIssueData({...issueData, category: e.target.value})}
                  style={styles.editInput}
                >
                  <option value="Road Maintenance">Road Maintenance</option>
                  <option value="Garbage Collection">Garbage Collection</option>
                  <option value="Streetlight">Streetlight</option>
                  <option value="Water Supply">Water Supply</option>
                  <option value="Drainage">Drainage</option>
                  <option value="Public Health">Public Health</option>
                </select>
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Description:</label>
                <textarea 
                  value={issueData.description} 
                  onChange={(e) => setIssueData({...issueData, description: e.target.value})}
                  style={{ ...styles.editInput, minHeight: '60px' }}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Location:</label>
                <input 
                  type="text" 
                  value={issueData.location} 
                  onChange={(e) => setIssueData({...issueData, location: e.target.value})}
                  style={styles.editInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Severity:</label>
                <select 
                  value={issueData.severity} 
                  onChange={(e) => setIssueData({...issueData, severity: e.target.value})}
                  style={styles.editInput}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <button onClick={() => setIsEditing(false)} style={styles.saveEditButton}>
                💾 Save Changes
              </button>
            </div>
          ) : (
            <div style={styles.summaryDisplay}>
              <p style={styles.summaryText}><strong>Category:</strong> {issueData.category}</p>
              <p style={styles.summaryText}><strong>Description:</strong> {issueData.description}</p>
              <p style={styles.summaryText}><strong>Location:</strong> {issueData.location}</p>
              <p style={styles.summaryText}><strong>Severity:</strong> <span style={{ textTransform: 'capitalize' }}>{issueData.severity}</span></p>
            </div>
          )}

          {/* IMAGE UPLOAD */}
          <div style={styles.uploadSection}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold', color: '#333' }}>
              📸 Attach Photo Evidence (Optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleImageUpload(file);
              }}
              disabled={uploadingImage}
              style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: 'white' }}
            />
            
            {uploadingImage && <div style={{ color: '#007bff', marginTop: '10px', fontWeight: 'bold' }}>Uploading to server...</div>}
            
            {imageUrl && (
              <div style={{ marginTop: '15px', position: 'relative', display: 'inline-block' }}>
                <img src={imageUrl} alt="Issue Preview" style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '2px solid #28a745' }} />
                <button
                  onClick={() => setImageUrl('')}
                  style={styles.removeImageButton}
                >
                  ❌ Remove Photo
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={handleSubmitIssue}
              disabled={loading || uploadingImage || isEditing}
              style={styles.submitButton}
            >
              {loading ? 'Submitting...' : '🚀 Submit Final Issue'}
            </button>
            
            <button
              onClick={() => { 
                setIssueData(null); 
                setImageUrl(''); 
                setMessages([{ role: 'bot', content: 'Hi! I\'m here to help you report civic issues. What problem would you like to report?' }]);
                apiClient.post('/chat/message', { message: 'reset' }).catch(() => {});
              }}
              style={styles.resetButton}
            >
              🗑️ Cancel & Restart
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message here... or @askai to ask about civic services"
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
  container: { display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f4f6f9', fontFamily: 'system-ui, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', backgroundColor: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', zIndex: 10 },
  backButton: { padding: '8px 16px', backgroundColor: '#343a40', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' },
  chatContainer: { flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' },
  message: { maxWidth: '75%', padding: '12px 16px', borderRadius: '16px', fontSize: '15px', lineHeight: '1.4', wordWrap: 'break-word', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  userMessage: { alignSelf: 'flex-end', backgroundColor: '#007bff', color: 'white', borderBottomRightRadius: '4px' },
  botMessage: { alignSelf: 'flex-start', backgroundColor: 'white', border: '1px solid #e1e5f2', color: '#333', borderBottomLeftRadius: '4px' },
  typing: { alignSelf: 'flex-start', color: '#666', fontStyle: 'italic', padding: '8px', fontSize: '13px' },
  inputContainer: { display: 'flex', gap: '10px', padding: '20px', backgroundColor: 'white', borderTop: '1px solid #eee' },
  input: { flex: 1, padding: '14px', fontSize: '15px', border: '1px solid #ccc', borderRadius: '8px', outline: 'none' },
  sendButton: { padding: '14px 28px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' },
  
  // Summary & Editing Styles
  issuePreview: { padding: '25px', backgroundColor: 'white', borderTop: '1px solid #eee', boxShadow: '0 -4px 10px rgba(0,0,0,0.05)', zIndex: 10 },
  summaryDisplay: { backgroundColor: '#f8f9fe', padding: '15px', borderRadius: '8px', border: '1px solid #e1e5f2', marginBottom: '20px' },
  summaryText: { margin: '8px 0', fontSize: '15px', color: '#444' },
  editForm: { backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: '#666' },
  editInput: { padding: '10px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '14px', fontFamily: 'inherit' },
  editButton: { padding: '6px 12px', backgroundColor: '#ffc107', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  saveEditButton: { padding: '10px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', marginTop: '5px' },
  
  // Upload Styles
  uploadSection: { padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ccc' },
  removeImageButton: { display: 'block', marginTop: '10px', padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' },
  
  // Action Buttons
  submitButton: { flex: 2, padding: '14px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  resetButton: { flex: 1, padding: '14px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold' },
};

export default ChatIssuePage;