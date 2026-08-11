import { supabase } from '../lib/supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function getDatabaseContext(): Promise<string> {
  try {
    const { data: firs } = await supabase
      .from('firs')
      .select('fir_number, status, crime_type, date, district')
      .limit(10);

    return firs ? JSON.stringify(firs) : 'No records found.';
  } catch (err) {
    return 'Database query unavailable.';
  }
}

export async function askGroqChatbot(
  userPrompt: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  if (!GROQ_API_KEY) {
    return 'Error: VITE_GROQ_API_KEY is missing in your .env file.';
  }

  const dbContext = await getDatabaseContext();

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an AI assistant for a law enforcement dashboard. Database Context: ${dbContext}`,
  };

  const messages: ChatMessage[] = [
    systemMessage,
    ...chatHistory,
    { role: 'user', content: userPrompt },
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // 100% free high-performance model
        messages: messages,
        temperature: 0.2,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    return data.choices?.[0]?.message?.content || 'No response returned from Groq.';
  } catch (error: any) {
    console.error('Groq Error:', error);
    return `Groq API Error: ${error.message}`;
  }
}
