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

const MAX_BODY_LEN = 300;

export async function GET(req: NextRequest) {
  if (!isReady()) return NextResponse.json({ ideas: [] });

  try {
    const sort = req.nextUrl.searchParams.get('sort') === 'likes' ? 'like_count' : 'created_at';
    const supabase = getClient();
    const { data, error } = await supabase
      .from('ideas')
      .select('id, nickname, body, created_at, like_count, status')
      .order(sort, { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ ideas: data || [] });
  } catch (e) {
    console.error('ideas list error:', e);
    return NextResponse.json({ ideas: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { user_id, nickname, body: ideaBody } = body;

    if (!user_id || !ideaBody || typeof ideaBody !== 'string' || !ideaBody.trim()) {
      return NextResponse.json({ error: 'アイデアの内容を入力してください' }, { status: 400 });
    }
    if (ideaBody.trim().length > MAX_BODY_LEN) {
      return NextResponse.json({ error: `アイデアは${MAX_BODY_LEN}文字以内でお願いします` }, { status: 400 });
    }
    if (!isReady()) {
      return NextResponse.json({ idea: null, skipped: true });
    }

    const supabase = getClient();

    // 投稿は創業メンバー限定
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('founding_member')
      .eq('id', user_id)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile?.founding_member) {
      return NextResponse.json({ error: 'アイデア広場への投稿は創業メンバー限定です' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('ideas')
      .insert({
        user_id,
        nickname: nickname || null,
        body: ideaBody.trim(),
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ idea: data });
  } catch (e) {
    console.error('idea post error:', e);
    return NextResponse.json({ error: '投稿に失敗しました。もう一度お試しください' }, { status: 500 });
  }
}
