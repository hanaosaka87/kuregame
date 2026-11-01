'use client';
import { useState, useEffect } from 'react';
import { getSupabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  nickname: string;
  prefecture: string | null;
  avatar_emoji: string;
  avatar_url?: string | null;
  showcase_photo_url?: string | null;
  login_streak?: number;
  last_login_date?: string | null;
  sns_x?: string | null;
  sns_instagram?: string | null;
  sns_tiktok?: string | null;
  sns_youtube?: string | null;
  favorite_stores?: string[] | null;
  gacha_bonus_percent?: number;
  last_gacha_date?: string | null;
  founding_member?: boolean;
  points?: number;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
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
      if (data) {
        setProfile(await updateLoginStreak(data));
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
    }
  }

  // 連続ログイン日数の判定・更新、毎日のログイン報酬・連続ログインマイルストーン報酬のポイント付与は、
  // ポイントという実価値のある通貨が絡むため全てサーバー側（/api/checkin、service_roleキー）で行う。
  // クライアントはここでDB列を直接書き換えず、サーバーの計算結果を受け取ってローカルのprofileに反映するだけ。
  async function updateLoginStreak(data: UserProfile): Promise<UserProfile> {
    const today = todayStr();
    if (data.last_login_date === today) return data;

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: data.id }),
      });
      if (!res.ok) return data;
      const result = await res.json();
      return { ...data, login_streak: result.streak, last_login_date: today, points: result.points };
    } catch {
      return data;
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
