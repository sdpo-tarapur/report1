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
  // Read API Key directly from Vite environment
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

  if (!apiKey) {
    return '⚠️ Gemini API Key is missing. Please set `VITE_GEMINI_API_KEY` in your `.env` file or GitHub Secrets.';
  }

  // Build structured prompt with live database context
  const promptText = `
YOU ARE THE OFFICIAL AI ASSISTANT FOR SDPO TARAPUR SUBDIVISION PORTAL (BIHAR POLICE).
Answer queries accurately using ONLY the live dataset provided below.

--- LIVE DATABASE CONTEXT ---
1. FIR CASES (${contextData.cases.length} records):
${JSON.stringify(
  contextData.cases.map((c) => ({
    firNumber: c.firNumber,
    ps: c.ps,
    firDate: c.firDate,
    sections: c.sections,
    complainant: c.complainantName,
    ioName: c.ioName,
    designation: c.designation,
    status: c.status,
    deadlineDays: c.deadlineDays,
    chargesheetUploadedCCTNS: c.chargesheetUploadedCCTNS,
    caseDiaryUploadedCCTNS: c.caseDiaryUploadedCCTNS,
    sdpoSupervisionNote: c.sdpoSupervisionNote || 'None',
  })),
  null,
  2
)}

2. LAND DISPUTES (${contextData.landDisputes.length} records):
${JSON.stringify(contextData.landDisputes, null, 2)}

3. UNNATURAL DEATH (UD) CASES (${contextData.udCases.length} records):
${JSON.stringify(contextData.udCases, null, 2)}

4. INVESTIGATING OFFICERS (${contextData.ios.length} records):
${JSON.stringify(contextData.ios, null, 2)}
----------------------------

USER ROLE: ${contextData.userRole}
USER QUERY: "${userQuery}"

INSTRUCTIONS:
- Search through the FIR cases, Land Disputes, UD cases, and IO roster above.
- If asked about murder cases, filter by sections (IPC 302 / BNS 103).
- Highlight pending supervision notes or overdue deadlines (>60/90 days).
- Respond in clear, professional Markdown format with bullet points and bold headings.
`;

  // List of candidate models to try in sequence
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-pro',
  ];

  let lastErrorMessage = '';

  // Try each model until one succeeds
  for (const modelName of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }],
            },
          ],
        }),
      });

      const data = await response.json();

      if (response.ok && !data.error) {
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) return reply;
      } else {
        lastErrorMessage = data.error?.message || `HTTP ${response.status}`;
      }
    } catch (err: any) {
      lastErrorMessage = err.message || 'Network fetch error';
    }
  }

  return `❌ Gemini API Connection Error: ${lastErrorMessage}. Please verify that your Gemini API Key is active in Google AI Studio.`;
}
