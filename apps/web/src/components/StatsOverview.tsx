'use client';

import React from 'react';
import { ActionItem, Meeting } from '@/types';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileCheck2, 
  Send,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';
import { APP_NAME, COPILOT_NAME } from '@/lib/brand';
import { BrandMark } from '@/components/BrandMark';

interface StatsOverviewProps {
  actionItems: ActionItem[];
  meetings: Meeting[];
  onNavigateToActions: () => void;
  onNavigateToManager: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  actionItems,
  meetings,
  onNavigateToActions,
  onNavigateToManager,
}) => {
  const total = actionItems.length;
  const approved = actionItems.filter(a => a.status === 'APPROVED').length;
  const submitted = actionItems.filter(a => a.status === 'SUBMITTED').length;
  const inProgress = actionItems.filter(a => a.status === 'IN_PROGRESS').length;
  const pending = actionItems.filter(a => a.status === 'PENDING').length;
  const urgent = actionItems.filter(a => a.priority === 'URGENT' && a.status !== 'APPROVED').length;
  
  const resolutionRate = total > 0 ? Math.round((approved / total) * 100) : 0;
  const totalReminders = actionItems.reduce((acc, curr) => acc + curr.reminderCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Highlights */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 bottom-0 -mb-12 h-48 w-48 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-400/15 border border-sky-400/20 px-3 py-1 text-xs font-semibold text-sky-300">
              <BrandMark className="h-3.5 w-3.5 text-sky-400" />
              {APP_NAME}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Meeting Action Tracking & Execution Verification
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Automatic transcription and action point extraction, the {COPILOT_NAME} for assignees, and a closed-loop manager verification portal with email reminders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {submitted > 0 && (
              <button
                onClick={onNavigateToManager}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold text-xs px-4 py-2.5 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
              >
                <FileCheck2 className="h-4 w-4" />
                <span>{submitted} Deliverables Pending Review</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onNavigateToActions}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs font-semibold px-4 py-2.5 backdrop-blur-sm transition-all"
            >
              <span>Explore Action Board ({total})</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Resolution Rate */}
        <div className="relative rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Verification Rate</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{resolutionRate}%</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-0.5" /> +18% vs benchmark
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-2 rounded-full transition-all duration-700" 
              style={{ width: `${resolutionRate}%` }}
            ></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {approved} of {total} action points signed off by managers
          </p>
        </div>

        {/* Card 2: Pending Proof Reviews */}
        <div 
          onClick={onNavigateToManager}
          className="relative rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Manager Sign-off</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <FileCheck2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{submitted}</span>
            <span className="text-xs font-medium text-amber-600">Action Required</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Assigned leads uploaded deliverables awaiting review
          </p>
          <div className="mt-3 flex items-center text-xs font-bold text-sky-600">
            Open Review Inbox <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
          </div>
        </div>

        {/* Card 3: Execution Pipeline */}
        <div className="relative rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active In Pipeline</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{inProgress + pending}</span>
            <span className="text-xs text-slate-500">({inProgress} in progress, {pending} open)</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            {urgent > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                <AlertTriangle className="h-3 w-3" /> {urgent} Urgent
              </span>
            )}
            <span className="text-xs text-slate-500">Avg turnaround: 3.2 days</span>
          </div>
        </div>

        {/* Card 4: Automated Reminders & Meetings */}
        <div className="relative rounded-2xl bg-white p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meetings & Email Reminders</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Send className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{meetings.length}</span>
            <span className="text-xs text-slate-500">logged meetings</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {totalReminders} automated EmailJS deadline alerts dispatched to assignees
          </p>
        </div>

      </div>
    </div>
  );
};
