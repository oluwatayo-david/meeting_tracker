'use client';

/*
 * Building blocks for the product screens shown on the landing page.
 *
 * Every screen is a faithful re-creation of the real web app (apps/web) —
 * same layout, components, Tailwind classes and wording — rendered at a fixed
 * "design" resolution and scaled down to fit, exactly like a screenshot would.
 * Unlike a PNG it stays razor sharp at any size and can animate.
 * People, meetings and numbers are illustrative sample data.
 */

import React, { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  Clock,
  FileCheck2,
  Layers,
  Lock,
  LogOut,
  Menu,
  Mic,
  PanelLeft,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { APP_NAME } from '@synclog/brand';
import { BrandMark } from '@synclog/brand/mark';
import { cn } from '@/lib/utils';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/* ─── Scaled screen ───────────────────────────────────────────────────────── */

const ScreenContext = createContext<{ compact: boolean }>({ compact: false });
export const useScreen = () => useContext(ScreenContext);

/**
 * Renders children at a fixed design size and scales them to the container's
 * width. Below `compactBelow` px it switches to the app's narrow layout
 * (no sidebar), just as the real app does on small screens.
 */
export const ScaledScreen: React.FC<{
  width: number;
  height: number;
  compactWidth?: number;
  compactHeight?: number;
  compactBelow?: number;
  label: string;
  className?: string;
  children: React.ReactNode;
}> = ({ width, height, compactWidth, compactHeight, compactBelow = 560, label, className, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<{ scale: number; compact: boolean } | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const compact = !!compactWidth && w < compactBelow;
      setState({ scale: w / (compact ? compactWidth! : width), compact });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, compactWidth, compactBelow]);

  const compact = state?.compact ?? false;
  const w = compact ? compactWidth! : width;
  const h = compact ? (compactHeight ?? height) : height;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ aspectRatio: `${w} / ${h}` }}
    >
      <div
        aria-hidden
        className="absolute left-0 top-0 origin-top-left select-none font-[family-name:var(--font-geist-sans)] text-slate-900 antialiased"
        style={{ width: w, height: h, transform: `scale(${state?.scale ?? 1})`, visibility: state ? undefined : 'hidden' }}
      >
        <ScreenContext.Provider value={{ compact }}>{children}</ScreenContext.Provider>
      </div>
    </div>
  );
};

/* ─── Shared sample data (lives in ./data so server components can use it) ── */

import { USERS, type Role, type ScreenUser, type Status, type Priority } from './data';
export { USERS, MEETING, ACTIONS } from './data';
export type { Role, ScreenUser, Status, Priority } from './data';

export const initials = (name: string) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

/* ─── Badges (identical to apps/web ActionItemsView) ──────────────────────── */

const STATUS: Record<Status, { label: string; cls: string; icon: React.ElementType }> = {
  APPROVED: { label: 'Approved & Verified', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  SUBMITTED: { label: 'Awaiting Review', cls: 'bg-amber-50 text-amber-700 border-amber-200', icon: FileCheck2 },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Clock },
  REJECTED: { label: 'Revision Needed', cls: 'bg-rose-50 text-rose-700 border-rose-200', icon: AlertTriangle },
  PENDING: { label: 'Pending', cls: 'bg-slate-100 text-slate-700 border-slate-200', icon: Clock },
};

export const StatusBadge: React.FC<{ status: Status; className?: string }> = ({ status, className }) => {
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold', s.cls, className)}>
      <s.icon className="h-3 w-3" /> {s.label}
    </span>
  );
};

const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  URGENT: { label: 'Urgent', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  HIGH: { label: 'High Priority', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  MEDIUM: { label: 'Medium', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  LOW: { label: 'Low', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export const PriorityBadge: React.FC<{ priority: Priority }> = ({ priority }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-bold', PRIORITY[priority].cls)}>
    {PRIORITY[priority].label}
  </span>
);

/* ─── Toast (identical to apps/web page.tsx) ──────────────────────────────── */

export const AppToast: React.FC<{ show: boolean; message: string; tone?: 'success' | 'info' }> = ({
  show,
  message,
  tone = 'success',
}) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="absolute bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-white shadow-2xl"
      >
        {tone === 'success' ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
        ) : (
          <AlertCircle className="h-4 w-4 shrink-0 text-sky-400" />
        )}
        <span className="pr-2 font-medium">{message}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

/* ─── Browser chrome ──────────────────────────────────────────────────────── */

export const BrowserChrome: React.FC<{ url?: string }> = ({ url = 'app.synclog.com' }) => (
  <div className="flex h-10 shrink-0 items-center gap-3 border-b border-slate-200 bg-slate-100 px-4">
    <div className="flex gap-1.5">
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
    </div>
    <div className="mx-auto flex w-80 items-center justify-center gap-1.5 rounded-md bg-white py-1 text-[12px] text-slate-500 ring-1 ring-slate-200">
      <Lock className="h-3 w-3 text-slate-400" />
      {url}
    </div>
    <div className="w-12" />
  </div>
);

/* ─── App shell: Sidebar + Header (mirrors apps/web Sidebar.tsx / Header.tsx) */

export type Tab = 'overview' | 'meetings' | 'actions' | 'manager' | 'admin';

const BREADCRUMB: Record<Tab, (role: Role) => { section: string; page: string }> = {
  overview: () => ({ section: 'Dashboard', page: 'Overview & Action Intelligence' }),
  meetings: () => ({ section: 'Records', page: 'Meetings, Audio & Transcripts' }),
  actions: (role) => ({ section: 'Execution', page: role === 'STAFF' ? 'My Action Items' : 'Action Items & Deliverables' }),
  manager: () => ({ section: 'Governance', page: 'Manager Verification Portal' }),
  admin: () => ({ section: 'Administration', page: 'User Management & Onboarding' }),
};

const sidebarRoleBadge = (role: Role) =>
  role === 'ADMIN'
    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
    : role === 'MANAGER'
      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30';

const headerRoleBadge = (role: Role) =>
  role === 'ADMIN' ? 'bg-rose-100 text-rose-700' : role === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' : 'bg-sky-100 text-sky-700';

export type Counts = { meetings: number; open: number; mine: number; reviews: number; urgent: number };

const Sidebar: React.FC<{ user: ScreenUser; active: Tab; collapsed?: boolean; counts: Counts }> = ({
  user,
  active,
  collapsed,
  counts,
}) => {
  const isManager = user.role !== 'STAFF';
  const isAdmin = user.role === 'ADMIN';
  const nav: { id: Tab; label: string; icon: React.ElementType; badge?: number; badgeColor?: string }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'meetings', label: 'Meetings', icon: Mic, badge: counts.meetings, badgeColor: 'bg-slate-700 text-slate-300' },
    {
      id: 'actions',
      label: user.role === 'STAFF' ? 'My Tasks' : 'Action Board',
      icon: Layers,
      badge: user.role === 'STAFF' ? counts.mine : counts.open,
      badgeColor: 'bg-indigo-500/20 text-indigo-300',
    },
    ...(isManager
      ? [
          { id: 'manager' as Tab, label: 'Review Portal', icon: ShieldCheck, badge: counts.reviews, badgeColor: 'bg-rose-500 text-white' },
          { id: 'admin' as Tab, label: isAdmin ? 'Admin & Team' : 'Staff Onboarding', icon: Users },
        ]
      : []),
  ];

  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col justify-between border-r border-slate-800 bg-slate-900 text-slate-200',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div>
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-sky-500/25">
              <BrandMark className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold tracking-tight text-white">{APP_NAME}</p>
                <p className="flex items-center gap-1 truncate text-[11px] font-medium text-slate-400">
                  <Building2 className="h-3 w-3 text-slate-500" />
                  {user.department}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400">
              <ChevronLeft className="h-4 w-4" />
            </span>
          )}
        </div>

        {isManager && (
          <div className="p-3">
            <div
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-cyan-500 p-2.5 font-semibold text-white shadow-md shadow-sky-500/20',
                collapsed ? 'px-0' : 'px-4'
              )}
            >
              <Plus className="h-4 w-4 shrink-0 stroke-[2.5]" />
              {!collapsed && (
                <div className="flex w-full items-center justify-between">
                  <span className="text-xs font-bold tracking-wide">Record / Add Meeting</span>
                  <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] font-normal">⌘N</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className={cn('space-y-1 px-3 py-2', !isManager && 'pt-4')}>
          {!collapsed && <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Navigation</p>}
          {nav.map((item) => {
            const isActive = active === item.id;
            return (
              <div
                key={item.id}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold',
                  isActive ? 'font-bold text-white' : 'text-slate-400',
                  collapsed && 'justify-center px-0'
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId={`nav-active-${user.role}`}
                    className="absolute inset-0 rounded-xl border border-sky-500/30 bg-sky-500/15"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <item.icon className={cn('relative h-4 w-4 shrink-0', isActive ? 'text-sky-400' : 'text-slate-400')} />
                {!collapsed && <span className="relative flex-1 truncate text-left">{item.label}</span>}
                {!collapsed && !!item.badge && (
                  <span className={cn('relative rounded-full px-2 py-0.5 text-[10px] font-bold', item.badgeColor)}>{item.badge}</span>
                )}
              </div>
            );
          })}
        </div>

        {!collapsed && (
          <div className="mt-4 space-y-1 px-3">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Quick Status</p>
            <div className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs text-slate-400">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                Urgent Deliverables
              </span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">{counts.urgent}</span>
            </div>
            {isManager && (
              <div className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                  Awaiting Sign-off
                </span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">{counts.reviews}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800/80 bg-slate-950/70 p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-xs font-bold text-white ring-2 ring-slate-800">
              {initials(user.name)}
            </div>
            <LogOut className="h-4 w-4 text-slate-400" />
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-xs font-bold text-white shadow-sm ring-2 ring-slate-800">
                {initials(user.name)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="max-w-[110px] truncate text-xs font-bold text-white">{user.name}</p>
                  <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold', sidebarRoleBadge(user.role))}>{user.role}</span>
                </div>
                <p className="truncate text-[10px] text-slate-400">{user.email}</p>
                <p className="truncate text-[9px] text-slate-500">{user.department}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              {isAdmin && <Settings className="m-1 h-3.5 w-3.5 text-slate-400" />}
              <LogOut className="m-1.5 h-4 w-4 text-slate-400" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

const Header: React.FC<{ user: ScreenUser; active: Tab; reviews: number; compact: boolean }> = ({
  user,
  active,
  reviews,
  compact,
}) => {
  const crumb = BREADCRUMB[active](user.role);
  const isManager = user.role !== 'STAFF';
  return (
    <header className="z-20 w-full shrink-0 border-b border-slate-200/80 bg-white/95">
      <div className={cn('flex h-16 items-center justify-between gap-4', compact ? 'px-4' : 'px-8')}>
        <div className="flex min-w-0 items-center gap-3">
          {compact ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
              <Menu className="h-5 w-5" />
            </span>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400">
              <PanelLeft className="h-4 w-4" />
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
              <span>{APP_NAME}</span>
              <span className="text-slate-400">/</span>
              <span className="font-medium text-slate-600">{crumb.section}</span>
            </div>
            <p className="truncate text-sm font-bold text-slate-900">{crumb.page}</p>
          </div>
        </div>

        {!compact && (
          <div className="mx-2 flex max-w-md flex-1">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-10 text-xs text-slate-400 shadow-xs">
                Search meetings, tasks, team...
              </div>
            </div>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2.5">
          {isManager && (
            <span className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              {!compact && <span>New Meeting</span>}
            </span>
          )}
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600">
            <Bell className="h-4 w-4" />
            {reviews > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                {reviews}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 p-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 text-xs font-bold text-white">
              {initials(user.name)}
            </span>
            {!compact && (
              <>
                <span className="flex flex-col text-left">
                  <span className="text-xs font-bold leading-none text-slate-800">{user.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-slate-500">
                    <span className={cn('rounded px-1 text-[9px] font-bold uppercase tracking-wider', headerRoleBadge(user.role))}>
                      {user.role}
                    </span>
                    <span>{user.department}</span>
                  </span>
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </>
            )}
          </span>
        </div>
      </div>
    </header>
  );
};

/** The full app window: browser chrome, dark sidebar, header and the page body. */
export const AppFrame: React.FC<{
  user: ScreenUser;
  active: Tab;
  counts: Counts;
  collapsed?: boolean;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}> = ({ user, active, counts, collapsed, children, overlay }) => {
  const { compact } = useScreen();
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-50">
      <BrowserChrome />
      <div className="flex min-h-0 flex-1">
        {!compact && <Sidebar user={user} active={active} collapsed={collapsed} counts={counts} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header user={user} active={active} reviews={counts.reviews} compact={compact} />
          <main className={cn('relative min-h-0 flex-1 overflow-hidden', compact ? 'px-4 py-4' : 'px-8 py-6')}>{children}</main>
        </div>
      </div>
      {overlay}
    </div>
  );
};
