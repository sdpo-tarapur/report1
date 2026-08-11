import { supabase } from '../lib/supabase';

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const GROK_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function getDatabaseContext(): Promise<string> {
  try {
    const { data: firs, error } = await supabase
      .from('firs')
      .select('fir_number, status, crime_type, date, district')
      .limit(20);

    if (error || !firs || firs.length === 0) {
      return 'No database records found.';
    }

    return JSON.stringify(firs);
  } catch (err) {
    return 'Database query unavailable.';
  }
}

export async function askGrokChatbot(
  userPrompt: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  if (!XAI_API_KEY) {
    return 'Error: VITE_XAI_API_KEY is not set in environment variables.';
  }

  const dbContext = await getDatabaseContext();

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an intelligent AI Assistant for a Law Enforcement portal.
Database context: ${dbContext}
Answer the user query accurately using the database context provided.`,
  };

  // Ensure clean message mapping
  const cleanedHistory = chatHistory.filter(
    (msg) => msg.content && msg.content.trim() !== ''
  );

  const payload = {
    model: 'grok-2-1212', // Valid Grok model
    messages: [systemMessage, ...cleanedHistory, { role: 'user', content: userPrompt }],
    temperature: 0.3,
  };

  try {
    const response = await fetch(GROK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY.trim()}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      console.error('XAI Error Details:', errData);
      throw new Error(
        errData?.error?.message || errData?.message || `API Error: ${response.status}`
      );
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'No response received from Grok.';
  } catch (error: any) {
    console.error('Grok API Error:', error);
    return `Error communicating with Grok: ${error.message}`;
  }
}
