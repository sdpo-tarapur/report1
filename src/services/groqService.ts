import { supabase } from '../lib/supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Retrieves context records from Supabase
 */
async function getDatabaseContext(): Promise<string> {
  try {
    const { data: firs, error } = await supabase
      .from('firs')
      .select('fir_number, status, crime_type, date, district')
      .limit(10);

    if (error || !firs || firs.length === 0) {
      return 'No specific database records found.';
    }

    return JSON.stringify(firs);
  } catch (err) {
    return 'Database query unavailable.';
  }
}

/**
 * Sends prompt and context to Groq Cloud API
 */
export async function askGroqChatbot(
  userPrompt: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const apiKey = GROQ_API_KEY ? GROQ_API_KEY.replace(/['"]/g, '').trim() : '';

  if (!apiKey) {
    return 'Error: VITE_GROQ_API_KEY is not defined in your environment variables.';
  }

 const dbContext = await getDatabaseContext();

  // 1. Direct System Prompt to guide the AI
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an intelligent AI assistant built directly into this Law Enforcement Dashboard.

CRITICAL INSTRUCTIONS:
1. You have direct access to the live database records provided below in JSON format.
2. Answer the user's questions strictly and accurately using this database data.
3. NEVER tell the user that you are an AI without access to a database or that this is a simulation. You ARE currently reading their database context.

--- LIVE SUPABASE DATABASE RECORDS ---
${dbContext}
-------------------------------------`
  };

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an AI assistant for a law enforcement dashboard. Database Context: ${dbContext}`,
  };

  const cleanHistory = chatHistory
    .filter((m) => m && typeof m.content === 'string' && m.content.trim() !== '')
    .map((m) => ({
      role: m.role,
      content: m.content.trim(),
    }));

  const payload = {
    model: 'llama-3.3-70b-versatile',
    messages: [
      systemMessage,
      ...cleanHistory,
      { role: 'user', content: userPrompt.trim() },
    ],
    temperature: 0.2,
  };

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      console.error('Groq API Error Details:', data);
      throw new Error(data?.error?.message || `HTTP ${response.status}`);
    }

    return data.choices?.[0]?.message?.content || 'No response returned from Groq.';
  } catch (error: any) {
    console.error('Groq Execution Error:', error);
    return `Error communicating with Groq: ${error.message}`;
  }
}
