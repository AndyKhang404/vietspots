import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null, data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null, data?: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Prevent signup if email already exists in our `users` table
    try {
      const { data: existingUsers, error: checkErr } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);
      if (!checkErr && existingUsers && existingUsers.length > 0) {
        return { error: { message: 'Email already registered' } as any };
      }
    } catch (e) {
      // ignore check errors and continue to attempt signup
    }
    const redirectUrl = `${window.location.origin}/`;
    
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    // If signup succeeded, ensure a profile row exists
    try {
      const userId = result.data?.user?.id;
      if (userId) {
        await supabase.from('profiles').insert({ user_id: userId, full_name: fullName } as any);
        // Also upsert into public.users so app-level users table reflects the auth user
        try {
          await (supabase as any).from('users').upsert({
            id: userId,
            email: email || null,
            name: fullName || null,
            avatar_url: null,
            phone: null,
            gender: null,
            age: null,
            introduction: null,
            hobby: null,
            culture: null,
            religion: null,
            companion_type: null,
          }, { onConflict: 'id' });
        } catch (e) {
          // non-fatal
          // eslint-disable-next-line no-console
          console.warn('Failed to upsert public.users after signUp', e);
        }
      }
    } catch (e) {
      // non-fatal
      // eslint-disable-next-line no-console
      console.warn('Failed to create profile row after signUp', e);
    }

    return { error: result.error ?? null, data: result.data };
  };

  const signIn = async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // After sign-in, ensure profile exists for the authenticated user
    try {
      const userId = result.data?.user?.id;
      if (userId) {
        const { data: existing } = await supabase.from('profiles').select('user_id').eq('user_id', userId).limit(1);
        if (!existing || existing.length === 0) {
          const fullName = result.data?.user?.user_metadata?.full_name || null;
          await supabase.from('profiles').insert({ user_id: userId, full_name: fullName } as any);
        }
        // Ensure a users row exists as well (client has an active session here)
        try {
          await (supabase as any).from('users').upsert({
            id: userId,
            email: result.data?.user?.email || null,
            name: result.data?.user?.user_metadata?.full_name || null,
            avatar_url: null,
            phone: null,
            gender: null,
            age: null,
            introduction: null,
            hobby: null,
            culture: null,
            religion: null,
            companion_type: null,
          }, { onConflict: 'id' });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('Failed to upsert public.users after signIn', e);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Failed to ensure profile after signIn', e);
    }

    return { error: result.error ?? null, data: result.data };
  };

  const signOut = async () => {
    // Clear chat history on logout
    localStorage.removeItem('vietspots_chat_history');
    sessionStorage.removeItem('vietspot_session_id');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
