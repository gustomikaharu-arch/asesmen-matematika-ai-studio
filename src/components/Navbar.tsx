import React from 'react';
import { School, UserCheck, ShieldCheck, Wifi, RefreshCw } from 'lucide-react';
import { ASSESSMENT_INFO } from '../data/assessmentData';

interface NavbarProps {
  currentView: 'student' | 'teacher';
  onSwitchToTeacher: () => void;
  onSwitchToStudent: () => void;
  isTeacherAuthenticated: boolean;
  onSync: () => void;
  isSyncing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSwitchToTeacher,
  onSwitchToStudent,
  isTeacherAuthenticated,
  onSync,
  isSyncing,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo & School Identity */}
        <div 
          onClick={onSwitchToStudent}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Fase C • Kelas V
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span className="hidden sm:inline">Online</span>
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
              {ASSESSMENT_INFO.school}
            </h1>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={isSyncing}
            title="Sinkronisasi Data Online"
            className="p-2 sm:px-3 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
            <span className="hidden md:inline">Sinkron</span>
          </button>

          {/* Teacher Mode Button */}
          {currentView === 'teacher' ? (
            <button
              onClick={onSwitchToStudent}
              className="px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-300"
            >
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Menu Siswa</span>
            </button>
          ) : (
            <button
              onClick={onSwitchToTeacher}
              className="px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm shadow-blue-500/25 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isTeacherAuthenticated ? 'Dashboard Guru' : 'Masuk Guru'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
