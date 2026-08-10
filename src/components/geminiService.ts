// src/services/geminiService.ts
import { GoogleGenAI } from '@google/genai';
import { FIRCase, LandDispute, UDCase, InvestigatingOfficer } from '../types';

// Initialize Gemini API client using Vite environment variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

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
  if (!apiKey) {
    return '⚠️ Gemini API Key is missing. Please add `VITE_GEMINI_API_KEY` to your environment variables or GitHub Secrets.';
  }

  try {
    // Format live database records into concise JSON context
    const formattedContext = `
YOU ARE THE AI ASSISTANT FOR THE SUBDIVISIONAL POLICE OFFICE (SDPO) TARAPUR PORTAL.
Your job is to answer query accurately based ONLY on the provided live police dataset below.

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
    designation: c.designation, // 'SR' or 'NON_SR'
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
- Search through the FIR cases, Land Disputes, UD cases, and IO list above.
- If the user asks about murder cases (IPC 302 / BNS 103), filter the sections field for murder/302/103.
- Highlight pending supervision notes or overdue statutory deadlines (60/90 days) if relevant.
- Format the response using clear Markdown bullet points, bold headers, and clean tables if listing multiple cases.
- Be concise, professional, and precise.
`;

    // Request response using gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: formattedContext,
    });

    return response.text || 'No output received from Gemini Assistant.';
  } catch (err: any) {
    console.error('Gemini Assistant Error:', err);
    return `❌ Error querying AI Assistant: ${err.message || 'Unable to process request.'}`;
  }
}
