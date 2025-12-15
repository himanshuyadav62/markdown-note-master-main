import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabaseClient';

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  actionLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        toast.error('Unable to fetch session.');
      }
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setInitializing(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setInitializing(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message || 'Unable to start Google sign-in.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start Google sign-in.';
      toast.error(message);
    } finally {
      // The user will likely be redirected; this mainly controls button loading state when it is not.
      setActionLoading(false);
    }
  };

  const signOut = async () => {
    setActionLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || 'Unable to sign out.');
    }
    setActionLoading(false);
  };

  const value = useMemo(
    () => ({
      user,
      session,
      loading: initializing,
      actionLoading,
      signInWithGoogle,
      signOut,
    }),
    [user, session, initializing, actionLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
