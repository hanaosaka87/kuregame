import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Prize } from '@/lib/supabase';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nickname, store_name, challenge_type, total_spent, prizes, prefecture, user_id } = body;

    if (!total_spent || !prizes || prizes.length === 0) {
      return NextResponse.json({ error: '入力不足' }, { status: 400 });
    }

    if (!isReady()) {
      return NextResponse.json({ session: null, skipped: true });
    }

    const total_retail_value = prizes.reduce((s: number, p: Prize) => s + p.retail_price * p.quantity, 0);
    const prize_count = prizes.reduce((s: number, p: Prize) => s + p.quantity, 0);
    const efficiency_rate = total_spent > 0
      ? Math.round((total_retail_value / total_spent) * 100 * 10) / 10 : 0;

    const supabase = getClient();
    const { data: session, error: sessionErr } = await supabase
      .from('game_sessions')
      .insert({
        nickname: nickname || '名無しハンター',
        store_name: store_name || null,
        challenge_type: challenge_type || 'free',
        total_spent,
        total_retail_value,
        prize_count,
        efficiency_rate,
        prefecture: prefecture || null,
        user_id: user_id || null,
      })
      .select()
      .single();

    if (sessionErr) throw sessionErr;

    await supabase.from('prizes').insert(
      prizes.map((p: Prize) => ({
        session_id: session.id,
        name: p.name, category: p.category,
        retail_price: p.retail_price, quantity: p.quantity,
      }))
    );

    return NextResponse.json({ session });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ session: null, skipped: true });
  }
}

export async function GET(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ sessions: [] });

  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('challenge') || 'all';
  const supabase = getClient();

  let query = supabase
    .from('game_sessions')
    .select('*')
    .order('efficiency_rate', { ascending: false })
    .limit(20);

  if (challenge !== 'all') query = query.eq('challenge_type', challenge);

  const { data } = await query;
  return NextResponse.json({ sessions: data || [] });
}
