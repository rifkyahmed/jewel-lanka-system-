import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';

const JewelBot = ({ token, API_BASE }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hello! I am JewelBot, powered by NVIDIA AI. I am connected to your live gold rates and inventory. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Send conversation history (excluding the very first greeting if preferred, but we can send all)
      const historyToSent = messages.slice(1);
      
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: historyToSent
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error communicating with the NVIDIA API.' }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, the connection failed.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--color-gold)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 15px rgba(212, 175, 55, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transition: 'transform 0.2s ease'
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Bot size={30} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '380px',
          height: '550px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            background: 'var(--color-primary)',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bot size={24} color="var(--color-gold)" />
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>JewelBot <span style={{fontSize: '0.7rem', background: 'var(--color-gold)', padding: '2px 6px', borderRadius: '10px', marginLeft: '5px', color: '#000'}}>NVIDIA AI</span></div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                gap: '10px',
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                maxWidth: '85%'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-gold)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: msg.role === 'user' ? '#fff' : '#000',
                  flexShrink: 0
                }}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div style={{
                  background: msg.role === 'user' ? 'var(--color-primary)' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#1e293b',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  borderTopRightRadius: msg.role === 'user' ? '0' : '12px',
                  borderTopLeftRadius: msg.role === 'user' ? '12px' : '0',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-start' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000' }}>
                  <Bot size={16} />
                </div>
                <div style={{ background: '#fff', padding: '12px 16px', borderRadius: '12px', borderTopLeftRadius: '0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', fontSize: '0.9rem', color: 'var(--color-muted)' }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid #e2e8f0' }}>
            <form onSubmit={handleSend} style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about gold prices, profits..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '24px',
                  outline: 'none',
                  fontSize: '0.9rem'
                }}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || !input.trim()) ? 0.6 : 1
                }}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default JewelBot;
