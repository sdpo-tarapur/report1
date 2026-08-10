// src/services/geminiService.ts
import { FIRCase, LandDispute, UDCase, InvestigatingOfficer } from '../types';

export async function askGeminiAssistant(
  userQuery: string,
  contextData: {
    cases: FIRCase[];
    landDisputes: LandDispute[];
    udCases: UDCase[];
    ios: InvestigatingOfficer[];
    userRole: string;
  }
): Promise<string> {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return '⚠️ Gemini API Key is missing. Please set `VITE_GEMINI_API_KEY` in your `.env` file or GitHub Secrets.';
  }

  // 1. Compact dataset mapping to keep token counts low and stay within free-tier limits
  const compactCases = contextData.cases.map((c) => ({
    fir: c.firNumber,
    ps: c.ps,
    date: c.firDate,
    sec: c.sections,
    complainant: c.complainantName,
    io: c.ioName,
    type: c.designation,
    status: c.status,
    limitDays: c.deadlineDays,
    csSync: c.chargesheetUploadedCCTNS,
    cdSync: c.caseDiaryUploadedCCTNS,
    note: c.sdpoSupervisionNote || 'None',
  }));

  const compactIOs = contextData.ios.map((io) => ({
    name: io.name,
    rank: io.rank,
    ps: io.ps,
    status: io.status || 'Active',
    phone: io.phone || 'N/A',
  }));

  const compactLand = contextData.landDisputes.map((l) => ({
    ps: l.ps,
    firstParty: l.firstParty,
    secondParty: l.secondParty,
    status: l.status,
  }));

  const compactUD = contextData.udCases.map((u) => ({
    udNo: u.udCaseNumber,
    ps: u.ps,
    deceased: u.deceasedName,
    status: u.status,
  }));

  const promptText = `
You are the AI Assistant for the Sub-Divisional Police Office (SDPO) Tarapur Subdivision (Bihar Police).
Answer accurately based ONLY on this live dataset:

FIR CASES (${compactCases.length}): ${JSON.stringify(compactCases)}
IO ROSTER (${compactIOs.length}): ${JSON.stringify(compactIOs)}
LAND DISPUTES (${compactLand.length}): ${JSON.stringify(compactLand)}
UD CASES (${compactUD.length}): ${JSON.stringify(compactUD)}

USER ROLE: ${contextData.userRole}
USER QUERY: "${userQuery}"

INSTRUCTIONS:
- Keep responses factual, structured, and formatted with Markdown bold headings and bullet points.
- If asked about murder cases, search sections for IPC 302 or BNS 103.
- Highlight pending supervision notes or overdue deadlines (>60/90 days) if applicable.
`;

  // Standard production model endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      if (data.error?.code === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') {
        return '⏳ Free tier rate limit reached. Please wait ~30 seconds before asking another question.';
      }
      return `❌ Gemini API Error (${data.error?.code || response.status}): ${data.error?.message}`;
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || 'No response generated.';
  } catch (err: any) {
    return `❌ Network error connecting to Gemini API: ${err.message || 'Check network connection.'}`;
  }
}
