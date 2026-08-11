{/* Tab 7: Daily PS Crime Reports */}
        {activeTab === 'daily_reports' && (
          <DailyCrimeReportSection
            reports={dailyReports}
            currentRole={currentRole}
            onAddReport={handleAddDailyReport}
            isReadOnly={isReadOnly}
          />
        )}
      </main>

      {/* FLOATING CHATBOT BUTTON */}
      <button
        onClick={() => setIsChatbotOpen(!isChatbotOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-full shadow-2xl border-2 border-white/20 flex items-center gap-2 transition-all hover:scale-105 cursor-pointer"
        title="Open Police Search Assistant"
      >
        <Sparkles className="w-5 h-5 text-amber-300" />
        <span className="text-xs font-extrabold pr-1 hidden sm:inline">AI Police Assistant</span>
      </button>

      {/* CHATBOT MODAL */}
      <AIChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        cases={cases}
        landDisputes={landDisputes}
        udCases={udCases}
        ios={ios}
        dailyReports={dailyReports}
        currentRole={currentRole}
      />

      {/* Modals */}
      <NewFIREntryModal ... />
      <EditFIRModal ... />
      <ViewCaseModal ... />
      <UserManagementModal ... />
      <LoginModal ... />

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-1">
          <p className="font-semibold text-slate-300">
            Official Crime Supervision Portal — SDPO Tarapur Subdivision (Bihar Police)
          </p>
        </div>
      </footer>
    </div>
  );
}
