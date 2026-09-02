'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  nickname: string;
  prefecture: string | null;
  avatar_emoji: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await getSupabase()
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setLoading(false);
      return;
    }

    // onAuthStateChange だけで初期セッション含めて処理（INITIAL_SESSION イベントが発火）
    const { data: { subscription } } = getSupabase().auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await getSupabase().auth.signOut();
    setUser(null);
    setProfile(null);
  }

  return { user, profile, loading, signOut };
}
