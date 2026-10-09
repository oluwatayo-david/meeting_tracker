'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { User, Meeting, ActionItem, MeetingType } from '@/types';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { StatsOverview } from '@/components/StatsOverview';
import { MeetingsView } from '@/components/MeetingsView';
import { ActionItemsView } from '@/components/ActionItemsView';
import { ManagerPortalView } from '@/components/ManagerPortalView';
import { AdminPanelView } from '@/components/AdminPanelView';
import { AiCoPilotModal } from '@/components/AiCoPilotModal';
import { SubmitProofModal } from '@/components/SubmitProofModal';
import { NewMeetingModal } from '@/components/NewMeetingModal';
import { AuditModal } from '@/components/AuditModal';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircle2, AlertCircle, Info, X, Plus, Loader2 } from 'lucide-react';

type TabId = 'overview' | 'meetings' | 'actions' | 'manager' | 'admin';

export default function Home() {
  const { supabaseUser, appUser, loading: authLoading, signOut, refreshUser } = useAuth();

  // ─── Current User ──────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ─── App State ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ─── Layout ────────────────────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ─── Modals ────────────────────────────────────────────────────────────────
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState<boolean>(false);
  const [coPilotItem, setCoPilotItem] = useState<ActionItem | null>(null);
  const [proofItem, setProofItem] = useState<ActionItem | null>(null);
  const [auditItem, setAuditItem] = useState<ActionItem | null>(null);

  // ─── Toast ─────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // ─── Build currentUser from Supabase auth ─────────────────────────────────
  const hasSyncedProfileRef = useRef(false);

  useEffect(() => {
    if (!supabaseUser) {
      setCurrentUser(null);
      return;
    }

    // Prefer the full DB profile if available
    if (appUser) {
      setCurrentUser(appUser);
      return;
    }

    // Fallback: derive from auth metadata
    const metaName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name;
    const derivedName = metaName || supabaseUser.email?.split('@')[0] || 'User';
    const derivedUser: User = {
      id: supabaseUser.id,
      name: derivedName,
      email: supabaseUser.email || '',
      role: (supabaseUser.user_metadata?.role as User['role']) || 'STAFF',
      department: supabaseUser.user_metadata?.department || '',
      avatarUrl: supabaseUser.user_metadata?.avatar_url || undefined,
      createdAt: supabaseUser.created_at,
    };
    setCurrentUser(derivedUser);

    // Sync profile to DB once on load if needed
    if (!hasSyncedProfileRef.current) {
      hasSyncedProfileRef.current = true;
      fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_profile',
          id: derivedUser.id,
          name: derivedUser.name,
          email: derivedUser.email,
          role: derivedUser.role,
          department: derivedUser.department,
        }),
      }).catch(console.warn);
    }
  }, [supabaseUser, appUser]);

  // ─── Fetch meetings and action items from DB ───────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mtgRes, actRes, usrRes] = await Promise.all([
        fetch('/api/meetings'),
        fetch('/api/action-items'),
        fetch('/api/users'),
      ]);
      const mtgData = await mtgRes.json();
      const actData = await actRes.json();
      const usrData = await usrRes.json().catch(() => ({ users: [] }));
      setMeetings(mtgData.meetings || []);
      setActionItems(actData.actionItems || []);
      setUsers(usrData.users || []);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && supabaseUser) {
      loadData();
    } else if (!authLoading && !supabaseUser) {
      // Unauthenticated — middleware should redirect, but just in case
      setLoading(false);
    }
  }, [authLoading, supabaseUser, loadData]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleCreateMeeting = async (data: {
    title: string;
    description: string;
    meetingType: MeetingType;
    transcript: string;
    participants: { name: string; email: string; type: 'INTERNAL' | 'EXTERNAL'; userId?: string }[];
  }) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          createdById: currentUser.id,
          createdByName: currentUser.name,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        const inv = result.invitations as { sent: number; failed: string[] } | undefined;
        if (inv && inv.failed.length > 0) {
          showToast(
            `Meeting "${data.title}" scheduled. ${inv.sent} invitation(s) sent; could not email: ${inv.failed.join(', ')}.`,
            'error'
          );
        } else {
          showToast(
            inv && inv.sent > 0
              ? `Meeting "${data.title}" scheduled & invitations emailed to ${inv.sent} attendee(s).`
              : `Meeting "${data.title}" scheduled.`,
            'success'
          );
        }
        await loadData();
      } else {
        showToast(result.error || 'Failed to create meeting', 'error');
      }
    } catch {
      showToast('Error communicating with server', 'error');
    }
  };

  const handleSubmitProof = async (actionItemId: string, notes: string, fileName?: string, fileUrl?: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/action-items/${actionItemId}/proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submittedById: currentUser.id, notes, fileName, fileUrl }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast('Proof submitted! Awaiting manager verification.', 'success');
        await loadData();
      } else {
        showToast(result.error || 'Failed to submit proof', 'error');
      }
    } catch {
      showToast('Error submitting proof', 'error');
    }
  };

  const handleApproveProof = async (actionItemId: string, proofId: string, notes: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/action-items/${actionItemId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId, status: 'APPROVED', reviewNotes: notes, reviewerId: currentUser.id }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast('Deliverable approved! Task marked complete.', 'success');
        await loadData();
      } else {
        showToast(result.error || 'Failed to approve', 'error');
      }
    } catch {
      showToast('Error reviewing submission', 'error');
    }
  };

  const handleRejectProof = async (actionItemId: string, proofId: string, notes: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/action-items/${actionItemId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proofId, status: 'REJECTED', reviewNotes: notes, reviewerId: currentUser.id }),
      });
      const result = await res.json();
      if (res.ok) {
        showToast('Revision feedback sent to assignee.', 'info');
        await loadData();
      } else {
        showToast(result.error || 'Failed to reject', 'error');
      }
    } catch {
      showToast('Error submitting revision feedback', 'error');
    }
  };

  const handleSendReminder = async (item: ActionItem) => {
    try {
      const res = await fetch(`/api/action-items/${item.id}/reminder`, { method: 'POST' });
      const result = await res.json();
      if (res.ok) {
        showToast(`Reminder sent to ${item.assigneeEmail || 'assignee'}!`, 'success');
        await loadData();
      } else {
        showToast(result.error || 'Failed to send reminder', 'error');
      }
    } catch {
      showToast('Error sending reminder', 'error');
    }
  };

  const handleRegenerateGuidance = async (item: ActionItem): Promise<string> => {
    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionItemId: item.id, title: item.title, description: item.description }),
      });
      const result = await res.json();
      if (res.ok) {
        await loadData();
        return result.advice;
      }
      return 'Unable to generate advice at this moment.';
    } catch {
      return 'Error requesting Gemini Co-Pilot advice.';
    }
  };

  const handleBroadcastMeeting = (meeting: Meeting) => {
    const isInternal = meeting.meetingType === 'INTERNAL';
    showToast(
      isInternal
        ? 'Private task workspace links dispatched to invited internal staff.'
        : `Meeting minutes broadcast to all ${meeting.participants.length} attendees.`,
      'success'
    );
  };

  // ─── RBAC: restrict tab access ─────────────────────────────────────────────
  const handleSelectTab = (tab: TabId) => {
    if (!currentUser) return;
    const isManager = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';
    if (tab === 'manager' && !isManager) return;
    if (tab === 'admin' && !isManager) return;
    setActiveTab(tab);
  };

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredMeetings = useMemo(() => {
    if (!searchQuery.trim()) return meetings;
    const q = searchQuery.toLowerCase();
    return meetings.filter(
      m =>
        m.title.toLowerCase().includes(q) ||
        m.description?.toLowerCase().includes(q) ||
        m.summary?.toLowerCase().includes(q) ||
        m.participants.some(p => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    );
  }, [meetings, searchQuery]);

  const filteredActionItems = useMemo(() => {
    if (!searchQuery.trim()) return actionItems;
    const q = searchQuery.toLowerCase();
    return actionItems.filter(
      a =>
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q) ||
        a.assigneeName?.toLowerCase().includes(q) ||
        a.assigneeEmail?.toLowerCase().includes(q)
    );
  }, [actionItems, searchQuery]);

  const pendingReviewsCount = actionItems.filter(
    a => a.status === 'SUBMITTED' && a.proofSubmissions.length > 0
  ).length;

  // ─── Loading / Auth Guard ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-xs font-semibold text-slate-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!supabaseUser || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-xs text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const isManager = currentUser.role === 'MANAGER' || currentUser.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">

      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onOpenNewMeeting={() => setIsNewMeetingOpen(true)}
        pendingReviewsCount={pendingReviewsCount}
        meetings={meetings}
        actionItems={actionItems}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onSignOut={handleSignOut}
      />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Header */}
        <Header
          currentUser={currentUser}
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenNewMeeting={() => setIsNewMeetingOpen(true)}
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onToggleSidebarCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          pendingReviewsCount={pendingReviewsCount}
          meetings={meetings}
          actionItems={actionItems}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSignOut={handleSignOut}
        />

        {/* Search Filter Banner */}
        {searchQuery.trim() && (
          <div className="mx-4 mt-4 sm:mx-6 lg:mx-8 flex items-center justify-between rounded-xl bg-sky-50 border border-sky-200 px-4 py-2.5 text-xs text-sky-900">
            <span>
              Filtering: <strong>&quot;{searchQuery}&quot;</strong> — {filteredMeetings.length} meetings, {filteredActionItems.length} action items
            </span>
            <button onClick={() => setSearchQuery('')} className="font-bold text-sky-700 hover:underline">
              Clear
            </button>
          </div>
        )}

        {/* Main Views */}
        <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                <p className="text-xs font-semibold text-slate-500">Loading workspace data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Overview */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  <StatsOverview
                    actionItems={filteredActionItems}
                    meetings={filteredMeetings}
                    onNavigateToActions={() => handleSelectTab('actions')}
                    onNavigateToManager={() => handleSelectTab('manager')}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Recent Meetings */}
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900">Recent Meetings</h3>
                        <button
                          onClick={() => handleSelectTab('meetings')}
                          className="text-xs font-semibold text-sky-600 hover:underline"
                        >
                          View all ({filteredMeetings.length}) →
                        </button>
                      </div>

                      <div className="space-y-3">
                        {filteredMeetings.length === 0 ? (
                          <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 space-y-2">
                            <p className="text-xs font-medium text-slate-500">No meetings recorded yet</p>
                            {isManager && (
                              <button
                                onClick={() => setIsNewMeetingOpen(true)}
                                className="text-xs font-bold text-sky-600 hover:underline inline-flex items-center gap-1"
                              >
                                <Plus className="h-3 w-3" /> Record your first meeting
                              </button>
                            )}
                          </div>
                        ) : (
                          filteredMeetings.slice(0, 3).map(m => (
                            <div key={m.id} className="rounded-xl border border-slate-100 p-3.5 bg-slate-50/50 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-800 truncate">{m.title}</span>
                                <span className="text-[10px] uppercase font-bold text-slate-500 ml-2 shrink-0">{m.meetingType}</span>
                              </div>
                              <p className="text-xs text-slate-600 line-clamp-2">{m.summary || m.description}</p>
                              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                                <span>{m.participants.length} attendees</span>
                                <span>{m.actionItems.length} tasks delegated</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Urgent & Submitted */}
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900">Urgent & Submitted Tasks</h3>
                        <button
                          onClick={() => handleSelectTab('actions')}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          Action board →
                        </button>
                      </div>

                      <div className="space-y-3">
                        {filteredActionItems.filter(a => a.status === 'SUBMITTED' || a.priority === 'URGENT').length === 0 ? (
                          <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                            <p className="text-xs font-medium text-slate-500">No urgent deliverables</p>
                          </div>
                        ) : (
                          filteredActionItems
                            .filter(a => a.status === 'SUBMITTED' || a.priority === 'URGENT')
                            .slice(0, 3)
                            .map(item => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between rounded-xl border border-slate-100 p-3 bg-slate-50/50 text-xs"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <p className="font-bold text-slate-800 truncate">{item.title}</p>
                                  <p className="text-slate-500">
                                    Assignee: <strong className="text-slate-700">{item.assigneeName || 'Unassigned'}</strong>
                                  </p>
                                </div>
                                <span
                                  className={`ml-2 shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.status === 'SUBMITTED'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {item.status === 'SUBMITTED' ? 'REVIEW READY' : item.priority}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Meetings */}
              {activeTab === 'meetings' && (
                <MeetingsView
                  meetings={filteredMeetings}
                  currentUser={currentUser}
                  onOpenNewMeeting={() => setIsNewMeetingOpen(true)}
                  onSelectActionTab={() => handleSelectTab('actions')}
                  onBroadcastMeeting={handleBroadcastMeeting}
                  onMeetingsUpdated={loadData}
                />
              )}

              {/* Action Items */}
              {activeTab === 'actions' && (
                <ActionItemsView
                  actionItems={filteredActionItems}
                  currentUser={currentUser}
                  users={users}
                  onOpenCoPilot={item => setCoPilotItem(item)}
                  onSubmitProof={item => setProofItem(item)}
                  onSendReminder={handleSendReminder}
                  onInspectAudit={item => setAuditItem(item)}
                  onActionItemsUpdated={loadData}
                />
              )}

              {/* Manager Review Portal — MANAGER/ADMIN only */}
              {activeTab === 'manager' && isManager && (
                <ManagerPortalView
                  actionItems={filteredActionItems}
                  currentUser={currentUser}
                  onApproveProof={handleApproveProof}
                  onRejectProof={handleRejectProof}
                />
              )}

              {/* Staff Onboarding & Team Admin Panel — MANAGER and ADMIN */}
              {activeTab === 'admin' && isManager && (
                <AdminPanelView
                  currentUser={currentUser}
                  onShowToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {isNewMeetingOpen && isManager && (
        <NewMeetingModal
          currentUser={currentUser}
          users={users}
          onClose={() => setIsNewMeetingOpen(false)}
          onCreateMeeting={handleCreateMeeting}
        />
      )}

      {coPilotItem && (
        <AiCoPilotModal
          actionItem={coPilotItem}
          onClose={() => setCoPilotItem(null)}
          onRegenerateGuidance={handleRegenerateGuidance}
        />
      )}

      {proofItem && (
        <SubmitProofModal
          actionItem={proofItem}
          currentUser={currentUser}
          onClose={() => setProofItem(null)}
          onSubmit={handleSubmitProof}
        />
      )}

      {auditItem && (
        <AuditModal
          actionItem={auditItem}
          onClose={() => setAuditItem(null)}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-slate-800 text-xs animate-in slide-in-from-bottom duration-300">
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="h-4 w-4 text-sky-400 shrink-0" />}
          <span className="font-medium pr-2">{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
