import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// 「全国施設」タブ用データ。OpenStreetMap（osm_stores）とGoogle Places API
// （places_stores）の2ソースを事前収集キャッシュから合算して返す。
// 以前はリクエストのたびにOverpass APIへライブ問い合わせしていたが、
// 国全体のarea検索は公開サーバーで確実にタイムアウトしていたため、
// 週次スクリプトで事前収集したテーブルから返すだけにした。
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ stores: [], total: 0 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const [osmRes, placesRes] = await Promise.all([
      supabase.from('osm_stores').select('id, name, lat, lng, addr, phone, hours, website, brand, prefecture'),
      supabase.from('places_stores').select('id, name, lat, lng, addr, prefecture'),
    ]);

    if (osmRes.error) throw osmRes.error;
    if (placesRes.error) throw placesRes.error;

    const osmStores = (osmRes.data || []).map((s) => ({
      id: `osm:${s.id}`,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      addr: s.addr,
      prefecture: s.prefecture,
      phone: s.phone,
      hours: s.hours,
      website: s.website,
      brand: s.brand,
    }));

    const placesStores = (placesRes.data || []).map((s) => ({
      id: `places:${s.id}`,
      name: s.name,
      lat: s.lat,
      lng: s.lng,
      addr: s.addr,
      prefecture: s.prefecture,
      phone: null,
      hours: null,
      website: null,
      brand: null,
    }));

    const stores = [...osmStores, ...placesStores];
    return NextResponse.json({ stores, total: stores.length });
  } catch (e) {
    console.error('stores fetch error:', e);
    return NextResponse.json({ stores: [], total: 0, error: true }, { status: 200 });
  }
}
