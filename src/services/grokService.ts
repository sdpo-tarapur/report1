import { supabase } from '../lib/supabase';

const XAI_API_KEY = import.meta.env.VITE_XAI_API_KEY;
const GROK_ENDPOINT = 'https://api.x.ai/v1/chat/completions';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Fetch context data from Supabase DB to give Grok accurate information
 */
async function getDatabaseContext() {
  try {
    // Example: Fetch recent FIR records from your Supabase table
    const { data: firs, error } = await supabase
      .from('firs')
      .select('fir_number, status, crime_type, date, district')
      .limit(20);

    if (error) {
      console.warn('Could not fetch Supabase data:', error.message);
      return 'No database records available.';
    }

    return JSON.stringify(firs, null, 2);
  } catch (err) {
    console.error('Error getting DB context:', err);
    return 'Database connection failed.';
  }
}

/**
 * Send user query to Grok API with Database Context
 */
export async function askGrokChatbot(
  userPrompt: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  if (!XAI_API_KEY) {
    return 'Error: VITE_XAI_API_KEY is not set in environment variables.';
  }

  // 1. Retrieve fresh data from your database
  const dbContext = await getDatabaseContext();

  // 2. Formulate System Prompt with DB Context
  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an intelligent AI Assistant for a Law Enforcement & Case Management Portal. 
Use the following database records to answer user queries accurately:

--- DATABASE DATA ---
${dbContext}
---------------------

If the answer is not present in the database, inform the user politely based on available facts.`,
  };

  // 3. Prepare messages payload
  const messages: ChatMessage[] = [
    systemMessage,
    ...chatHistory,
    { role: 'user', content: userPrompt },
  ];

  try {
    const response = await fetch(GROK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest', // Or 'grok-beta' / 'grok-2'
        messages: messages,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response received from Grok.';
  } catch (error: any) {
    console.error('Grok API Error:', error);
    return `Error communicating with Grok: ${error.message}`;
  }
}
