// src/components/AIChatbotModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, User, RefreshCw, MessageSquare } from 'lucide-react';
import { FIRCase, LandDispute, UDCase, InvestigatingOfficer, UserRole } from '../types';
import { askGeminiAssistant } from '../services/geminiService';

interface AIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: FIRCase[];
  landDisputes: LandDispute[];
  udCases: UDCase[];
  ios: InvestigatingOfficer[];
  currentRole: UserRole;
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

export const AIChatbotModal: React.FC<AIChatbotModalProps> = ({
  isOpen,
  onClose,
  cases,
  landDisputes,
  udCases,
  ios,
  currentRole,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Jai Hind! I am your AI Crime & Supervision Assistant. Ask me anything about pending FIRs, murder cases, transferred IOs, or CCTNS sync status.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (queryText?: string) => {
    const q = queryText || input.trim();
    if (!q || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);

    const botReply = await askGeminiAssistant(q, {
      cases,
      landDisputes,
      udCases,
      ios,
      userRole: currentRole,
    });

    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: botReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, botMsg]);
    setIsLoading(false);
  };

  const QUICK_PROMPTS = [
    'List all murder cases under investigation',
    'Which cases are pending supervision notes?',
    'Show all overdue (>60/90 days) FIRs',
    'List transferred IOs and their pending cases',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[600px] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>SDPO AI Crime Assistant</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30">
                Gemini 2.5
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Live Database Context Enabled</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Suggestions */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="whitespace-nowrap bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat History */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.sender === 'bot' && (
              <div className="p-2 bg-blue-600 text-white rounded-lg h-fit border border-blue-500">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-wrap leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none font-medium'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
              }`}
            >
              <div>{m.text}</div>
              <span className={`text-[9px] block mt-1 ${m.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                {m.timestamp}
              </span>
            </div>
            {m.sender === 'user' && (
              <div className="p-2 bg-slate-800 text-white rounded-lg h-fit border border-slate-700">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold p-2">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
            <span>Analyzing database records with Gemini...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask AI e.g. 'Show pending murder cases at Tarapur'..."
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={isLoading || !input.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
