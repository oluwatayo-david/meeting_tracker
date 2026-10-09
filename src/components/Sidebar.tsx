'use client';

import React from 'react';
import { User, Meeting, ActionItem } from '@/types';
import {
  BarChart3,
  Mic,
  Layers,
  ShieldCheck,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  LogOut,
  Building2,
  X,
  Settings,
  Users,
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeTab: 'overview' | 'meetings' | 'actions' | 'manager' | 'admin';
  onSelectTab: (tab: 'overview' | 'meetings' | 'actions' | 'manager' | 'admin') => void;
  onOpenNewMeeting: () => void;
  pendingReviewsCount: number;
  meetings: Meeting[];
  actionItems: ActionItem[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenNewMeeting,
  pendingReviewsCount,
  meetings,
  actionItems,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}) => {
  const isManager = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';
  const isAdmin = currentUser.role === 'ADMIN';

  const urgentCount = actionItems.filter(a => a.priority === 'URGENT' && a.status !== 'APPROVED').length;
  const submittedCount = actionItems.filter(a => a.status === 'SUBMITTED').length;

  // My action items (for STAFF view)
  const myPendingCount = actionItems.filter(
    a => a.assigneeId === currentUser.id && !['APPROVED', 'REJECTED'].includes(a.status)
  ).length;

  type TabId = 'overview' | 'meetings' | 'actions' | 'manager' | 'admin';

  const navItems: {
    id: TabId;
    label: string;
    icon: React.ElementType;
    badge?: number | null;
    badgeColor?: string;
    roleRequired?: string;
    description: string;
  }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      badge: null,
      description: 'Dashboard & key metrics',
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: Mic,
      badge: meetings.length || null,
      badgeColor: 'bg-slate-700 text-slate-300',
      description: 'Meeting recordings & transcripts',
    },
    {
      id: 'actions',
      label: currentUser.role === 'STAFF' ? 'My Tasks' : 'Action Board',
      icon: Layers,
      badge: currentUser.role === 'STAFF' ? myPendingCount || null : actionItems.filter(a => a.status !== 'APPROVED').length || null,
      badgeColor: 'bg-indigo-500/20 text-indigo-300',
      description: currentUser.role === 'STAFF' ? 'Your assigned tasks' : 'All delegated action points',
    },
    ...(isManager ? [{
      id: 'manager' as TabId,
      label: 'Review Portal',
      icon: ShieldCheck,
      badge: pendingReviewsCount > 0 ? pendingReviewsCount : null,
      badgeColor: 'bg-rose-500 text-white',
      description: 'Approve or reject submitted proofs',
      roleRequired: 'MANAGER',
    }] : []),
    ...(isManager ? [{
      id: 'admin' as TabId,
      label: isAdmin ? 'Admin & Team' : 'Staff Onboarding',
      icon: Users,
      badge: null,
      description: isAdmin ? 'Manage organization staff & roles' : 'Onboard & manage department staff',
      roleRequired: 'MANAGER',
    }] : []),
  ];

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleBadgeStyle = (role: string) => {
    if (role === 'ADMIN') return 'bg-rose-500/20 text-rose-300 border border-rose-500/30';
    if (role === 'MANAGER') return 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30';
    return 'bg-sky-500/20 text-sky-300 border border-sky-500/30';
  };

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between overflow-y-auto bg-slate-900 text-slate-200 select-none">
      {/* Top Header & Brand */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-400 shadow-lg shadow-sky-500/25 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-bold tracking-tight text-white truncate">SCIDaR ActionAI</h1>
                </div>
                <p className="text-[11px] font-medium text-slate-400 truncate flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-slate-500" />
                  {currentUser.department || 'Executive Workspace'}
                </p>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={onCloseMobile}
            className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Primary CTA: Record / New Meeting */}
        {isManager && (
          <div className="p-3">
            <button
              onClick={() => {
                onOpenNewMeeting();
                if (mobileOpen) onCloseMobile();
              }}
              title="Record Audio or Create Meeting (⌘N)"
              className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-cyan-500 p-2.5 font-semibold text-white shadow-md shadow-sky-500/20 hover:shadow-sky-500/35 hover:brightness-110 active:scale-98 transition-all ${
                collapsed ? 'px-0' : 'px-4'
              }`}
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
              {!collapsed && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-xs font-bold tracking-wide">Record / Add Meeting</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono font-normal">⌘N</span>
                </div>
              )}
            </button>
          </div>
        )}

        {/* Main Navigation */}
        <div className="px-3 py-2 space-y-1">
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Navigation
            </p>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  if (mobileOpen) onCloseMobile();
                }}
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-500/15 text-white shadow-xs border border-sky-500/30 font-bold'
                    : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                } ${collapsed ? 'justify-center px-0' : ''}`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-sky-400' : 'text-slate-400'
                  }`}
                />
                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}
                {!collapsed && item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      item.badgeColor || 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Status Views */}
        {!collapsed && (
          <div className="mt-4 px-3 space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Quick Status
            </p>

            <button
              onClick={() => {
                onSelectTab('actions');
                if (mobileOpen) onCloseMobile();
              }}
              className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                Urgent Deliverables
              </span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                {urgentCount}
              </span>
            </button>

            {isManager && (
              <button
                onClick={() => {
                  onSelectTab('manager');
                  if (mobileOpen) onCloseMobile();
                }}
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  Awaiting Sign-off
                </span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  {submittedCount}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer: User Identity — NO persona switcher, NO demo data controls */}
      <div className="border-t border-slate-800/80 p-3 bg-slate-950/70">
        {!collapsed ? (
          <div className="space-y-2">
            {/* User Profile */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-slate-800">
                  {getInitials(currentUser.name)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-white truncate max-w-[110px]">{currentUser.name}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${getRoleBadgeStyle(currentUser.role)}`}>
                      {currentUser.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                  {currentUser.department && (
                    <p className="text-[9px] text-slate-500 truncate">{currentUser.department}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1 shrink-0">
                {isAdmin && (
                  <button
                    onClick={() => onSelectTab('admin')}
                    title="Admin Settings"
                    className="text-slate-400 hover:text-sky-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={onSignOut}
                  title="Sign Out"
                  className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              title={`${currentUser.name} — ${currentUser.role}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-slate-800 cursor-pointer"
              onClick={onToggleCollapse}
            >
              {getInitials(currentUser.name)}
            </div>
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 transition-all duration-300 border-r border-slate-800 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Slide-over Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
};
