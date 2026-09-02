import Link from 'next/link';
import type { Metadata } from 'next';
import AppFooter from '@/components/AppFooter';

export const metadata: Metadata = {
  title: 'クレーンゲーム攻略ガイド | クレゲー',
  description: 'フック設定・アーム・橋渡しなどクレーンゲームの種類別に攻略法を解説。元取り率アップのコツ満載。',
};

type Difficulty = 1 | 2 | 3 | 4 | 5;

interface Technique {
  id: string;
  icon: string;
  name: string;
  nameEn: string;
  tag: string;
  tagColor: string;
  difficulty: Difficulty;
  winRate: string;
  summary: string;
  mechanism: string;
  tips: string[];
  bestFor: string;
  featured?: boolean;
}

const TECHNIQUES: Technique[] = [
  {
    id: 'hook',
    icon: '⭕',
    name: 'フック設定',
    nameEn: 'HOOK SETTING',
    tag: 'MAIN',
    tagColor: 'var(--accent)',
    difficulty: 3,
    winRate: '高め',
    summary: '円盤（UFO）型のアームからチェーンでフックが吊るされており、景品の台座についたリングにフックを引っかけると景品ごと獲得できる設定。カップ麺やPETボトル飲料が景品の台として最もよく見かける。',
    mechanism:
      'アームは爪ではなく円盤（UFO）型で、チェーンの先にフック（かぎ型）が吊り下がっている。\n\n景品（カップ麺・飲料ボトルなど）は台座カードにリングが取り付けられた状態で並んでいる。アームをXY軸で動かし、フックが落下したときにリングの穴を通るよう位置を合わせる。\n\nフックはチェーンで揺れながら降りてくるため、「台座にリングが着地した瞬間に穴の向きが合うか」がポイント。うまく引っかかれば景品ごと取り出し口へ。',
    tips: [
      '先にリングの穴の向き（正面を向いているか横向きか）を確認する',
      'フックの真下にリングの穴が来るようXY位置を合わせる。ずれているとフックが滑る',
      'チェーンが揺れるので、振り子の最下点（まっすぐ下がった瞬間）を狙って降下させる',
      '一度で決まらない場合は、フックが少しリングに触れた位置を基準に次の1手を微調整',
      '景品を横から観察して台座の高さとリングの位置関係を把握してから操作する',
      '同じ台の他のリングが引っかかりやすい角度になっているものを先に狙う',
    ],
    bestFor: 'カップ麺・PETボトル飲料・缶飲料・お菓子などの食品景品全般',
    featured: true,
  },
  {
    id: 'arm',
    icon: '🦾',
    name: 'アーム（クレーン）',
    nameEn: 'CRANE ARM',
    tag: 'BASIC',
    tagColor: 'var(--cyan)',
    difficulty: 4,
    winRate: '低め〜中',
    summary: '2本・3本爪のアームで景品を直接つかむ王道スタイル。アームの力とつかむ位置がすべてを左右する。',
    mechanism:
      '上から降りてくるアームが閉じる力（把持力）で景品をつかむ。\n把持力はゲーム機の設定で調整されており、弱い設定だと景品が途中で落ちる。景品の重心とアームが閉じるポイントを合わせることが基本。',
    tips: [
      '景品の重心（最も重い部分）の真上にアームを合わせる',
      'ぬいぐるみは頭部を狙うより首〜胴体の境目を狙うと安定する',
      '把持力が弱い設定の場合は「角を使う」：景品を落とし口の淵に引っかかるよう少しずつ動かす',
      'アームが閉じる位置をX軸・Y軸で独立して確認し2回に分けて微調整する',
    ],
    bestFor: 'ぬいぐるみ全般・箱型景品・食品系景品',
    featured: false,
  },
  {
    id: 'bridge',
    icon: '🌉',
    name: '橋渡し',
    nameEn: 'BRIDGE',
    tag: 'SKILL',
    tagColor: 'var(--gold)',
    difficulty: 3,
    winRate: '中〜高',
    summary: '2本の棒（橋）に景品が乗っており、棒を動かして景品を落とし口に落とす設定。コツをつかめば効率が高い。',
    mechanism:
      '景品は2本のバーの上にまたがった状態で置かれている。アームで景品の端を押し・引きすることでバーの上での位置を変え、重心が崩れたところで落とし口に落ちる。\nバーの間隔・景品の重さによって難易度が大きく変わる。',
    tips: [
      '最初に「景品の軸」を確認する：どちら側のバーに重みがかかっているかを見る',
      '重みがかかっている側を先に崩すと効率が良い',
      '片方のバーから景品を落とすより、両バーの間に落とすことを意識する',
      '1手ずつ景品の動きを確認しながら進める。焦りは禁物',
      '景品が傾いたら次の手は同方向に続けてプッシュする',
    ],
    bestFor: 'フィギュア・ぬいぐるみ（中型）・箱型景品',
    featured: false,
  },
  {
    id: 'tower',
    icon: '🗼',
    name: 'タワー崩し',
    nameEn: 'TOWER',
    tag: 'SKILL',
    tagColor: 'var(--gold)',
    difficulty: 3,
    winRate: '中',
    summary: '複数の景品が積み上がったタワー状の配置。一番下や中段の景品を狙い、上の景品を崩して落とす。',
    mechanism:
      '景品同士が積まれており、下段を動かすことで上段が崩れ落ちる仕組み。\nどの景品を狙うと崩れるかを読む「見立て力」が重要。タワーが落とし口に近い位置にある場合は一気にまとめて獲得できることも。',
    tips: [
      '一番下の景品ではなく、崩れると連鎖する「中段」を狙うことが多い',
      '落とし口の真上にあるタワーほど効率が良い',
      'アームで横から押す（プッシュ）か、上から引っかける（フック）かを景品の形で判断する',
      '1個取れたら残りの配置を確認してから次の手を考える',
    ],
    bestFor: 'スーパーボール・小型ぬいぐるみ・カプセル系景品',
    featured: false,
  },
  {
    id: 'single-bar',
    icon: '🎯',
    name: '一本橋・棒渡し',
    nameEn: 'SINGLE BAR',
    tag: 'SKILL',
    tagColor: 'var(--gold)',
    difficulty: 4,
    winRate: '中',
    summary: '1本のバーに景品が乗っているか、バーに引っかかっている状態から狙う設定。橋渡しより難易度が高い。',
    mechanism:
      'バーが1本のため景品が安定しにくく、アームの当て方で大きく動く。\nバーに引っかかったフィギュアの台座・箱の角などを的確に押して、落とし口方向に誘導する。',
    tips: [
      'バーに対して景品がどちらに傾いているかを必ず確認する',
      '傾いた方向の反対側を押すと景品が立ち直り、さらに押すと落とし口側に動く',
      'アームを景品の角に当てて「点」で押すと方向制御がしやすい',
      '無理に引っこ抜こうとせずバーから滑り落ちるよう誘導する',
    ],
    bestFor: '箱型フィギュア・台座付きフィギュア・大型ぬいぐるみ',
    featured: false,
  },
  {
    id: 'push',
    icon: '👇',
    name: 'プッシュ・プレート',
    nameEn: 'PUSH PLATE',
    tag: 'EASY',
    tagColor: 'var(--green)',
    difficulty: 2,
    winRate: '高め',
    summary: 'アームで景品を押して落とし口まで動かす設定。見た目にわかりやすく初心者にも取り組みやすい。',
    mechanism:
      '景品が落とし口の近くに置かれており、アームが降りる位置を景品の後ろ（落とし口の反対側）に合わせて押し込む。\nアームが閉じる力より「重さと慣性」を使うイメージ。',
    tips: [
      '落とし口のギリギリに景品を追い込むことを目標に、複数手でじわじわ動かす',
      'アームが景品の面（平らな部分）に当たるよう位置を合わせる',
      '小さく押しすぎず、ある程度大きく動かすことを意識する',
      '景品が落とし口の淵に引っかかった場合は、角を狙ってそのまま押し込む',
    ],
    bestFor: '箱型景品・フィギュア（台座なし）・ぬいぐるみ',
    featured: false,
  },
  {
    id: 'scoop',
    icon: '🥄',
    name: 'すくい取り',
    nameEn: 'SCOOP',
    tag: 'EASY',
    tagColor: 'var(--green)',
    difficulty: 2,
    winRate: '高め',
    summary: '小さな景品が大量に入ったマシンをアームですくい、一定数を落とし口に入れる設定。ゲームセンター定番の形式。',
    mechanism:
      '大量の小景品（スーパーボール・カプセル・小型ぬいぐるみ等）がフィールドに散らばっており、アームを開いた状態で景品の山に突き刺し、閉じて持ち上げる。\n一度に多く取れるかどうかは景品の密集度と把持力で変わる。',
    tips: [
      '景品が最も密集している「山の頂点」を狙う',
      'アームを降ろす速度が速いほど深く刺さり、多くすくえる機種が多い',
      '落とし口に近い位置の景品から狙うと、少しこぼれるだけで獲得できる',
      '把持力が十分な台を選ぶのが最重要（事前に他の人のプレイを観察）',
    ],
    bestFor: 'スーパーボール・小型ぬいぐるみ・カプセル景品',
    featured: false,
  },
  {
    id: 'pusher',
    icon: '🎰',
    name: 'メダル・コインプッシャー',
    nameEn: 'COIN PUSHER',
    tag: 'UNIQUE',
    tagColor: '#c400ff',
    difficulty: 1,
    winRate: '中',
    summary: 'メダルや景品をスライドする板で押し出す形式。クレーンゲームとは別カテゴリだが同じゲーセンで遊べる代表的な種類。',
    mechanism:
      'フィールド上にメダル・景品が積まれており、上から投入したメダルを往復するプッシャー板が押す。\n連鎖して大量のメダルや景品が落ちてくる「アバランチ」が醍醐味。完全に運要素が高い。',
    tips: [
      '景品が落ちそうな位置にあるタイミングでメダルを集中投入する',
      '端よりも中央から押す方が安定して景品が動く',
      '1枚ずつ丁寧に投入するより、ある程度まとめて投入した方がリズムが合いやすい',
      '長時間プレイより短時間勝負でやめ時を決めると出費を抑えられる',
    ],
    bestFor: 'メダル・カード景品・コイン型景品',
    featured: false,
  },
];

function Stars({ n }: { n: Difficulty }) {
  return (
    <span style={{ fontFamily: 'var(--num)', letterSpacing: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < n ? 'var(--gold)' : 'var(--line)', fontSize: '.9rem' }}>★</span>
      ))}
    </span>
  );
}

export default function GuidePage() {
  const featured = TECHNIQUES.filter(t => t.featured);
  const others = TECHNIQUES.filter(t => !t.featured);

  return (
    <main style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 96px', background: 'radial-gradient(120% 60% at 50% 0%,#260a52 0%,#0a0018 55%,#05000f 100%)' }}>

      {/* PAGE HEADER */}
      <div style={{ padding: '28px 16px 0' }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '.76rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← トップへ戻る
        </Link>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--gold)', textShadow: '0 0 8px rgba(255,215,0,.4)' }}>
            🕹️ クレゲー攻略ガイド
          </h1>
        </div>
        <p style={{ color: 'var(--lav)', fontSize: '.8rem', lineHeight: 1.7, marginBottom: 24 }}>
          ゲームセンターのクレーンゲームには様々な種類があります。
          それぞれの仕組みと攻略のコツを押さえて、元取り率を上げよう！
        </p>
      </div>

      {/* FEATURED: フック設定 */}
      {featured.map(t => (
        <div key={t.id} style={{ margin: '0 16px 24px', border: `2px solid var(--accent)`, background: 'linear-gradient(135deg,rgba(255,61,175,.12),rgba(196,0,255,.06))', boxShadow: '0 0 24px rgba(255,61,175,.25)' }}>

          {/* MAIN タグ */}
          <div style={{ background: 'var(--accent)', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--num)', fontSize: '.7rem', fontWeight: 700, color: '#14001f', letterSpacing: '.1em' }}>MAIN SETTING</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--num)', fontSize: '.68rem', color: 'rgba(20,0,31,.7)' }}>最重要を先に覚えよう</span>
          </div>

          <div style={{ padding: '18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: '2.6rem', filter: 'drop-shadow(0 0 12px rgba(255,61,175,.7))' }}>{t.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--num)', fontSize: '.64rem', letterSpacing: '.12em', color: 'var(--accent)', marginBottom: 2 }}>{t.nameEn}</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, letterSpacing: '.02em' }}>{t.name}</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: '.62rem', color: 'var(--muted)', marginBottom: 3 }}>難易度</div>
                <Stars n={t.difficulty} />
              </div>
            </div>

            {/* サマリー */}
            <p style={{ fontSize: '.84rem', color: '#f0e4ff', lineHeight: 1.8, marginBottom: 16, fontWeight: 700 }}>
              {t.summary}
            </p>

            {/* 仕組み */}
            <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--line)', padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: '.66rem', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '.08em', marginBottom: 8 }}>🔬 仕組み</div>
              <p style={{ fontSize: '.78rem', color: 'var(--lav)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{t.mechanism}</p>
            </div>

            {/* 攻略Tips */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '.66rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '.08em', marginBottom: 10 }}>💡 攻略のコツ</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {t.tips.map((tip, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{
                      flexShrink: 0, width: 20, height: 20, background: 'var(--accent)', color: '#14001f',
                      fontFamily: 'var(--num)', fontSize: '.68rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                    }}>{i + 1}</div>
                    <p style={{ fontSize: '.78rem', color: 'var(--lav)', lineHeight: 1.75 }}>{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* こんな景品に */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,215,0,.06)', border: '1px solid rgba(255,215,0,.25)', padding: '10px 12px' }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>🎁</span>
              <div>
                <div style={{ fontSize: '.62rem', color: 'var(--gold)', fontWeight: 700, marginBottom: 3 }}>こんな景品に有効</div>
                <div style={{ fontSize: '.76rem', color: 'var(--lav)' }}>{t.bestFor}</div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* セクション仕切り */}
      <div style={{ margin: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 2, background: 'linear-gradient(90deg,var(--accent),transparent)' }} />
        <span style={{ fontSize: '.7rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em' }}>その他の種類</span>
        <div style={{ flex: 1, height: 2, background: 'linear-gradient(270deg,var(--accent),transparent)' }} />
      </div>

      {/* OTHER TECHNIQUES */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {others.map(t => (
          <details key={t.id} style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <summary style={{ listStyle: 'none', cursor: 'pointer', padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* タグ */}
              <span style={{ flexShrink: 0, padding: '2px 8px', background: 'rgba(0,0,0,.4)', border: `1px solid ${t.tagColor}`, color: t.tagColor, fontFamily: 'var(--num)', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em' }}>
                {t.tag}
              </span>
              <span style={{ fontSize: '1.3rem' }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{t.name}</div>
                <div style={{ fontSize: '.64rem', color: 'var(--muted)', marginTop: 2 }}>{t.nameEn}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <Stars n={t.difficulty} />
                <div style={{ fontSize: '.6rem', color: 'var(--muted)', marginTop: 2 }}>難易度</div>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '.8rem', marginLeft: 4 }}>▼</span>
            </summary>

            <div style={{ padding: '0 14px 16px', borderTop: '1px solid var(--line-soft)' }}>
              <p style={{ fontSize: '.8rem', color: 'var(--lav)', lineHeight: 1.8, margin: '12px 0 12px', fontWeight: 700 }}>{t.summary}</p>

              {/* 仕組み */}
              <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--line)', padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ fontSize: '.62rem', fontWeight: 700, color: 'var(--cyan)', letterSpacing: '.08em', marginBottom: 7 }}>🔬 仕組み</div>
                <p style={{ fontSize: '.75rem', color: 'var(--lav)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{t.mechanism}</p>
              </div>

              {/* Tips */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '.62rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '.08em', marginBottom: 8 }}>💡 攻略のコツ</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {t.tips.map((tip, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                      <div style={{
                        flexShrink: 0, width: 18, height: 18, background: 'var(--line)',
                        fontFamily: 'var(--num)', fontSize: '.62rem', fontWeight: 700,
                        color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
                      }}>{i + 1}</div>
                      <p style={{ fontSize: '.75rem', color: 'var(--lav)', lineHeight: 1.75 }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* こんな景品に */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: 'rgba(255,215,0,.04)', border: '1px solid rgba(255,215,0,.15)', padding: '8px 10px' }}>
                <span style={{ fontSize: '.9rem', flexShrink: 0 }}>🎁</span>
                <div>
                  <div style={{ fontSize: '.6rem', color: 'var(--gold)', fontWeight: 700, marginBottom: 2 }}>こんな景品に有効</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--lav)' }}>{t.bestFor}</div>
                </div>
              </div>
            </div>
          </details>
        ))}
      </div>

      {/* CTAバナー */}
      <div style={{ margin: '28px 16px 0', background: 'linear-gradient(135deg,rgba(255,61,175,.12),rgba(196,0,255,.06))', border: '1px solid rgba(255,61,175,.4)', padding: '18px 16px', textAlign: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: '1rem', marginBottom: 6 }}>🎯 理解したら実際に挑戦しよう！</p>
        <p style={{ fontSize: '.78rem', color: 'var(--lav)', marginBottom: 16, lineHeight: 1.7 }}>
          チャレンジを記録して元取り率をランキングに登録。<br />あなたのクレゲースキルを全国に証明しろ！
        </p>
        <Link href="/challenge" style={{
          display: 'block', padding: '14px', fontWeight: 900, fontSize: '1rem', letterSpacing: '.04em',
          background: 'linear-gradient(135deg,var(--accent),var(--purple))', color: '#fff',
        }}>
          🕹️ チャレンジ開始！
        </Link>
      </div>

      <AppFooter />
    </main>
  );
}
