'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import {
  Mail, ArrowRight, CheckCircle2, AlertCircle, RefreshCw,
  KeyRound, ShieldCheck, Zap, ArrowLeft, ExternalLink, HelpCircle
} from 'lucide-react';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const initialEmail = searchParams.get('email') || '';
  const initialError = searchParams.get('error') || '';
  const initialStatus = searchParams.get('status') || '';

  const [email, setEmail] = useState(initialEmail);
  const [otpToken, setOtpToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(initialError || null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    initialStatus === 'success' ? 'Email verified successfully! You can now sign in.' : null
  );
  const [cooldown, setCooldown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle OTP verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address.');
      return;
    }
    if (!otpToken || otpToken.trim().length < 6) {
      setError('Please enter the 6-digit confirmation code from your email.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Try verifying with type 'signup' first
      let { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpToken.trim(),
        type: 'signup',
      });

      // If signup type fails, fallback to 'email' type
      if (verifyError) {
        const retry = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpToken.trim(),
          type: 'email',
        });
        data = retry.data;
        verifyError = retry.error;
      }

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      setSuccessMessage('Email verified successfully! Redirecting to workspace...');
      setLoading(false);

      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please check the code.');
      setLoading(false);
    }
  };

  // Handle Resend Confirmation Email
  const handleResend = async () => {
    if (!email) {
      setError('Please enter your email address to resend confirmation.');
      return;
    }

    setResending(true);
    setError(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (resendError) {
        setError(resendError.message);
      } else {
        setSuccessMessage(`A fresh confirmation email and code has been sent to ${email}. Please check your inbox or spam folder.`);
        setCooldown(60); // 60s cooldown
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not resend confirmation email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M 60 0 L 0 0 0 60%22 fill=%22none%22 stroke=%22rgba(255,255,255,0.02)%22 stroke-width=%221%22/%3E%3C/svg%3E')]" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 mb-3">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Verify Your Email</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Confirm your identity to unlock department access
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-7 shadow-2xl space-y-5">
          {/* Status feedback */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 flex items-start gap-3 text-sm text-rose-300">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-start gap-3 text-sm text-emerald-300">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {/* Email field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="verify-email">
                Registered Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="verify-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organisation.org"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
              </div>
            </div>

            {/* OTP Code field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300" htmlFor="otp-token">
                  6-Digit Confirmation Code
                </label>
                <span className="text-[11px] text-slate-400">From your inbox</span>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="otp-token"
                  type="text"
                  maxLength={10}
                  value={otpToken}
                  onChange={(e) => setOtpToken(e.target.value.trim())}
                  placeholder="e.g. 123456"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 font-mono text-center tracking-widest text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                />
              </div>
            </div>

            {/* Verify submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              ) : (
                <>
                  Verify & Enter Workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-3 text-xs text-slate-500 uppercase tracking-wider">or resend</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          {/* Resend button */}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            className="w-full border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
            {cooldown > 0
              ? `Resend available in ${cooldown}s`
              : resending
              ? 'Sending confirmation email...'
              : 'Resend Confirmation Email / Code'}
          </button>

          {/* Tips card */}
          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800 text-xs text-slate-400 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <HelpCircle className="h-3.5 w-3.5 text-violet-400" />
              <span>Did not receive the email?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed text-slate-400">
              <li>Check your <strong>Spam / Junk</strong> folder.</li>
              <li>You can also click the confirmation link in the email directly.</li>
              <li>
                <span className="text-violet-300 font-medium">Dev Tip:</span> In Supabase Dashboard &rarr; <em>Authentication</em> &rarr; <em>Users</em>, click the user &rarr; <em>"Confirm user"</em> for instant bypass.
              </li>
            </ul>
          </div>

          {/* Return links */}
          <div className="pt-2 text-center flex items-center justify-between text-xs text-slate-400">
            <Link href="/login" className="flex items-center gap-1 hover:text-white transition-colors">
              <ArrowLeft className="h-3 w-3" /> Back to Sign In
            </Link>
            <Link href="/register" className="hover:text-violet-400 transition-colors">
              Create another account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0b14] flex items-center justify-center text-slate-400 text-sm">
          Loading email verification...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
