'use client';

import React, { useState } from 'react';
import { User, Meeting, ActionItem } from '@/types';
import {
  Menu,
  Search,
  Bell,
  Plus,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  LogOut,
  PanelLeft,
  User as UserIcon,
  Settings,
} from 'lucide-react';
import { APP_NAME } from '@/lib/brand';

type TabId = 'overview' | 'meetings' | 'actions' | 'manager' | 'admin';

interface HeaderProps {
  currentUser: User;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenNewMeeting: () => void;
  onOpenMobileSidebar: () => void;
  onToggleSidebarCollapse: () => void;
  pendingReviewsCount: number;
  meetings: Meeting[];
  actionItems: ActionItem[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenNewMeeting,
  onOpenMobileSidebar,
  onToggleSidebarCollapse,
  pendingReviewsCount,
  meetings,
  actionItems,
  searchQuery,
  onSearchChange,
  onSignOut,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isManager = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';

  // Tab breadcrumb title
  const getTabTitle = () => {
    switch (activeTab) {
      case 'overview': return { section: 'Dashboard', page: 'Overview & Action Intelligence' };
      case 'meetings': return { section: 'Records', page: 'Meetings, Audio & Transcripts' };
      case 'actions': return { section: 'Execution', page: currentUser.role === 'STAFF' ? 'My Action Items' : 'Action Items & Deliverables' };
      case 'manager': return { section: 'Governance', page: 'Manager Verification Portal' };
      case 'admin': return { section: 'Administration', page: 'User Management & Onboarding' };
      default: return { section: 'Workspace', page: APP_NAME };
    }
  };

  const breadcrumb = getTabTitle();

  // Notifications: recent proof submissions + meetings
  const recentActivities = [
    ...(actionItems
      .flatMap(item =>
        item.proofSubmissions.map(proof => ({
          id: proof.id,
          type: 'proof',
          title: `Proof submitted: "${item.title}"`,
          subtitle: `By ${proof.submittedByName} · ${proof.status}`,
          time: proof.submittedAt,
          status: proof.status,
        }))
      )),
    ...(meetings.slice(0, 3).map(m => ({
      id: m.id,
      type: 'meeting',
      title: `Meeting recorded: "${m.title}"`,
      subtitle: `${m.actionItems.length} action points extracted`,
      time: m.createdAt,
      status: 'PROCESSED',
    }))),
  ].slice(0, 6);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getRoleBadgeStyle = (role: string) => {
    if (role === 'ADMIN') return 'bg-rose-100 text-rose-700';
    if (role === 'MANAGER') return 'bg-indigo-100 text-indigo-700';
    return 'bg-sky-100 text-sky-700';
  };

  return (
    <header className="sticky top-0 z-20 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md transition-all">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 gap-4">

        {/* Left: Mobile Menu & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Sidebar Trigger */}
          <button
            onClick={onOpenMobileSidebar}
            title="Open navigation menu"
            className="flex lg:hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Desktop Toggle Button */}
          <button
            onClick={onToggleSidebarCollapse}
            title="Toggle sidebar size"
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>

          {/* Breadcrumb Navigation */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium truncate">
              <span>{APP_NAME}</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-600 font-medium">{breadcrumb.section}</span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 truncate">
              {breadcrumb.page}
            </h2>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search meetings, tasks, team..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-10 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2.5 shrink-0">

          {/* New Meeting CTA — only for MANAGER/ADMIN */}
          {isManager && (
            <button
              onClick={onOpenNewMeeting}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">New Meeting</span>
            </button>
          )}

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setIsNotificationsOpen(!isNotificationsOpen);
                setIsUserMenuOpen(false);
              }}
              title="Activity & Notifications"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <Bell className="h-4 w-4" />
              {pendingReviewsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs animate-bounce">
                  {pendingReviewsCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-xs font-bold text-slate-900">Activity Feed</h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {pendingReviewsCount} reviews pending
                  </span>
                </div>

                <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                  {recentActivities.length === 0 ? (
                    <p className="text-center py-4 text-xs text-slate-400">No recent activity</p>
                  ) : (
                    recentActivities.map((act) => (
                      <div
                        key={act.id}
                        onClick={() => {
                          if (act.type === 'proof') onSelectTab('manager');
                          else onSelectTab('meetings');
                          setIsNotificationsOpen(false);
                        }}
                        className="p-2 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-sky-50/50 cursor-pointer transition-colors space-y-0.5 text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          {act.type === 'proof' ? (
                            <CheckCircle2 className="h-3 w-3 text-amber-500 shrink-0" />
                          ) : (
                            <AlertCircle className="h-3 w-3 text-sky-500 shrink-0" />
                          )}
                          <p className="font-semibold text-slate-800 truncate">{act.title}</p>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-4.5 truncate">{act.subtitle}</p>
                      </div>
                    ))
                  )}
                </div>

                {pendingReviewsCount > 0 && isManager && (
                  <button
                    onClick={() => {
                      onSelectTab('manager');
                      setIsNotificationsOpen(false);
                    }}
                    className="mt-2 w-full text-xs font-semibold text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-xl px-3 py-2 transition-colors"
                  >
                    Review {pendingReviewsCount} pending submission{pendingReviewsCount !== 1 ? 's' : ''} →
                  </button>
                )}
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setIsUserMenuOpen(!isUserMenuOpen);
                setIsNotificationsOpen(false);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-1.5 hover:bg-slate-100 transition-colors"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 text-xs font-bold text-white shadow-2xs">
                {getInitials(currentUser.name)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-none">{currentUser.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium mt-0.5">
                  <span className={`px-1 rounded text-[9px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                  {currentUser.department && <span className="truncate max-w-[120px]">{currentUser.department}</span>}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:inline" />
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="p-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                  <span className={`inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getRoleBadgeStyle(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>

                <div className="space-y-0.5 text-xs">
                  <div className="flex items-center gap-2 px-2 py-1.5 text-slate-500">
                    <UserIcon className="h-3.5 w-3.5" />
                    <span className="text-[11px]">{currentUser.department || 'No department set'}</span>
                  </div>

                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        onSelectTab('admin');
                        setIsUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Settings className="h-3.5 w-3.5 text-sky-600" />
                      Admin Panel
                    </button>
                  )}

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-rose-600 hover:bg-rose-50 transition-colors font-medium"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
};
