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
  const { id } = await params;
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: '画像がありません' }, { status: 400 });
    if (!isReady()) return NextResponse.json({ skipped: true });

    const supabase = getClient();
    const ext = (mediaType || 'image/jpeg').split('/')[1] || 'jpg';
    const path = `${id}-${Date.now()}.${ext}`;
    const bytes = Buffer.from(imageBase64, 'base64');

    const { error: uploadErr } = await supabase.storage
      .from('best-photos')
      .upload(path, bytes, { contentType: mediaType || 'image/jpeg', upsert: false });
    if (uploadErr) throw uploadErr;

    const { data: pub } = supabase.storage.from('best-photos').getPublicUrl(path);
    const photo_url = pub.publicUrl;

    const { error: updateErr } = await supabase
      .from('game_sessions')
      .update({ photo_url })
      .eq('id', id);
    if (updateErr) throw updateErr;

    return NextResponse.json({ photo_url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'アップロードに失敗しました' }, { status: 500 });
  }
}
