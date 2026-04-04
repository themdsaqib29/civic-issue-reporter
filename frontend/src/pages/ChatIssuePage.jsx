import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import apiClient from '../services/apiClient';
import './ChatIssuePage.css';

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
  
  // Duplicate Detection State
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [pendingSubmitPayload, setPendingSubmitPayload] = useState(null);
  
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();

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
      showWarning('Image must be less than 5MB');
      return;
    }
    
    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const apiKey = process.env.REACT_APP_IMGBB_API_KEY;
      
      if (!apiKey) {
          showError('Error: ImgBB API key is missing from environment variables.');
          return;
      }

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setImageUrl(data.data.url);
        showSuccess('Image attached successfully!');
      } else {
        showError('Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError('Upload failed: ' + error.message);
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
        severity: issueData.severity,
        image_url: imageUrl || null
      };

      // Step 1: CHECK FOR DUPLICATES FIRST (does not create issue)
      const checkResponse = await apiClient.post('/issues/check-duplicates', {
        description: issueData.description,
        category: issueData.category,
        location_address: issueData.location
      });

      // Step 2: If duplicates found, show modal and don't create issue yet
      if (checkResponse.data.duplicateDetection.isDuplicate) {
        setDuplicateWarning(checkResponse.data.duplicateDetection);
        setPendingSubmitPayload(payload);
        showWarning('Similar issue detected. Consider upvoting instead!');
        setLoading(false);
        return;
      }

      // Step 3: No duplicates found -> create issue immediately
      const createResponse = await apiClient.post('/issues', payload);
    
      if (createResponse.data.success) {
        showSuccess(`Issue submitted successfully! Priority: ${createResponse.data.priorityLevel}`);
        setIssueData(null);
        setImageUrl('');
        setDuplicateWarning(null);
        navigate('/');
      } else {
        showError('Failed to submit issue: ' + (createResponse.data.error || 'Unknown error'));
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit issue';
      showError('Error: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDuplicateSubmit = async () => {
    setLoading(true);
    
    try {
      const response = await apiClient.post('/issues', pendingSubmitPayload);
      
      if (response.data.success) {
        showSuccess(`Issue submitted successfully! Priority: ${response.data.priorityLevel}`);
        setIssueData(null);
        setImageUrl('');
        setDuplicateWarning(null);
        navigate('/');
      } else {
        showError('Failed to submit issue');
      }
    } catch (error) {
      showError('Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (issueId) => {
    setLoading(true);
    try {
      const upvoteResponse = await apiClient.post(`/issues/${issueId}/vote`);
      
      if (upvoteResponse.data.success) {
        showSuccess('✓ Thanks for upvoting! You\'ve helped prioritize this issue.');
        setDuplicateWarning(null);
        setIssueData(null);
        setImageUrl('');
        setTimeout(() => navigate('/'), 1500);
      } else {
        showError('Failed to upvote issue');
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already voted')) {
        showWarning('You\'ve already voted for this issue!');
        setTimeout(() => {
          setDuplicateWarning(null);
          setIssueData(null);
          setImageUrl('');
          navigate('/');
        }, 1500);
      } else {
        showError('Error: ' + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-page-wrapper">
      {/* Header */}
      <header className="chat-header glass-card">
        <div className="chat-header-content">
          <h2 className="chat-title">🚨 Report a Civic Issue</h2>
          <p className="chat-subtitle">Describe your concern and we'll help you get it resolved</p>
        </div>
        <button onClick={() => navigate('/')} className="glass-button ghost">
          ← Back to Home
        </button>
      </header>

      <div className="chat-page-container">
        {/* Chat Area */}
        <div className="chat-area">
          <div className="messages-container">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-message ${msg.role === 'user' ? 'user-message' : 'bot-message'} stagger-item`}
              >
                <div className="message-bubble glass-card">
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message bot-message">
                <div className="message-bubble glass-card typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Issue Preview / Input Area */}
        <div className="chat-bottom">
          {issueData ? (
            <div className="issue-preview glass-card animate-slide-up">
              {/* Summary Header */}
              <div className="issue-header">
                <h3 className="issue-title">📋 Issue Summary</h3>
                {!isEditing && (
                  <button onClick={() => setIsEditing(true)} className="glass-button">
                    ✏️ Edit
                  </button>
                )}
              </div>

              {/* Editing Form */}
              {isEditing ? (
                <div className="issue-edit-form">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select 
                      value={issueData.category} 
                      onChange={(e) => setIssueData({...issueData, category: e.target.value})}
                      className="glass-input"
                    >
                      <option value="Road Maintenance">Road Maintenance</option>
                      <option value="Garbage Collection">Garbage Collection</option>
                      <option value="Streetlight">Streetlight</option>
                      <option value="Water Supply">Water Supply</option>
                      <option value="Drainage">Drainage</option>
                      <option value="Public Health">Public Health</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea 
                      value={issueData.description} 
                      onChange={(e) => setIssueData({...issueData, description: e.target.value})}
                      className="glass-input"
                      style={{ minHeight: '80px', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input 
                      type="text" 
                      value={issueData.location} 
                      onChange={(e) => setIssueData({...issueData, location: e.target.value})}
                      className="glass-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Severity</label>
                    <select 
                      value={issueData.severity} 
                      onChange={(e) => setIssueData({...issueData, severity: e.target.value})}
                      className="glass-input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <button onClick={() => setIsEditing(false)} className="glass-button primary">
                    💾 Save Changes
                  </button>
                </div>
              ) : (
                <div className="issue-summary">
                  <div className="summary-item">
                    <span className="summary-label">Category:</span>
                    <span className="summary-value">{issueData.category}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Description:</span>
                    <span className="summary-value">{issueData.description}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Location:</span>
                    <span className="summary-value">{issueData.location}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Severity:</span>
                    <span className="summary-badge" data-severity={issueData.severity}>
                      {issueData.severity}
                    </span>
                  </div>
                </div>
              )}

              {/* Image Upload */}
              <div className="image-upload-section">
                <label className="upload-label">◆ Attach Photo Evidence (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={uploadingImage}
                  className="file-input"
                />
                
                {uploadingImage && (
                  <div className="upload-status">
                    <span className="animate-spin">↻</span> Uploading...
                  </div>
                )}
                
                {imageUrl && (
                  <div className="image-preview-container">
                    <img src={imageUrl} alt="Issue Preview" className="image-preview" />
                    <button
                      onClick={() => setImageUrl('')}
                      className="glass-button danger"
                    >
                      ✗ Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="issue-actions">
                <button
                  onClick={handleSubmitIssue}
                  disabled={loading || uploadingImage || isEditing}
                  className="glass-button primary action-btn"
                >
                  {loading ? '↻ Submitting...' : '✓ Submit Issue'}
                </button>
                
                <button
                  onClick={() => { 
                    setIssueData(null); 
                    setImageUrl(''); 
                    setMessages([{ role: 'bot', content: 'Hi! I\'m here to help you report civic issues. What problem would you like to report?' }]);
                    apiClient.post('/chat/message', { message: 'reset' }).catch(() => {});
                  }}
                  className="glass-button"
                >
                  🗑️ Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="chat-input-container glass-card">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Describe your civic concern..."
                className="chat-input glass-input"
                disabled={loading}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="chat-send-button glass-button primary"
              >
                {loading ? '...' : '→'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DUPLICATE WARNING MODAL */}
      {duplicateWarning && (
        <div className="duplicate-modal-overlay">
          <div className="duplicate-modal glass-card">
            <div className="modal-header">
              <h2>⚠️ Possible Duplicate Detected</h2>
              <button
                onClick={() => setDuplicateWarning(null)}
                className="modal-close"
              >
                ✕
              </button>
            </div>

            <div className="modal-content">
              <p className="confidence-text">
                <strong>Confidence: {duplicateWarning.confidence}%</strong>
              </p>
              <p className="duplicate-message">
                Similar issue(s) already reported. You can upvote an existing issue or submit as new.
              </p>

              {duplicateWarning.candidates && duplicateWarning.candidates.length > 0 && (
                <div className="candidates-container">
                  <h3>📍 Similar Issues Found:</h3>
                  {duplicateWarning.candidates.slice(0, 3).map((candidate) => (
                    <div key={candidate.issueId} className="candidate-card glass-card">
                      <div className="candidate-header">
                        <strong>Issue #{candidate.issueId}</strong>
                        <span className="combined-score">
                          Match: {Math.round(candidate.combined * 100)}%
                        </span>
                      </div>
                      <div className="candidate-scores">
                        <div className="score-item">
                          <span>📍 Geographic:</span>
                          <span>{(candidate.geoScore * 100).toFixed(0)}% ({candidate.distanceKm.toFixed(3)} km)</span>
                        </div>
                        <div className="score-item">
                          <span>📝 Text Similarity:</span>
                          <span>{(candidate.textSim * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUpvote(candidate.issueId)}
                        disabled={loading}
                        className="glass-button upvote-btn"
                      >
                        {loading ? '↻ Upvoting...' : '👍 Upvote This Issue'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions">
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="glass-button secondary"
                >
                  ← Back to Edit
                </button>
                <button
                  onClick={handleConfirmDuplicateSubmit}
                  disabled={loading}
                  className="glass-button primary danger"
                >
                  {loading ? '↻ Submitting...' : '✓ Report as New Issue'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatIssuePage;