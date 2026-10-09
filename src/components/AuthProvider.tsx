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
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  supabaseUser: null,
  appUser: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchAppUser = useCallback(async (supabaseUserId: string) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUserId)
        .maybeSingle();
      if (!error && data) {
        setAppUser(data as User);
      }
    } catch (err) {
      console.warn('[AuthProvider] fetchAppUser error:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setSupabaseUser(user);
        await fetchAppUser(user.id);
      }
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
          await fetchAppUser(session.user.id);
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
      const { data } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchAppUser(newSession.user.id);
        } else {
          setAppUser(null);
        }
      });
      subscription = data.subscription;
    } catch {
      setLoading(false);
    }

    return () => subscription?.unsubscribe();
  }, [fetchAppUser]);

  const signOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    setSupabaseUser(null);
    setAppUser(null);
    setSession(null);
  }, []);

  return (
    <AuthContext.Provider value={{ supabaseUser, appUser, session, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
