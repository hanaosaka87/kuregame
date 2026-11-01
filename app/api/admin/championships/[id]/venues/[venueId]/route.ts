import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isValidAdminSessionToken, ADMIN_SESSION_COOKIE } from '@/lib/adminAuth';

function isAuthed(req: NextRequest): boolean {
  return isValidAdminSessionToken(req.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; venueId: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });
  const { venueId } = await params;
  const body = await req.json();
  const { status, staff_name, verified_nickname, verified_efficiency_rate, memo } = body;

  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (staff_name !== undefined) update.staff_name = staff_name;
  if (verified_nickname !== undefined) update.verified_nickname = verified_nickname;
  if (verified_efficiency_rate !== undefined) update.verified_efficiency_rate = verified_efficiency_rate;
  if (memo !== undefined) update.memo = memo;

  const { data, error } = await getAdminClient()
    .from('championship_venues')
    .update(update)
    .eq('id', venueId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ venue: data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; venueId: string }> }) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });
  const { venueId } = await params;
  const { error } = await getAdminClient().from('championship_venues').delete().eq('id', venueId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
