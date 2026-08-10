// src/services/geminiService.ts
import { GoogleGenAI } from '@google/genai';
import { FIRCase, LandDispute, UDCase, InvestigatingOfficer } from '../types';

// Read API key safely from Vite environment variables
const getApiKey = (): string => {
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
};

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
  const apiKey = getApiKey();

  if (!apiKey) {
    return '⚠️ Gemini API Key is missing. Please add `VITE_GEMINI_API_KEY` to your environment variables or GitHub Secrets.';
  }

  try {
    // Explicitly initialize with apiKey configuration
    const ai = new GoogleGenAI({ apiKey });

    // Format dataset for Gemini context
    const formattedContext = `
YOU ARE THE AI ASSISTANT FOR THE SUBDIVISIONAL POLICE OFFICE (SDPO) TARAPUR PORTAL.
Answer queries accurately based ONLY on the provided live police dataset below.

--- LIVE DATASET ---
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
--------------------

USER ROLE: ${contextData.userRole}
USER QUESTION: "${userQuery}"

INSTRUCTIONS:
- Answer precisely using bullet points and bold formatting.
- If asked about murder cases, filter by section IPC 302 or BNS 103.
- Highlight pending supervision notes or overdue deadlines (>60/90 days) if asked.
`;

    // Fetch response with gemini-2.5-flash model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContext,
    });

    return response.text || 'No response generated.';
  } catch (err: any) {
    console.error('Gemini API Error:', err);

    // Fallback REST fetch if browser SDK headers fail on static hosts
    try {
      return await fallbackRestGeminiCall(apiKey, userQuery, contextData);
    } catch (restErr: any) {
      return `❌ Gemini API Authentication Error: ${err.message || 'Invalid API Key or unauthorized request.'}`;
    }
  }
}

// Reliable REST Fallback for Browser environments
async function fallbackRestGeminiCall(
  apiKey: string,
  userQuery: string,
  contextData: any
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
YOU ARE THE AI ASSISTANT FOR SDPO TARAPUR PORTAL.
Answer based strictly on this dataset:
FIR Cases: ${JSON.stringify(contextData.cases)}
IO Roster: ${JSON.stringify(contextData.ios)}

User Query: ${userQuery}
`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || 'REST API Call Failed');
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No output generated.';
}
