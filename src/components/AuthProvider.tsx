'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { User } from '@/types';

interface AuthContextType {
  supabaseUser: SupabaseUser | null;
  appUser: User | null;
  session: Session | null;
  loading: boolean;
  /** Set when the signed-in user's profile could not be loaded. */
  profileError: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  supabaseUser: null,
  appUser: null,
  session: null,
  loading: true,
  profileError: null,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  // Only the latest request may update state, so a slow response can't overwrite a newer one.
  const requestIdRef = useRef(0);

  // The profile (and role) comes from the server, which reads public.users with
  // the service role — the same source the API uses to authorise requests.
  const fetchAppUser = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      const res = await fetch('/api/me', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (requestId !== requestIdRef.current) return;
      if (res.ok && data.user) {
        setAppUser(data.user as User);
        setProfileError(null);
      } else {
        setProfileError(data.error || `Profile request failed (${res.status})`);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      console.warn('[AuthProvider] fetchAppUser error:', err);
      setProfileError('Could not reach the server to load your profile');
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setSupabaseUser(user);
      if (user) await fetchAppUser();
    } catch {
      // Ignore
    }
  }, [fetchAppUser]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setSupabaseUser(session?.user ?? null);
        if (session?.user) {
          await fetchAppUser();
        }
      } catch (err) {
        console.warn('[AuthProvider] Supabase init failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        if (!newSession?.user) {
          requestIdRef.current++;
          setAppUser(null);
          return;
        }
        // INITIAL_SESSION is handled by initialize(). Defer the fetch: awaiting
        // inside this callback can deadlock supabase-js's auth lock.
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          setTimeout(() => { fetchAppUser(); }, 0);
        }
      });
      subscription = data.subscription;
    } catch {
      setLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, [fetchAppUser]);

  // Pick up role / department changes made by an admin without a re-login.
  // visibilitychange covers tab switches; focus covers switching between
  // browser windows, which leaves both "visible" and fires no visibility event.
  useEffect(() => {
    if (!supabaseUser) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchAppUser();
    };
    const onFocus = () => fetchAppUser();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [supabaseUser, fetchAppUser]);

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    requestIdRef.current++;
    setSupabaseUser(null);
    setAppUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ supabaseUser, appUser, session, loading, profileError, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
