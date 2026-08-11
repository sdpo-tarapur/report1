// src/components/AIChatbotModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, User, MessageSquare, Shield } from 'lucide-react';
import { FIRCase, LandDispute, UDCase, InvestigatingOfficer, DailyCrimeReport, UserRole } from '../types';
import { answerLocalQuery } from '../services/localChatbotService';

interface AIChatbotModalProps {
  isOpen: boolean;
  onClose: () => void;
  cases: FIRCase[];
  landDisputes: LandDispute[];
  udCases: UDCase[];
  ios: InvestigatingOfficer[];
  dailyReports?: DailyCrimeReport[];
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
  dailyReports,
  currentRole,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Jai Hind! I am your Local Police Assistant. I can instantly search pending FIRs, murder cases, transferred IOs, or land disputes directly from your browser.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (queryText?: string) => {
    const q = queryText || input.trim();
    if (!q) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');

    // Answer query locally in 0ms
    const botReply = answerLocalQuery(q, {
      cases,
      landDisputes,
      udCases,
      ios,
      dailyReports,
      userRole: currentRole,
    });

    const botMsg: Message = {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: botReply,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, botMsg]);
  };

  const QUICK_PROMPTS = [
    'List all murder cases',
    'Pending supervision notes',
    'Show overdue (>60/90d) cases',
    'Land dispute summary',
    'List transferred IOs',
  ];

  return (
    <div className="fixed bottom-5 right-5 z-50 w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[550px] overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>SDPO Crime Search Assistant</span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase">
                Offline Mode
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Instant Local Database Search</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="bg-slate-50 dark:bg-slate-800/50 p-2 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="whitespace-nowrap bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 transition cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages Window */}
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
        <div ref={chatEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask e.g. 'Show murder cases', 'Overdue FIRs', or '[IO Name]'..."
          className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-medium text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim()}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition shadow cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
