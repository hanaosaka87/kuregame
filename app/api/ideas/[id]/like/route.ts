import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'いいねに失敗しました' }, { status: 400 });
    }
    if (!isReady()) {
      return NextResponse.json({ ok: false, skipped: true });
    }

    const supabase = getClient();

    const { error } = await supabase
      .from('idea_likes')
      .insert({ idea_id: id, user_id });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'すでにいいね済みです' }, { status: 409 });
      }
      throw error;
    }

    const { data: idea } = await supabase
      .from('ideas')
      .select('like_count')
      .eq('id', id)
      .maybeSingle();

    return NextResponse.json({ ok: true, like_count: idea?.like_count ?? null });
  } catch (e) {
    console.error('idea like error:', e);
    return NextResponse.json({ error: 'いいねに失敗しました' }, { status: 500 });
  }
}
