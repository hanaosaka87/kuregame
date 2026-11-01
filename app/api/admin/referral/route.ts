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

interface PerfRow {
  code_id: string;
  code: string;
  issuer_type: string;
  issuer_label: string;
  master_group: string;
  user_id: string;
  registered_at: string;
  retained_30d: boolean;
  converted_premium: boolean;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: '認証失敗' }, { status: 401 });

  const { data, error } = await getAdminClient()
    .from('v_referral_performance')
    .select('*')
    .order('registered_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as PerfRow[];

  // コードごとの集計
  const byCode = new Map<string, {
    code: string; issuer_type: string; issuer_label: string; master_group: string;
    registered: number; retained30d: number; convertedPremium: number;
  }>();
  // パートナー（master_group）ごとの合算
  const byGroup = new Map<string, { master_group: string; registered: number; retained30d: number; convertedPremium: number }>();

  for (const r of rows) {
    if (!byCode.has(r.code_id)) {
      byCode.set(r.code_id, {
        code: r.code, issuer_type: r.issuer_type, issuer_label: r.issuer_label, master_group: r.master_group,
        registered: 0, retained30d: 0, convertedPremium: 0,
      });
    }
    const c = byCode.get(r.code_id)!;
    c.registered += 1;
    if (r.retained_30d) c.retained30d += 1;
    if (r.converted_premium) c.convertedPremium += 1;

    if (!byGroup.has(r.master_group)) {
      byGroup.set(r.master_group, { master_group: r.master_group, registered: 0, retained30d: 0, convertedPremium: 0 });
    }
    const g = byGroup.get(r.master_group)!;
    g.registered += 1;
    if (r.retained_30d) g.retained30d += 1;
    if (r.converted_premium) g.convertedPremium += 1;
  }

  return NextResponse.json({
    codes: Array.from(byCode.values()),
    groups: Array.from(byGroup.values()),
    raw: rows,
  });
}
