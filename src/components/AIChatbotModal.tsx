import React, { useState } from 'react';
import { askGrokChatbot, ChatMessage } from '../services/grokService';

export const AIChatbotModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: 'Hello! I am your Grok-powered DB Assistant. How can I help you today?' },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userText = input;
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setLoading(true);

    const history: ChatMessage[] = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    const botReply = await askGrokChatbot(userText, history);

    setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    setLoading(false);
  };

  return (
    // Floating container: positioned at bottom-right, no full-screen background overlay
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col h-[500px] overflow-hidden animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
          <h2 className="font-semibold text-sm">Grok AI DB Assistant</h2>
        </div>
        <button 
          onClick={onClose} 
          className="text-gray-300 hover:text-white text-lg font-bold px-1.5 rounded hover:bg-slate-800 transition"
        >
          ✕
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 text-sm">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[85%] leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white ml-auto rounded-br-none'
                : 'bg-white text-gray-800 border border-gray-200 mr-auto rounded-bl-none shadow-sm'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="text-gray-400 text-xs italic bg-white p-2 rounded-lg border border-gray-200 w-max shadow-sm">
            Grok is thinking...
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask about cases or FIR status..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>

    </div>
  );
};
