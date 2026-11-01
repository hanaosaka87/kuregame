// 全国大会への道筋：都道府県 → 地域ブロックのマッピング（一般的な8地方区分）
export const REGIONS: { key: string; label: string; emoji: string; prefectures: string[] }[] = [
  { key: 'hokkaido', label: '北海道', emoji: '❄️', prefectures: ['北海道'] },
  { key: 'tohoku', label: '東北', emoji: '🌲', prefectures: ['青森', '岩手', '宮城', '秋田', '山形', '福島'] },
  { key: 'kanto', label: '関東', emoji: '🗼', prefectures: ['茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川'] },
  { key: 'chubu', label: '中部', emoji: '🗻', prefectures: ['新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知'] },
  { key: 'kinki', label: '近畿', emoji: '⛩️', prefectures: ['三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山'] },
  { key: 'chugoku', label: '中国', emoji: '🌊', prefectures: ['鳥取', '島根', '岡山', '広島', '山口'] },
  { key: 'shikoku', label: '四国', emoji: '🍊', prefectures: ['徳島', '香川', '愛媛', '高知'] },
  { key: 'kyushu', label: '九州・沖縄', emoji: '🌺', prefectures: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'] },
];

export function regionOfPrefecture(prefecture: string): { key: string; label: string; emoji: string } | null {
  for (const r of REGIONS) {
    if (r.prefectures.includes(prefecture)) return { key: r.key, label: r.label, emoji: r.emoji };
  }
  return null;
}
