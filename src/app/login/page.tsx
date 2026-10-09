'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { getAppUrl } from '@/lib/url';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, ShieldAlert, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const DEACTIVATED_MESSAGE = 'Your account has been deactivated. Contact your administrator to restore access.';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailNotConfirmed, setIsEmailNotConfirmed] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setIsVerified(true);
    }
    if (searchParams.get('error') === 'deactivated') {
      // Drop the stale session cookie left behind by the deactivated account.
      createClient().auth.signOut({ scope: 'local' }).catch(() => {});
      setError(DEACTIVATED_MESSAGE);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setIsEmailNotConfirmed(false);
    setResendSuccess(false);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if ((error as { code?: string }).code === 'email_not_confirmed' || error.message.toLowerCase().includes('email not confirmed')) {
        setIsEmailNotConfirmed(true);
      } else if ((error as { code?: string }).code === 'user_banned') {
        setError(DEACTIVATED_MESSAGE);
      } else {
        setError(error.message);
      }
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleQuickResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${getAppUrl()}/auth/callback`,
        },
      });
      if (resendErr) {
        setError(resendErr.message);
      } else {
        setResendSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend confirmation email');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-[100px]" />
        {/* Grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M 60 0 L 0 0 0 60%22 fill=%22none%22 stroke=%22rgba(255,255,255,0.02)%22 stroke-width=%221%22/%3E%3C/svg%3E')]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 mb-4">
            <Zap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Meeting Intelligence</h1>
          <p className="text-slate-400 mt-1.5 text-sm">AI-Powered Action Tracker</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Welcome back</h2>
            <p className="text-slate-400 text-sm mt-1">Sign in to your department workspace</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="email">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organisation.org"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Verified badge */}
            {isVerified && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Your email has been verified! Please sign in below.</span>
              </div>
            )}

            {/* Email Not Confirmed Banner */}
            {isEmailNotConfirmed ? (
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 text-xs text-amber-200 space-y-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white text-sm">Email Not Confirmed</p>
                    <p className="text-amber-300/80 mt-1 leading-relaxed">
                      Supabase requires your email to be verified before accessing the workspace.
                    </p>
                  </div>
                </div>

                {resendSuccess && (
                  <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg p-2 text-emerald-200 text-[11px]">
                    ✓ Confirmation email resent! Check your inbox or spam.
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(email)}`}
                    className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-medium py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Enter Confirmation Code / Verify Email
                  </Link>

                  <button
                    type="button"
                    onClick={handleQuickResend}
                    disabled={resending}
                    className="w-full text-[11px] text-amber-300/80 hover:text-white flex items-center justify-center gap-1.5 py-1 transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                </div>
              </div>
            ) : error ? (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            ) : null}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500">New to the platform?</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <Link
            href="/register"
            className="w-full border border-white/10 hover:border-white/20 text-slate-300 hover:text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm"
          >
            <Sparkles className="h-4 w-4" />
            Create your account
          </Link>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Secured by Supabase Auth · Role-Based Access Control
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b14] flex items-center justify-center text-slate-400 text-sm">
          Loading sign in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
