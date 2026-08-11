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

    // Map existing state to Grok chat history format
    const history: ChatMessage[] = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    // Call Grok service
    const botReply = await askGrokChatbot(userText, history);

    setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-lg p-4 flex flex-col h-[500px]">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="font-bold text-lg">Grok AI DB Assistant</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">✕</button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto my-4 space-y-2 pr-2">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`p-2 rounded-md max-w-[80%] ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white ml-auto'
                  : 'bg-gray-100 text-gray-800 mr-auto'
              }`}
            >
              {msg.text}
            </div>
          ))}
          {loading && <div className="text-gray-400 text-sm italic">Grok is thinking...</div>}
        </div>

        {/* Input Form */}
        <div className="flex gap-2 border-t pt-2">
          <input
            type="text"
            className="flex-1 border rounded p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ask about cases or FIR status..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};
