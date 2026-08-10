// src/components/IOManagement.tsx
import React, { useState } from 'react';
import { InvestigatingOfficer, FIRCase, PoliceStationName, UserRole, IOStatus } from '../types';
import { UserCheck, Plus, Phone, User, X, FileSpreadsheet, Printer, Shield, FolderOpen, ExternalLink, Search, Filter, RotateCcw, Edit2 } from 'lucide-react';
import { getPSFromRole, getDeadlineInfo } from '../utils/helpers';
import { exportToExcel, exportToPDF } from '../utils/reportExport';

interface IOManagementProps {
  ios: InvestigatingOfficer[];
  cases: FIRCase[];
  onAddIO: (newIO: Omit<InvestigatingOfficer, 'id'>) => void;
  onUpdateIOStatus: (ioId: string, status: IOStatus, phone?: string) => void;
  currentRole: UserRole;
  onSelectIOCasesFilter?: (ioName: string) => void;
  isReadOnly?: boolean;
}

export const IOManagement: React.FC<IOManagementProps> = ({
  ios = [],
  cases = [],
  onAddIO,
  onUpdateIOStatus,
  currentRole,
  onSelectIOCasesFilter,
  isReadOnly = false,
}) => {
  const activePS = getPSFromRole(currentRole);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [psFilter, setPsFilter] = useState<'ALL' | PoliceStationName | 'Subdivision HQ'>(activePS || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | IOStatus>('ALL');
  const [rankFilter, setRankFilter] = useState<string>('ALL');
  const [caseLoadFilter, setCaseLoadFilter] = useState<'ALL' | 'HAS_SR' | 'HAS_OVERDUE'>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIO, setSelectedIO] = useState<InvestigatingOfficer | null>(null);
  const [editingIO, setEditingIO] = useState<InvestigatingOfficer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [rank, setRank] = useState<InvestigatingOfficer['rank']>('Sub-Inspector (SI)');
  const [ps, setPs] = useState<PoliceStationName | 'Subdivision HQ'>(activePS || 'Tarapur');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<IOStatus>('Active');

  // Filter Logic
  const filteredIOs = ios.filter((io) => {
    if (activePS && io.ps !== activePS && io.ps !== 'Subdivision HQ') return false;
    if (!activePS && psFilter !== 'ALL' && io.ps !== psFilter) return false;
    if (statusFilter !== 'ALL' && (io.status || 'Active') !== statusFilter) return false;
    if (rankFilter !== 'ALL' && io.rank !== rankFilter) return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = io.name.toLowerCase().includes(q) || io.rank.toLowerCase().includes(q) || (io.phone && io.phone.includes(q));
      if (!match) return false;
    }

    // Case Load Filtering
    if (caseLoadFilter !== 'ALL') {
      const ioCases = cases.filter((c) => c.ioName.includes(io.name) || io.name.includes(c.ioName));
      if (caseLoadFilter === 'HAS_SR') {
        const hasSR = ioCases.some((c) => c.designation === 'SR' && c.status === 'Under Investigation');
        if (!hasSR) return false;
      }
      if (caseLoadFilter === 'HAS_OVERDUE') {
        const hasOverdue = ioCases.some((c) => getDeadlineInfo(c).code === 'OVERDUE');
        if (!hasOverdue) return false;
      }
    }

    return true;
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddIO({
      name: name.trim(),
      rank,
      ps,
      phone: phone.trim() || undefined,
      status,
    });
    setName('');
    setPhone('');
    setIsModalOpen(false);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIO) return;
    onUpdateIOStatus(editingIO.id, editingIO.status || 'Active', editingIO.phone);
    setEditingIO(null);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setPsFilter('ALL');
    setStatusFilter('ALL');
    setRankFilter('ALL');
    setCaseLoadFilter('ALL');
  };

  const handleExportExcel = () => {
    const headers = ['Officer Name', 'Rank', 'Police Station / Posting', 'Phone', 'Status', 'Active Pending Cases', 'Total Handled Cases'];
    const rows = filteredIOs.map((io) => {
      const ioCases = cases.filter((c) => c.ioName.includes(io.name) || io.name.includes(c.ioName));
      const pendingCount = ioCases.filter((c) => c.status === 'Under Investigation').length;
      return [io.name, io.rank, io.ps, io.phone || 'N/A', io.status || 'Active', pendingCount, ioCases.length];
    });
    exportToExcel('IO_Allocation_and_Transfer_Roster', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-800 text-amber-400 rounded-lg border border-slate-700 font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              Investigating Officers (IO) Roster & Transfer Tracker {activePS ? `— ${activePS} PS` : ''}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage active and transferred IOs, track past investigation records, and oversee case load distribution.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Roster</span>
          </button>
          {!isReadOnly && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add New IO</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search IO Name, Rank, Phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium text-slate-900 dark:text-white"
            />
          </div>

          {/* PS Filter */}
          {!activePS && (
            <div>
              <select
                value={psFilter}
                onChange={(e) => setPsFilter(e.target.value as any)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
              >
                <option value="ALL">All Stations / Units</option>
                <option value="Subdivision HQ">Subdivision HQ</option>
                <option value="Tarapur">Tarapur PS</option>
                <option value="Asarganj">Asarganj PS</option>
                <option value="Sangrampur">Sangrampur PS</option>
                <option value="Harpur">Harpur PS</option>
              </select>
            </div>
          )}

          {/* Active / Transferred Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">All Statuses (Active & Transferred)</option>
              <option value="Active">Active Posted Officers</option>
              <option value="Transferred">Transferred Officers</option>
            </select>
          </div>

          {/* Rank Filter */}
          <div>
            <select
              value={rankFilter}
              onChange={(e) => setRankFilter(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">All Ranks</option>
              <option value="SDPO">SDPO</option>
              <option value="Circle Inspector">Circle Inspector (CI)</option>
              <option value="Sub-Inspector (SI)">Sub-Inspector (SI)</option>
              <option value="Asst. Sub-Inspector (ASI)">Asst. Sub-Inspector (ASI)</option>
            </select>
          </div>

          {/* Case Load Filter */}
          <div>
            <select
              value={caseLoadFilter}
              onChange={(e) => setCaseLoadFilter(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold text-slate-900 dark:text-white"
            >
              <option value="ALL">All Case Loads</option>
              <option value="HAS_SR">Handling Special Reports (SR)</option>
             <option value="HAS_OVERDUE">Has Overdue (&gt;60/90d) Cases</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
          <span>Showing <strong>{filteredIOs.length}</strong> officers</span>
          <button onClick={resetFilters} className="text-blue-600 hover:underline flex items-center gap-1 font-bold">
            <RotateCcw className="w-3 h-3" /> Reset Filters
          </button>
        </div>
      </div>

      {/* IO Cards Roster */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredIOs.map((io) => {
          const ioCases = cases.filter((c) => c.ioName.includes(io.name) || io.name.includes(c.ioName));
          const pendingIoCases = ioCases.filter((c) => c.status === 'Under Investigation');
          const isTransferred = io.status === 'Transferred';

          return (
            <div
              key={io.id}
              className={`bg-white dark:bg-slate-900 rounded-xl p-4 border shadow-sm transition group space-y-3 relative ${
                isTransferred
                  ? 'border-slate-300 dark:border-slate-800 opacity-80'
                  : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/80'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded font-bold border ${isTransferred ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                      <span>{io.name}</span>
                    </h3>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">{io.rank}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {io.ps}
                  </span>
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase ${
                    isTransferred ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {io.status || 'Active'}
                  </span>
                </div>
              </div>

              {io.phone && (
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{io.phone}</span>
                </div>
              )}

              {/* Metrics */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-bold text-[10px] uppercase block">Active Pending</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{pendingIoCases.length} Cases</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-bold text-[10px] uppercase block">Total Handled</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 text-sm">{ioCases.length} Cases</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedIO(io)}
                  className="flex-1 py-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-600 hover:text-white rounded transition text-center"
                >
                  View Case Records
                </button>
                {!isReadOnly && (
                  <button
                    onClick={() => setEditingIO(io)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                    title="Edit Status / Transfer IO"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Status / Transfer Modal */}
      {editingIO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Edit Officer Posting & Status</h3>
            <form onSubmit={handleEditSave} className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Officer Name</label>
                <input type="text" value={editingIO.name} disabled className="w-full bg-slate-100 dark:bg-slate-800 border p-2 rounded font-bold" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Posting Status</label>
                <select
                  value={editingIO.status || 'Active'}
                  onChange={(e) => setEditingIO({ ...editingIO, status: e.target.value as IOStatus })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-bold"
                >
                  <option value="Active">Active Posted Officer</option>
                  <option value="Transferred">Transferred from Police Station</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editingIO.phone || ''}
                  onChange={(e) => setEditingIO({ ...editingIO, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 font-medium"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditingIO(null)} className="px-4 py-2 font-semibold text-slate-600">Cancel</button>
                <button type="submit" className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow hover:bg-blue-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
