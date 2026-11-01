import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
function isReady() {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function GET() {
  if (!isReady()) return NextResponse.json({ events: [] });
  const supabase = getClient();
  const { data } = await supabase
    .from('store_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  return NextResponse.json({ events: data || [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { store_name, prefecture, title, body: eventBody, start_date, end_date, nickname, photo_base64, photo_media_type } = body;

  if (!store_name || !title) {
    return NextResponse.json({ error: '店舗名とイベント名は必須です' }, { status: 400 });
  }
  if (!isReady()) return NextResponse.json({ ok: false, skipped: true });

  const supabase = getClient();

  let photo_url: string | null = null;
  if (photo_base64) {
    try {
      const ext = (photo_media_type || 'image/jpeg').split('/')[1] || 'jpg';
      const path = `event-${Date.now()}.${ext}`;
      const bytes = Buffer.from(photo_base64, 'base64');
      const { error: uploadErr } = await supabase.storage
        .from('best-photos')
        .upload(path, bytes, { contentType: photo_media_type || 'image/jpeg', upsert: false });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from('best-photos').getPublicUrl(path);
        photo_url = pub.publicUrl;
      }
    } catch (e) {
      console.error('event photo upload error:', e);
    }
  }

  const { error } = await supabase.from('store_events').insert({
    store_name, prefecture: prefecture || null, title,
    body: eventBody || null,
    start_date: start_date || null, end_date: end_date || null,
    nickname: nickname || null,
    photo_url,
  });
  if (error) {
    console.error(error);
    return NextResponse.json({ error: '投稿に失敗しました' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
