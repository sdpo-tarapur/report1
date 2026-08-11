// src/services/localChatbotService.ts
import { FIRCase, LandDispute, UDCase, InvestigatingOfficer, DailyCrimeReport } from '../types';

// BNS (Bharatiya Nyaya Sanhita) & IPC Cross-Mapping Dictionary
const CRIME_SECTION_MAP: Record<string, { bns: string; ipc: string; terms: string[] }> = {
  murder: { bns: '103', ipc: '302', terms: ['murder', 'killing', '302', '103'] },
  attempt_to_murder: { bns: '109', ipc: '307', terms: ['attempt to murder', 'shootout', '307', '109'] },
  culpable_homicide: { bns: '105', ipc: '304', terms: ['culpable homicide', '304', '105'] },
  dacoity_robbery: { bns: '309', ipc: '392', terms: ['robbery', 'dacoity', 'loot', '392', '395', '309'] },
  snatching: { bns: '304', ipc: '379', terms: ['snatching', 'chain snatching', '304', '379'] },
  theft: { bns: '303', ipc: '379', terms: ['theft', 'stolen', '379', '303'] },
  cheating: { bns: '318', ipc: '420', terms: ['cheating', 'fraud', '420', '318'] },
  extortion: { bns: '308', ipc: '384', terms: ['extortion', 'rangdari', '384', '308'] },
  rape_sexual_assault: { bns: '63', ipc: '376', terms: ['rape', 'pocso', '376', '63', '64'] },
  kidnapping: { bns: '137', ipc: '363', terms: ['kidnapping', 'abduction', '363', '137'] },
  organized_crime: { bns: '111', ipc: 'mcosa', terms: ['organized crime', 'gangster', '111'] },
  arms_act: { bns: 'arms', ipc: 'arms', terms: ['arms act', 'firearm', 'pistol', 'rifle', '25', '27'] },
};

export function answerLocalQuery(
  userQuery: string,
  contextData: {
    cases: FIRCase[];
    landDisputes: LandDispute[];
    udCases: UDCase[];
    ios: InvestigatingOfficer[];
    dailyReports?: DailyCrimeReport[];
    userRole: string;
  }
): string {
  const q = userQuery.toLowerCase().trim();
  const { cases = [], landDisputes = [], udCases = [], ios = [], dailyReports = [] } = contextData;

  if (!q) return 'Please enter a search query or pick a prompt shortcut below.';

  // -------------------------------------------------------------
  // 1. SUPERVISION DIRECTIVES & MILESTONE DATES
  // -------------------------------------------------------------
  if (q.includes('supervision') || q.includes('directive') || q.includes('sr case') || q.includes('po visit') || q.includes('pr')) {
    const srCases = cases.filter((c) => c.designation === 'SR');

    if (q.includes('pending supervision') || q.includes('no note')) {
      const pendingMemo = srCases.filter((c) => !c.sdpoSupervisionNote || !c.supervisionDate);
      if (pendingMemo.length === 0) return '✅ **All SR Cases have issued SDPO Supervision directives.**';

      let res = `### 📋 SR Cases Pending SDPO Supervision Directive (${pendingMemo.length}):\n\n`;
      pendingMemo.forEach((c) => {
        res += `* **FIR No. ${c.firNumber}** (${c.ps} PS) — Date: ${c.firDate}\n`;
        res += `  * **Sections:** \`${c.sections}\` | **IO:** ${c.ioName}\n`;
        res += `  * **PO Visit:** ${c.poVisitDate || 'Pending Visit'}\n\n`;
      });
      return res;
    }

    if (q.includes('po visit') || q.includes('occurrence')) {
      const visited = srCases.filter((c) => c.poVisitDate);
      let res = `### 📍 Place of Occurrence (PO) Visit Status (${visited.length}/${srCases.length} Visited):\n\n`;
      srCases.forEach((c) => {
        res += `* **FIR No. ${c.firNumber}** (${c.ps} PS) — IO: ${c.ioName}\n`;
        res += `  * **PO Visit Date:** ${c.poVisitDate ? `✅ ${c.poVisitDate}` : '❌ Pending Visit'}\n`;
      });
      return res;
    }

    // Default Supervision Overview
    let res = `### 🛡️ SDPO Supervision Desk Overview (${srCases.length} SR Cases):\n\n`;
    srCases.forEach((c) => {
      res += `* **FIR No. ${c.firNumber}** (${c.ps} PS) — **IO:** ${c.ioName}\n`;
      res += `  * **Supervision Date:** ${c.supervisionDate || 'Pending Memo'}\n`;
      res += `  * **PR Count:** ${c.prDates?.length || 0} Issued | **Final PR:** ${c.finalPrDate || 'Pending'}\n`;
      res += `  * **SDPO Directive:** "${c.sdpoSupervisionNote || 'No directive entered'}"\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // 2. CRIME NAME TO LEGAL SECTIONS RESOLVER (BNS & IPC)
  // -------------------------------------------------------------
  for (const [key, mapping] of Object.entries(CRIME_SECTION_MAP)) {
    if (mapping.terms.some((term) => q.includes(term))) {
      const matchedCases = cases.filter((c) => {
        const sec = (c.sections || '').toLowerCase();
        return mapping.terms.some((term) => sec.includes(term));
      });

      if (matchedCases.length === 0) {
        return `ℹ️ **Legal Mapping:** Recognized crime category **${key.toUpperCase().replace(/_/g, ' ')}** (BNS Sec ${mapping.bns} / IPC Sec ${mapping.ipc}).\n\n✅ **No matching active cases found** in the database.`;
      }

      let res = `### 🚨 Found ${matchedCases.length} Case(s) for Crime Category: **${key.toUpperCase().replace(/_/g, ' ')}**\n`;
      res += `* **Legal Mapping Reference:** BNS Sec **${mapping.bns}** | IPC Sec **${mapping.ipc}**\n\n`;

      matchedCases.forEach((c) => {
        res += `* **FIR No. ${c.firNumber}** (${c.ps} PS)\n`;
        res += `  * **FIR Date:** ${c.firDate} | **Statutory Limit:** ${c.deadlineDays} Days\n`;
        res += `  * **Sections:** \`${c.sections}\` | **IO:** ${c.ioName}\n`;
        res += `  * **Complainant:** ${c.complainantName} | **PO:** ${c.placeOfOccurrence}\n`;
        res += `  * **Stage:** ${c.status}\n`;
        res += `  * **Supervision Directive:** ${c.sdpoSupervisionNote || 'Pending SDPO Memo'}\n\n`;
      });
      return res;
    }
  }

  // -------------------------------------------------------------
  // 3. STATUTORY 60/90 DAYS DEADLINE MONITOR
  // -------------------------------------------------------------
  if (q.includes('overdue') || q.includes('deadline') || q.includes('60') || q.includes('90') || q.includes('urgency')) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueCases = cases.filter((c) => {
      if (c.status === 'Chargesheeted / Final Form Submitted') return false;
      const firDate = new Date(c.firDate);
      firDate.setHours(0, 0, 0, 0);
      const daysElapsed = Math.floor((today.getTime() - firDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysElapsed > (c.deadlineDays || 60);
    });

    if (overdueCases.length === 0) {
      return '✅ **All active FIR investigations are compliant within statutory 60/90-day limits.**';
    }

    let res = `### ⚠️ Overdue Investigations Alert (${overdueCases.length} Cases Exceeding Limit):\n\n`;
    overdueCases.forEach((c) => {
      res += `* **FIR No. ${c.firNumber}** (${c.ps} PS) — **IO:** ${c.ioName}\n`;
      res += `  * **Date:** ${c.firDate} (Statutory Limit: ${c.deadlineDays} Days)\n`;
      res += `  * **CCTNS Sync:** CS Uploaded: ${c.chargesheetUploadedCCTNS ? 'YES' : 'NO'} | CD Synced: ${c.caseDiaryUploadedCCTNS ? 'YES' : 'NO'}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // 4. INVESTIGATING OFFICER (IO) & ROSTER SEARCH
  // -------------------------------------------------------------
  if (q.includes('io') || q.includes('officer') || q.includes('transferred') || q.includes('roster')) {
    if (q.includes('transferred')) {
      const transferredIOs = ios.filter((i) => i.status === 'Transferred');
      if (transferredIOs.length === 0) return '✅ **No transferred officers** found in active roster.';

      let res = `### 📋 Transferred Investigating Officers (${transferredIOs.length}):\n\n`;
      transferredIOs.forEach((i) => {
        const ioCases = cases.filter((c) => (c.ioName || '').toLowerCase().includes(i.name.toLowerCase()));
        res += `* **${i.name}** (${i.rank}, ${i.ps} PS) — Handled ${ioCases.length} Cases\n`;
      });
      return res;
    }

    // Direct IO name match search
    const matchedIO = ios.find((io) => q.includes(io.name.toLowerCase()));
    if (matchedIO) {
      const ioCases = cases.filter((c) => (c.ioName || '').toLowerCase().includes(matchedIO.name.toLowerCase()));
      const pending = ioCases.filter((c) => c.status === 'Under Investigation');

      let res = `### 👮 Officer Profile: ${matchedIO.name}\n`;
      res += `* **Rank & Posting:** ${matchedIO.rank} — ${matchedIO.ps} Police Station\n`;
      res += `* **Status:** ${matchedIO.status || 'Active'} | **Phone:** ${matchedIO.phone || 'N/A'}\n`;
      res += `* **Workload:** ${pending.length} Active Pending / ${ioCases.length} Total Handled Cases\n\n`;

      if (pending.length > 0) {
        res += `**Active Assigned Cases:**\n`;
        pending.forEach((c) => {
          res += `* FIR No. ${c.firNumber} (${c.ps} PS) — Sec: \`${c.sections}\` (Complainant: ${c.complainantName})\n`;
        });
      }
      return res;
    }
  }

  // -------------------------------------------------------------
  // 5. LAND DISPUTE & JANATA DARBAR
  // -------------------------------------------------------------
  if (q.includes('land') || q.includes('dispute') || q.includes('janata')) {
    const pendingLand = landDisputes.filter((l) => l.status === 'Pending');
    if (pendingLand.length === 0) return '✅ **No pending land dispute matters** registered.';

    let res = `### ⚖️ Open Land Disputes Summary (${pendingLand.length} Pending):\n\n`;
    pendingLand.forEach((l) => {
      res += `* **${l.ps} PS:** ${l.victimName} vs ${l.oppositePartyName || 'Opposite Party'}\n`;
      res += `  * **Plot Details:** ${l.plotDetails}\n`;
      res += `  * **Nature:** ${l.disputeNature}\n`;
      res += `  * **Janata Darbar Action:** ${l.janataDarbarAction || 'Listed'}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // 6. UNNATURAL DEATH (UD) CASES
  // -------------------------------------------------------------
  if (q.includes('ud') || q.includes('death') || q.includes('unnatural')) {
    const activeUD = udCases.filter((u) => u.status !== 'Closed');
    if (activeUD.length === 0) return '✅ **No active UD cases** under investigation.';

    let res = `### 📑 Active UD Cases (${activeUD.length}):\n\n`;
    activeUD.forEach((u) => {
      res += `* **${u.udCaseNo}** (${u.ps} PS) — Deceased: **${u.deceasedName}**\n`;
      res += `  * **Cause:** ${u.causeOfDeath} | **PM Status:** ${u.postMortemReportStatus}\n`;
      res += `  * **Viscera Testing:** ${u.visceralReportStatus}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // 7. DAILY POLICE STATION CRIME REPORTS
  // -------------------------------------------------------------
  if (q.includes('daily') || q.includes('patrol') || q.includes('report') || q.includes('arrest')) {
    if (dailyReports.length === 0) return 'ℹ️ **No daily crime reports logged today.**';

    let res = `### 📰 Recent Daily Police Station Reports (${dailyReports.length}):\n\n`;
    dailyReports.slice(0, 5).forEach((r) => {
      res += `* **${r.ps} PS** (${r.date}) — Logged by: ${r.submittedBy}\n`;
      res += `  * **FIRs Registered:** ${r.firsRegisteredCount} | **Arrests Made:** ${r.arrestsCount}\n`;
      res += `  * **Seizures:** ${r.seizuresSummary || 'None'}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // DEFAULT HELP MENU
  // -------------------------------------------------------------
  return `### 🤖 Advanced SDPO Crime & Supervision Assistant
I can instant-search all tabs & legal sections! Try typing or clicking:

* **Crime Search:** *"Show murder cases"* (Maps BNS 103 / IPC 302), *"Snatching"*, *"Dacoity"*, *"Cheating"*
* **Supervision:** *"Show supervision status"*, *"Pending supervision notes"*, *"PO visit status"*
* **Statutory Compliance:** *"Overdue cases (>60/90 days)"*
* **Officers:** *"Show cases of [IO Name]"* or *"Transferred IOs"*
* **Land & UD Desks:** *"Land dispute summary"*, *"UD cases"*`;
}
