import React, { useState } from 'react';
// Changed from askGrokChatbot / grokService -> askGroqChatbot / groqService
import { askGroqChatbot, ChatMessage } from '../services/groqService';

export const AIChatbotModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    { sender: 'bot', text: 'Hello! I am your AI DB Assistant. How can I help you today?' },
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

    // Call askGroqChatbot instead of askGrokChatbot
    const botReply = await askGroqChatbot(userText, history);

    setMessages((prev) => [...prev, { sender: 'bot', text: botReply }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col h-[500px] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center">
        <h2 className="font-semibold text-sm">Groq AI Assistant</h2>
        <button onClick={onClose} className="text-gray-300 hover:text-white font-bold">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 text-sm">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-lg max-w-[85%] ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white ml-auto'
                : 'bg-white text-gray-800 border border-gray-200 mr-auto'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && <div className="text-gray-400 text-xs italic">AI is thinking...</div>}
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
};
