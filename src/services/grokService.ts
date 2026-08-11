import { supabase } from '../lib/supabase';

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function getDatabaseContext(): Promise<string> {
  try {
    const { data: firs, error } = await supabase
      .from('firs')
      .select('fir_number, status, crime_type, date, district')
      .limit(10);

    if (error || !firs) {
      return 'No database records found.';
    }

    return JSON.stringify(firs);
  } catch (err) {
    return 'Database query failed.';
  }
}

export async function askGrokChatbot(
  userPrompt: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  if (!XAI_API_KEY) {
    return 'Error: VITE_XAI_API_KEY is not defined in environment variables.';
  }

  const dbContext = await getDatabaseContext();

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an AI assistant for a law enforcement database portal. Context: ${dbContext}`,
  };

  const payload = {
    model: 'grok-beta',
    messages: [
      systemMessage,
      ...chatHistory,
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.3,
  };

  try {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY.replace(/['"]/g, '').trim()}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `API Error: ${response.status}`);
    }

    return data.choices?.[0]?.message?.content || 'No response from Grok.';
  } catch (error: any) {
    console.error('Grok Error:', error);
    return `Error: ${error.message}`;
  }
}
