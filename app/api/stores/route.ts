import { NextResponse } from 'next/server';

const OVERPASS = 'https://overpass-api.de/api/interpreter';

const QUERY = `
[out:json][timeout:30];
area["name"="日本"]["admin_level"="2"]->.japan;
(
  node["leisure"="amusement_arcade"](area.japan);
  node["amenity"="amusement_arcade"](area.japan);
);
out body qt 500;
`;

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(QUERY)}`,
    });

    if (!res.ok) throw new Error(`Overpass ${res.status}`);

    const json = await res.json();

    const stores = (json.elements as Record<string, unknown>[])
      .map((el) => {
        const tags = (el.tags ?? {}) as Record<string, string>;
        return {
          id: el.id,
          name: tags['name'] || tags['name:ja'] || null,
          lat: el.lat as number,
          lng: el.lon as number,
          addr: [
            tags['addr:province'],
            tags['addr:city'],
            tags['addr:quarter'],
            tags['addr:street'],
            tags['addr:housenumber'],
          ].filter(Boolean).join(''),
          phone: tags['phone'] || null,
          hours: tags['opening_hours'] || null,
          website: tags['website'] || null,
          brand: tags['brand'] || tags['operator'] || null,
        };
      })
      .filter((s) => s.name);

    return NextResponse.json({ stores, total: stores.length });
  } catch (e) {
    console.error('Overpass error:', e);
    return NextResponse.json({ stores: [], total: 0, error: true }, { status: 200 });
  }
}
