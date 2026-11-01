export const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県',
];

// /storesの新店投稿フォーム（店舗の設置機種）・/challengeの挑戦機種選択で共通利用（表記統一のため）
export const MACHINE_TYPE_OPTIONS = ['フック設定', 'アーム（クレーン）', '橋渡し', 'タワー崩し', '一本橋・棒渡し', 'プッシュ・プレート', 'すくい取り'];

export const CHALLENGE_LABELS: Record<string, string> = {
  '1000':  '1,000円チャレンジ',
  '3000':  '3,000円チャレンジ',
  '5000':  '5,000円チャレンジ',
  '10000': '1万円チャレンジ',
  'free':  'フリーモード',
  'battle': '対戦モード',
};

export const EFFICIENCY_GRADE = (rate: number) => {
  if (rate >= 300) return { label: '伝説級！！', emoji: '👑', color: 'var(--gold)' };
  if (rate >= 200) return { label: '超元取り！', emoji: '🔥', color: 'var(--gold)' };
  if (rate >= 100) return { label: '元取り成功！', emoji: '✨', color: 'var(--green)' };
  if (rate >= 50)  return { label: 'まあまあ',    emoji: '😊', color: 'var(--cyan)' };
  return               { label: '次は頑張ろう', emoji: '😅', color: 'var(--muted)' };
};
