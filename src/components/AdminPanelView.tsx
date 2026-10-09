'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Building2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Loader2,
  Crown,
  Briefcase,
  Key,
  Copy,
  Check,
  Send,
  Search,
  Filter,
  Sparkles,
  Clock,
  Pencil,
  Ban,
} from 'lucide-react';
import { DEPARTMENTS } from '@/lib/departments';

interface AdminPanelViewProps {
  currentUser: User;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AdminPanelView: React.FC<AdminPanelViewProps> = ({ currentUser, onShowToast }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'PROVISION' | 'INVITE'>('PROVISION');
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  
  // Provisioning Result state (for copying credentials)
  const [provisionResult, setProvisionResult] = useState<{
    user: User;
    tempPassword?: string;
    loginUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit-user dialog (admins only)
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ role: 'STAFF' as User['role'], department: '', active: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const isAdmin = currentUser.role === 'ADMIN';
  const isManager = currentUser.role === 'MANAGER' || isAdmin;

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'STAFF' as User['role'],
    department: currentUser.department || 'Engineering',
    password: '',
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch {
      onShowToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [onShowToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenModal = () => {
    setProvisionResult(null);
    setForm({
      name: '',
      email: '',
      role: 'STAFF',
      department: currentUser.department || 'Engineering',
      password: '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.name || !form.department) {
      onShowToast('Please fill in all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const action = modalMode === 'PROVISION' ? 'onboard' : 'invite';
      const payload: Record<string, unknown> = {
        action,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        department: form.department,
      };
      if (modalMode === 'PROVISION' && form.password.trim()) {
        payload.password = form.password.trim();
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.ok) {
        if (modalMode === 'PROVISION') {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          setProvisionResult({
            user: data.user,
            tempPassword: data.tempPassword,
            loginUrl: `${origin}/login?email=${encodeURIComponent(form.email.trim().toLowerCase())}`,
          });
          if (data.emailSent) {
            onShowToast(`${form.name} provisioned — login details emailed to ${form.email.trim().toLowerCase()}`, 'success');
          } else {
            onShowToast(`${form.name} provisioned, but the welcome email could not be sent${data.emailError ? ` (${data.emailError})` : ''}. Share the credentials below manually.`, 'error');
          }
        } else {
          onShowToast(`Invitation email sent to ${form.email}`, 'success');
          setIsModalOpen(false);
        }
        await loadUsers();
      } else {
        onShowToast(data.error || 'Failed to onboard user', 'error');
      }
    } catch {
      onShowToast('Error communicating with server', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!provisionResult) return;
    const text = `🎉 You have been onboarded to SCIDaR ActionAI Workspace!\n\nEmail: ${provisionResult.user.email}\nTemporary Password: ${provisionResult.tempPassword}\nDepartment: ${provisionResult.user.department}\nRole: ${provisionResult.user.role}\n\nLogin here: ${provisionResult.loginUrl}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('Onboarding credentials copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 3000);
  };

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      role: user.role,
      department: user.department || '',
      active: user.status !== 'DEACTIVATED',
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editForm.role === 'MANAGER' && !editForm.department) {
      onShowToast('Choose a department for this manager', 'error');
      return;
    }

    // Send only what changed
    const patch: Record<string, unknown> = {};
    if (editForm.role !== editingUser.role) patch.role = editForm.role;
    if (editForm.department && editForm.department !== editingUser.department) patch.department = editForm.department;
    if (editForm.active !== (editingUser.status !== 'DEACTIVATED')) patch.active = editForm.active;
    if (Object.keys(patch).length === 0) {
      setEditingUser(null);
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        onShowToast(`${editingUser.name} updated`, 'success');
        setEditingUser(null);
        await loadUsers();
      } else {
        onShowToast(data.error || 'Failed to update user', 'error');
      }
    } catch {
      onShowToast('Error updating user', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'ADMIN') return <Crown className="h-3.5 w-3.5 text-rose-500" />;
    if (role === 'MANAGER') return <Shield className="h-3.5 w-3.5 text-indigo-500" />;
    return <Briefcase className="h-3.5 w-3.5 text-sky-500" />;
  };

  const getRoleBadge = (role: string) => {
    if (role === 'ADMIN') return 'bg-rose-100 text-rose-700 border border-rose-200';
    if (role === 'MANAGER') return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
    return 'bg-sky-100 text-sky-700 border border-sky-200';
  };

  const getInitials = (name: string) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  // Filter users based on role and search
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDept = 
      selectedDeptFilter === 'ALL' || u.department === selectedDeptFilter;

    // Managers only see their department unless they want all
    if (!isAdmin && currentUser.department) {
      return matchesSearch && (selectedDeptFilter === 'ALL' ? (u.department === currentUser.department || u.role === 'ADMIN') : matchesDept);
    }

    return matchesSearch && matchesDept;
  });

  const activeUsers = users.filter(u => u.status !== 'DEACTIVATED');
  const roleStats = {
    admin: activeUsers.filter(u => u.role === 'ADMIN').length,
    manager: activeUsers.filter(u => u.role === 'MANAGER').length,
    staff: activeUsers.filter(u => u.role === 'STAFF').length,
  };

  const departmentOverview = DEPARTMENTS.map(dept => {
    const members = activeUsers.filter(u => u.department === dept);
    return {
      dept,
      managers: members.filter(u => u.role === 'MANAGER'),
      staffCount: members.filter(u => u.role === 'STAFF').length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              {isAdmin ? 'Organization Team & Role Administration' : 'Department Staff Onboarding & Team Roster'}
            </h2>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${getRoleBadge(currentUser.role)}`}>
              {getRoleIcon(currentUser.role)} {currentUser.role}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin 
              ? 'World-standard RBAC: Onboard managers & staff, provision accounts, and manage departmental structures.'
              : `Onboard and manage staff members assigned to the ${currentUser.department || 'your'} department.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadUsers}
            title="Refresh team list"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 hover:from-sky-700 hover:to-indigo-700 text-white px-4 py-2.5 text-xs font-bold shadow-md shadow-sky-600/20 transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>{isAdmin ? '+ Onboard Team Member' : '+ Onboard New Staff'}</span>
          </button>
        </div>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Administrators', count: roleStats.admin, icon: Crown, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50/70', text: 'text-rose-800', border: 'border-rose-200' },
          { label: 'Department Managers', count: roleStats.manager, icon: Shield, color: 'from-indigo-500 to-violet-600', bg: 'bg-indigo-50/70', text: 'text-indigo-800', border: 'border-indigo-200' },
          { label: 'Operational Staff', count: roleStats.staff, icon: Briefcase, color: 'from-sky-500 to-cyan-600', bg: 'bg-sky-50/70', text: 'text-sky-800', border: 'border-sky-200' },
        ].map(stat => (
          <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} p-4.5 space-y-2 shadow-xs`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${stat.text} opacity-80`}>{stat.label}</span>
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br ${stat.color} shadow-xs`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </div>
            <p className={`text-2xl font-black ${stat.text}`}>{stat.count}</p>
          </div>
        ))}
      </div>

      {/* RBAC Standard Hierarchy Blueprint */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100/60 p-5 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600" />
          Enterprise RBAC Delegation Workflow
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                <Crown className="h-3 w-3" /> ADMIN
              </span>
              <span className="text-[10px] font-semibold text-rose-700">Highest Authority</span>
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Provisions system administrators and department managers. Manages cross-department roles and institutional policies.
            </p>
          </div>

          <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white">
                <Shield className="h-3 w-3" /> MANAGER
              </span>
              <span className="text-[10px] font-semibold text-indigo-700">Department Authority</span>
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Onboards staff into their department, records meetings, delegates tasks, and signs off / verifies proof of work submissions.
            </p>
          </div>

          <div className="rounded-xl border-2 border-sky-200 bg-sky-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-600 text-white">
                <Briefcase className="h-3 w-3" /> STAFF
              </span>
              <span className="text-[10px] font-semibold text-sky-700">Execution Level</span>
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              Accesses assigned tasks, leverages Gemini AI Co-Pilot for execution planning, and submits deliverables for manager sign-off.
            </p>
          </div>
        </div>
      </div>

      {/* Department Coverage — who manages each department (admins only) */}
      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            Department Coverage
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {departmentOverview.map(({ dept, managers, staffCount }) => (
              <button
                key={dept}
                type="button"
                onClick={() => setSelectedDeptFilter(dept)}
                title={`Show ${dept} members`}
                className={`text-left rounded-xl border p-3 transition-colors hover:bg-slate-50 ${
                  managers.length === 0 ? 'border-amber-200 bg-amber-50/50' : 'border-slate-200'
                } ${selectedDeptFilter === dept ? 'ring-2 ring-sky-500' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 truncate">{dept}</span>
                  <span className="text-[10px] text-slate-500 shrink-0">{staffCount} staff</span>
                </div>
                <p className="text-[11px] mt-1 truncate">
                  {managers.length > 0 ? (
                    <span className="text-indigo-700 font-medium">
                      <Shield className="inline h-3 w-3 mr-0.5 -mt-0.5" />
                      {managers.map(m => m.name).join(', ')}
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">No manager assigned</span>
                  )}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search team members by name, email, or department..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
          />
        </div>

        {isAdmin && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white pl-8 pr-8 py-2.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-xs appearance-none"
            >
              <option value="ALL">All Departments</option>
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Team Roster Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Active Team Roster ({filteredUsers.length})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No team members match the search</p>
            <button
              onClick={handleOpenModal}
              className="text-xs font-bold text-sky-600 hover:underline"
            >
              + Onboard a new team member now
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-slate-50/70 transition-colors gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-xs font-bold text-white shadow-xs">
                    {getInitials(user.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                      {user.id === currentUser.id && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">You</span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(user.role)}`}>
                        {getRoleIcon(user.role)} {user.role}
                      </span>
                      {user.status === 'DEACTIVATED' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                          <Ban className="h-3 w-3" /> Deactivated
                        </span>
                      )}
                      {user.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="h-3 w-3" /> Pending Acceptance
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      <span className="truncate">{user.email}</span>
                      {user.department && (
                        <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {user.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role Elevation / Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {isAdmin && (
                    <button
                      onClick={() => openEditUser(user)}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  )}

                  <span className="text-[10px] text-slate-400 font-mono">
                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit User Modal (admins only) */}
      {editingUser && (() => {
        const isSelf = editingUser.id === currentUser.id;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate">Edit {editingUser.name}</h3>
                  <p className="text-[11px] text-slate-500 truncate">{editingUser.email}</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['STAFF', 'MANAGER', 'ADMIN'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        disabled={isSelf}
                        onClick={() => setEditForm(f => ({ ...f, role: r }))}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                          editForm.role === r
                            ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {getRoleIcon(r)} {r}
                      </button>
                    ))}
                  </div>
                  {isSelf && <p className="text-[11px] text-slate-500">You can&apos;t change your own role.</p>}
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Department {editForm.role === 'MANAGER' && <span className="text-rose-600">*</span>}
                  </label>
                  <select
                    value={editForm.department}
                    onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    {!editForm.department && <option value="">Select a department…</option>}
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                  {editForm.role === 'MANAGER' && (
                    <p className="text-[11px] text-slate-500">
                      Managers see meetings and review work for this department only.
                    </p>
                  )}
                </div>

                {/* Account status */}
                <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Account active</p>
                    <p className="text-[11px] text-slate-500">
                      {editForm.active ? 'Can sign in and use the workspace.' : 'Sign-in blocked; history is kept.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editForm.active}
                    aria-label="Account active"
                    disabled={isSelf}
                    onClick={() => setEditForm(f => ({ ...f, active: !f.active }))}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      editForm.active ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        editForm.active ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md disabled:opacity-50"
                  >
                    {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{savingEdit ? 'Saving...' : 'Save changes'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Staff Onboarding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-xs">
                  <UserPlus className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isAdmin ? 'Onboard Team Member' : `Onboard Staff to ${currentUser.department || 'Department'}`}
                  </h3>
                  <p className="text-[11px] text-slate-500">Instant provisioning or invitation email</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Success Credential Screen */}
            {provisionResult ? (
              <div className="p-6 space-y-4">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 text-white shadow-sm mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-950">Staff Member Successfully Onboarded!</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Account for <strong>{provisionResult.user.name}</strong> ({provisionResult.user.email}) is active. Share the temporary login credentials below.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-900 text-white p-4 space-y-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>PROVISIONED CREDENTIALS</span>
                    <span>Ready to hand off</span>
                  </div>
                  <div className="space-y-1 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
                    <p><span className="text-slate-500">Email:</span> {provisionResult.user.email}</p>
                    <p><span className="text-slate-500">Temp Password:</span> <strong className="text-sky-400">{provisionResult.tempPassword}</strong></p>
                    <p><span className="text-slate-500">Department:</span> {provisionResult.user.department}</p>
                    <p><span className="text-slate-500">Role:</span> {provisionResult.user.role}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    onClick={handleCopyCredentials}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs py-2.5 transition-all shadow-md active:scale-95"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials & Access Link'}</span>
                  </button>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Onboarding Form */
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setModalMode('PROVISION')}
                    className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      modalMode === 'PROVISION'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Key className="h-3.5 w-3.5 text-sky-600" />
                    <span>Instant Provisioning</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('INVITE')}
                    className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      modalMode === 'INVITE'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Email Invitation</span>
                  </button>
                </div>

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Samuel Okonkwo"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {/* Work Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Work Email Address *</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="staff@organization.org"
                      className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {/* Department */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Department *</label>
                  {isAdmin ? (
                    <select
                      value={form.department}
                      onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      value={currentUser.department || 'Operations'}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 font-semibold cursor-not-allowed"
                    />
                  )}
                </div>

                {/* Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Assigned Account Role *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, role: 'STAFF' }))}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        form.role === 'STAFF'
                          ? 'border-sky-500 bg-sky-50 text-sky-900 ring-1 ring-sky-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Briefcase className="h-3.5 w-3.5 text-sky-600" />
                      <span>STAFF (Standard)</span>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: 'MANAGER' }))}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          form.role === 'MANAGER'
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Shield className="h-3.5 w-3.5 text-indigo-600" />
                        <span>MANAGER</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Optional Custom Password for Provisioning */}
                {modalMode === 'PROVISION' && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Temporary Password</span>
                      <span className="text-[10px] text-slate-400 font-normal">Leave blank for auto-generated password</span>
                    </label>
                    <input
                      type="text"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="e.g. Pass@123456 (or auto-generated)"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                    />
                  </div>
                )}

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 via-indigo-600 to-cyan-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
                  >
                    {submitting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : modalMode === 'PROVISION' ? (
                      <Key className="h-3.5 w-3.5" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {submitting
                        ? 'Provisioning Account...'
                        : modalMode === 'PROVISION'
                        ? 'Provision Staff Account'
                        : 'Send Email Invitation'}
                    </span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
