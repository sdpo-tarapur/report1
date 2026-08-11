// src/services/localChatbotService.ts
import { FIRCase, LandDispute, UDCase, InvestigatingOfficer, DailyCrimeReport } from '../types';

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

  if (!q) return 'Please type a question or select one of the quick suggestions below.';

  // -------------------------------------------------------------
  // 1. QUERY: Murder Cases / IPC 302 / BNS 103
  // -------------------------------------------------------------
  if (q.includes('murder') || q.includes('302') || q.includes('103')) {
    const murderCases = cases.filter((c) => {
      const sec = (c.sections || '').toLowerCase();
      return sec.includes('302') || sec.includes('103') || sec.includes('murder');
    });

    if (murderCases.length === 0) {
      return '✅ **No active murder cases (IPC 302 / BNS 103)** found in the database.';
    }

    let res = `### 🚨 Found ${murderCases.length} Murder Case(s):\n\n`;
    murderCases.forEach((c) => {
      res += `* **FIR No. ${c.firNumber}** (${c.ps} PS)\n`;
      res += `  * **FIR Date:** ${c.firDate} | **Limit:** ${c.deadlineDays} Days\n`;
      res += `  * **Investigating Officer:** ${c.ioName}\n`;
      res += `  * **Sections:** \`${c.sections}\` | **Complainant:** ${c.complainantName}\n`;
      res += `  * **Stage:** ${c.status}\n`;
      res += `  * **SDPO Directives:** ${c.sdpoSupervisionNote || 'Pending Supervision Note'}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // 2. QUERY: Overdue / Statutory Deadline Compliance
  // -------------------------------------------------------------
  if (q.includes('overdue') || q.includes('deadline') || q.includes('60') || q.includes('90') || q.includes('pending')) {
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
      return '✅ **All active FIR investigations are currently within statutory 60/90-day compliance limits.**';
    }

    let res = `### ⚠️ Overdue Investigations Alert (${overdueCases.length} Cases Exceeding Limit):\n\n`;
    overdueCases.forEach((c) => {
      res += `* **FIR No. ${c.firNumber}** (${c.ps} PS)\n`;
      res += `  * **Assigned IO:** ${c.ioName}\n`;
      res += `  * **Registration Date:** ${c.firDate} (Statutory Limit: ${c.deadlineDays} Days)\n`;
      res += `  * **CCTNS Sync:** CS Uploaded: ${c.chargesheetUploadedCCTNS ? 'YES' : 'NO'} | CD Synced: ${c.caseDiaryUploadedCCTNS ? 'YES' : 'NO'}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // 3. QUERY: Search by Officer / IO Name or Transferred IOs
  // -------------------------------------------------------------
  if (q.includes('transferred') || q.includes('io') || q.includes('officer')) {
    if (q.includes('transferred')) {
      const transferredIOs = ios.filter((i) => i.status === 'Transferred');
      if (transferredIOs.length === 0) {
        return '✅ **No transferred officers** found in the active roster.';
      }
      let res = `### 📋 Transferred Investigating Officers (${transferredIOs.length}):\n\n`;
      transferredIOs.forEach((i) => {
        const ioCases = cases.filter((c) => (c.ioName || '').toLowerCase().includes(i.name.toLowerCase()));
        res += `* **${i.name}** (${i.rank}, ${i.ps} PS) - Handled ${ioCases.length} Cases\n`;
      });
      return res;
    }

    // Try finding specific officer name match
    const matchedIO = ios.find((io) => q.includes(io.name.toLowerCase()));
    if (matchedIO) {
      const ioCases = cases.filter((c) => (c.ioName || '').toLowerCase().includes(matchedIO.name.toLowerCase()));
      const pending = ioCases.filter((c) => c.status === 'Under Investigation');

      let res = `### 👮 Officer Profile: ${matchedIO.name}\n`;
      res += `* **Rank & Station:** ${matchedIO.rank} — ${matchedIO.ps} PS\n`;
      res += `* **Status:** ${matchedIO.status || 'Active'} | **Phone:** ${matchedIO.phone || 'N/A'}\n`;
      res += `* **Workload:** ${pending.length} Active Pending / ${ioCases.length} Total Handled Cases\n\n`;

      if (pending.length > 0) {
        res += `**Active Investigations:**\n`;
        pending.forEach((c) => {
          res += `* FIR No. ${c.firNumber} (${c.ps} PS) — Sec: \`${c.sections}\` (Complainant: ${c.complainantName})\n`;
        });
      }
      return res;
    }
  }

  // -------------------------------------------------------------
  // 4. QUERY: Land Disputes / Janata Darbar
  // -------------------------------------------------------------
  if (q.includes('land') || q.includes('dispute') || q.includes('janata')) {
    const pendingLand = landDisputes.filter((l) => l.status === 'Pending');
    if (pendingLand.length === 0) {
      return '✅ **No pending land dispute matters** registered.';
    }

    let res = `### ⚖️ Open Land Disputes Summary (${pendingLand.length} Pending):\n\n`;
    pendingLand.forEach((l) => {
      res += `* **${l.ps} PS:** ${l.victimName} vs ${l.oppositePartyName || 'Second Party'}\n`;
      res += `  * **Plot Details:** ${l.plotDetails}\n`;
      res += `  * **Dispute Nature:** ${l.disputeNature}\n`;
      res += `  * **Janata Darbar Action:** ${l.janataDarbarAction || 'Listed'}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // 5. QUERY: Unnatural Death (UD) Cases
  // -------------------------------------------------------------
  if (q.includes('ud') || q.includes('death') || q.includes('unnatural')) {
    const activeUD = udCases.filter((u) => u.status !== 'Closed');
    if (activeUD.length === 0) {
      return '✅ **No active Unnatural Death (UD) cases** under investigation.';
    }

    let res = `### 📑 Active UD Cases (${activeUD.length}):\n\n`;
    activeUD.forEach((u) => {
      res += `* **${u.udCaseNo}** (${u.ps} PS) — Deceased: **${u.deceasedName}**\n`;
      res += `  * **Cause:** ${u.causeOfDeath} | **PM Report:** ${u.postMortemReportStatus}\n`;
      res += `  * **Viscera Status:** ${u.visceralReportStatus}\n\n`;
    });
    return res;
  }

  // -------------------------------------------------------------
  // DEFAULT HELP MENU
  // -------------------------------------------------------------
  return `### 🤖 SDPO Local Search Assistant
I can instant-search your live database records! Try typing or clicking:

* **"List all murder cases"** or **"IPC 302 cases"**
* **"Show overdue cases (>60/90 days)"**
* **"Show cases assigned to [IO Name]"**
* **"List transferred officers"**
* **"Land dispute summary"**
* **"Active UD cases"**`;
}
