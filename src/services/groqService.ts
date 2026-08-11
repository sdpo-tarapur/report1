import { supabase } from '../lib/supabase';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Retrieves context records from all 6 Supabase tables
 */
async function getDatabaseContext(): Promise<string> {
  try {
    // 1. Fetch FIR Cases
    const { data: cases } = await supabase
      .from('fir_cases')
      .select(`
        id, fir_number, ps, fir_date, sections, complainant_name,
        place_of_occurrence, io_name, status, designation, deadline_days,
        chargesheet_number, chargesheet_date, chargesheet_uploaded_cctns,
        case_diary_uploaded_cctns, last_case_diary_no, po_visit_date,
        sdpo_supervision_note, ci_supervision_note, ps_progress_remarks
      `)
      .order('fir_date', { ascending: false })
      .limit(15);

    // 2. Fetch Land Disputes
    const { data: landDisputes } = await supabase
      .from('land_disputes')
      .select('*')
      .order('date', { ascending: false })
      .limit(15);

    // 3. Fetch UD Cases (Unnatural Death Cases)
    const { data: udCases } = await supabase
      .from('ud_cases')
      .select('*')
      .order('date', { ascending: false })
      .limit(15);

    // 4. Fetch Daily Crime Reports
    const { data: crimeReports } = await supabase
      .from('daily_crime_reports')
      .select('*')
      .order('date', { ascending: false })
      .limit(10);

    // 5. Fetch Investigating Officers
    const { data: officers } = await supabase
      .from('investigating_officers')
      .select('*')
      .limit(15);

    // 6. Fetch Case IO Assignment History
    const { data: ioHistory } = await supabase
      .from('case_io_history')
      .select('*')
      .order('assigned_date', { ascending: false })
      .limit(10);

    // Consolidated context payload
    const contextData = {
      fir_cases: cases || [],
      land_disputes: landDisputes || [],
      ud_cases: udCases || [],
      daily_crime_reports: crimeReports || [],
      investigating_officers: officers || [],
      case_io_history: ioHistory || [],
    };

    const totalRecords =
      (cases?.length || 0) +
      (landDisputes?.length || 0) +
      (udCases?.length || 0) +
      (crimeReports?.length || 0) +
      (officers?.length || 0) +
      (ioHistory?.length || 0);

    if (totalRecords === 0) {
      return 'No active records found across the database tables.';
    }

    return JSON.stringify(contextData, null, 2);
  } catch (err) {
    console.error('Database connection error:', err);
    return 'Database query failed.';
  }
}

/**
 * Sends prompt and complete database context to Groq Cloud API
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

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are an intelligent AI assistant built directly into this Law Enforcement & Case Management Dashboard.

CRITICAL INSTRUCTIONS:
1. You have direct access to live Supabase database records provided below in JSON format (including fir_cases, land_disputes, ud_cases, daily_crime_reports, investigating_officers, and case_io_history).
2. Answer user questions accurately and concisely using this real database data.
3. You can answer queries regarding Land Disputes (status, Janata Darbar actions), UD Cases (cause of death, post-mortem/visceral status), FIRs (CCTNS uploads, deadlines, supervision notes), and Crime Statistics.
4. NEVER tell the user that you are an AI without access to a database or that this is a simulation. You ARE currently reading their real database context.

--- LIVE SUPABASE DATABASE RECORDS ---
${dbContext}
-------------------------------------`,
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
