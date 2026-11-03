import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import AppFooter from '@/components/AppFooter';
import { isLaunchCampaignActive, currentSpendYenPerPoint } from '@/lib/points';
import { isIOSAppRequest } from '@/lib/iosApp';

export const metadata: Metadata = {
  title: '遊び方ガイド | クレゲー',
  description: 'クレゲーの使い方・チャレンジの記録方法をわかりやすく解説',
};

function SectionTitle({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '.98rem', fontWeight: 900, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
      <span>{icon}</span>{children}
    </h2>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--card2)', borderRadius: 14, padding: '16px 16px', marginBottom: 20 }}>
      {children}
    </div>
  );
}

export default async function HowToPage() {
  const isIOSApp = isIOSAppRequest((await headers()).get('user-agent'));
  return (
    <main style={{ maxWidth: 'min(100vw, 820px)', margin: '0 auto', padding: '0 0 96px', background: 'radial-gradient(120% 60% at 50% 0%,#260a52 0%,#0a0018 55%,#05000f 100%)' }}>

      {/* PAGE HEADER */}
      <div style={{ padding: '28px 16px 0' }}>
        <Link href="/" style={{ color: 'var(--muted)', fontSize: '.76rem', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
          ← トップへ戻る
        </Link>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--gold)', textShadow: '0 0 8px rgba(255,215,0,.4)', marginBottom: 4 }}>
          📖 遊び方ガイド
        </h1>
        <p style={{ color: 'var(--lav)', fontSize: '.8rem', lineHeight: 1.7, marginBottom: 24 }}>
          クレゲーの使い方を3分でチェック。クレーン操作のコツを知りたい方は
          <Link href="/guide" style={{ color: 'var(--accent)', fontWeight: 700 }}> クレゲー攻略ガイド</Link> へどうぞ。
        </p>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* クレゲーとは */}
        <Card>
          <SectionTitle icon="🕹️">クレゲーってどんなアプリ？</SectionTitle>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            クレーンゲームで「投入した金額」に対して「獲得した景品の定価総額」がどれだけあったかを記録し、
            <strong style={{ color: 'var(--text)' }}>「元取り率」</strong>で全国のプレイヤーと競うアプリです。
          </p>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            ランキングの閲覧・ガイドの利用は無料ですが、<strong style={{ color: 'var(--text)' }}>チャレンジの記録にはスタンダード会員（月額480円）以上のご登録が必要</strong>です。現在は公開記念・先着1,000名様限定で、公式LINE登録の「創業メンバー特典」により無料で記録機能をご利用いただけます。詳しくは<Link href="/premium" style={{ color: 'var(--accent)', fontWeight: 700 }}>会員プランについて</Link>をご覧ください。
          </p>
        </Card>

        {/* 3ステップ */}
        <Card>
          <SectionTitle icon="🎯">チャレンジの記録方法</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { n: 1, t: 'チャレンジを選ぶ', d: '金額上限なしの「フリーモード」、友達と競う「対戦モード」、1,000円〜1万円の金額チャレンジから選択。店舗名・都道府県も入力できます（任意）。' },
              { n: 2, t: '投入金額と獲得アイテムを記録', d: '「🎯まとめて入力」なら実際に使った金額を最後にまとめて入力。「⚡その場で記録」なら1個ゲットするたびに使った金額と写真をその場で記録でき、投入金額の合計は自動計算されます。どちらもゲットした景品は写真を撮る/選ぶだけでAIが商品名と定価を自動で読み取ります。' },
              { n: 3, t: '記録スタート！で完了', d: 'ランキングに登録する場合は、本日ゲットした景品をカゴいっぱいに集めた写真の添付が必須です（記録の真実性を担保するためのルールです）。内容を確認して送信すると、自動で元取り率が計算され結果画面に表示されます。' },
              { n: 4, t: 'ランキングに自動反映', d: 'ログインしていれば「マイ戦績」に、全体のランキングにもすぐに反映されます。' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12 }}>
                <div style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                  background: 'linear-gradient(135deg,var(--accent),#aa00ff)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '.85rem',
                }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '.88rem', marginBottom: 2 }}>{s.t}</div>
                  <p style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.7 }}>{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 対戦モード */}
        <Card>
          <SectionTitle icon="⚔️">対戦モードで友達と競う</SectionTitle>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            友達・カップル・家族など<strong style={{ color: 'var(--text)' }}>2〜6人で同じ店舗・同じ金額</strong>で挑戦し、元取り率No.1を競えるモードです。
          </p>
          <ul style={{ fontSize: '.82rem', color: 'var(--lav)', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
            <li><strong style={{ color: 'var(--text)' }}>①部屋を作る</strong>：店舗名とみんなの投入金額を決めると、6桁の招待コードが発行されます</li>
            <li><strong style={{ color: 'var(--text)' }}>②招待する</strong>：招待コードまたは招待リンクをLINEなどで送るだけで参加できます（アプリの新規登録は不要）</li>
            <li><strong style={{ color: 'var(--text)' }}>③記録する</strong>：参加者はそれぞれいつも通り写真AIで獲得アイテムを記録</li>
            <li><strong style={{ color: 'var(--text)' }}>④結果を見る</strong>：対戦結果ページに全員の元取り率ランキングが並び、8秒ごとに自動更新。🥇🥈🥉で表彰されます</li>
          </ul>
        </Card>

        {/* 写真AI */}
        <Card>
          <SectionTitle icon="📸">写真で一括登録（AI自動判定）</SectionTitle>
          <ul style={{ fontSize: '.82rem', color: 'var(--lav)', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
            <li><strong style={{ color: 'var(--text)' }}>📷 カメラで撮影</strong>：その場で1枚ずつ撮影して読み取り</li>
            <li><strong style={{ color: 'var(--text)' }}>🖼️ アルバムから</strong>：スマホの写真アプリから最大<strong style={{ color: 'var(--gold)' }}>10枚まで一括選択</strong>可能。選ぶだけで1枚ずつ自動解析され、獲得リストに次々追加されます</li>
            <li>1枚に複数の商品が写っていてもまとめて認識</li>
            <li>キャラクター名・作品名が読み取れる場合はAIが実勢相場を推定して定価を提案。本当に特定できない場合のみ仮の金額（フィギュアは¥800、それ以外は¥500）で登録されるので、あとから金額を修正できます</li>
          </ul>
        </Card>

        {/* その場で記録モード */}
        <Card>
          <SectionTitle icon="⚡">その場で記録モードで、後回しゼロに</SectionTitle>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            プレイ中に「あとで投入金額を計算し直す」手間をなくしたい方向けのモードです。記録画面の「🎯まとめて入力／⚡その場で記録」タブから切り替えられます。
          </p>
          <ul style={{ fontSize: '.82rem', color: 'var(--lav)', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
            <li><strong style={{ color: 'var(--text)' }}>①今回使った金額を入力</strong>：1回のプレイ（1個ゲットするまで）に使った金額を入力</li>
            <li><strong style={{ color: 'var(--text)' }}>②写真を1枚撮影・選択</strong>：AIが商品名と定価を自動判定し、入力した金額とセットでリストへ追加</li>
            <li>これを景品を獲得するたびに繰り返すだけで、<strong style={{ color: 'var(--gold)' }}>投入金額の合計・元取り率がリアルタイムで自動計算</strong>されます</li>
            <li>ゲーム終了時はそのまま「結果を見る！」を押すだけで最終合計が確認できます</li>
          </ul>
        </Card>

        {/* 元取り率 */}
        <Card>
          <SectionTitle icon="🧮">元取り率の計算式</SectionTitle>
          <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontFamily: 'var(--num)', fontSize: '.95rem', fontWeight: 700, color: 'var(--cyan)' }}>
              元取り率 ＝ 獲得アイテムの定価合計 ÷ 投入金額 × 100
            </div>
          </div>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            100%以上なら定価換算でプラス収支、200%を超えると「超元取り！」の称号。300%以上は「伝説級」です。
          </p>
        </Card>

        {/* 本日のガチャ */}
        <Card>
          <SectionTitle icon="🎰">本日のガチャで元取り率アップ</SectionTitle>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            マイページから<strong style={{ color: 'var(--text)' }}>1日1回、無料でガチャ</strong>が引けます。当たるとその日中に登録するチャレンジの元取り率にボーナスが加算されます。
          </p>
          <ul style={{ fontSize: '.82rem', color: 'var(--lav)', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
            <li>💨 はずれ 〜 👑 大当たり+20%まで5段階</li>
            <li>ボーナスは抽選した<strong style={{ color: 'var(--gold)' }}>当日限り</strong>有効。翌日また挑戦できます</li>
          </ul>
        </Card>

        {/* レベル＆ポイント */}
        <Card>
          <SectionTitle icon="⭐">レベル＆💎ポイントって何？</SectionTitle>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            <strong style={{ color: 'var(--text)' }}>⭐レベル（Lv.1〜100）</strong>：チャレンジを記録するたびに、その回の元取り率ぶんのXP（経験値）を獲得します。上手くなるほど・元取り率が高いほど多くのXPが貯まる仕組みで、「初めてのチャレンジ」「元取り率100%達成」「200%達成」などのミッション報酬XPも自動で合算されます。マイ戦績のレベルゲージで今の実力が一目でわかります。
          </p>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            <strong style={{ color: 'var(--text)' }}>💎マイポイント</strong>：レベルとは別の「使えるポイント」です。実際に使った金額¥{currentSpendYenPerPoint()}につき1pt
            {isLaunchCampaignActive() ? <strong style={{ color: 'var(--gold)' }}>（🎉公開記念で還元率2倍キャンペーン中・期間限定）</strong> : '（実質1%還元）'}
            を中心に、毎日ログイン・連続ログイン達成・対戦勝利・フィードの「スゲー！」を送る/もらう・紹介コード登録・月間チャンピオンなど、色々な行動で貯まります。貯まったポイントはマイページの「ポイント交換」からワンプレイ無料券・割引券などの引換券と交換できます。
          </p>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            ポイントは提携店で順次使えるようにすすめてまいります。ご利用いただける店舗は今後順次拡大していく予定です。
          </p>
        </Card>

        {/* フィード */}
        <Card>
          <SectionTitle icon="🔥">フィードでみんなの自慢を見る</SectionTitle>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            フッターの「🔥フィード」から、他のプレイヤーがマイページに登録した「自慢の一枚」を縦スクロールで閲覧できます。気に入った投稿には<strong style={{ color: 'var(--text)' }}>「🔥スゲー！」ボタン</strong>で反応を送れます。
          </p>
        </Card>

        {/* プロフィール設定 */}
        <Card>
          <SectionTitle icon="🙂">プロフィール設定</SectionTitle>
          <p style={{ fontSize: '.84rem', color: 'var(--lav)', lineHeight: 1.8, marginBottom: 10 }}>
            マイページの「プロフィール設定」から、アイコンを自分の好きな写真・SNSアイコンなどに設定できます。SNSアカウント（X/Instagram/TikTok/YouTube）の登録も任意で可能です。
          </p>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.8 }}>
            ⭐プレミアム会員は<strong style={{ color: 'var(--text)' }}>目指せランキング入り！</strong>上位30位以内にランクインすると、登録したSNSリンクが表示され自分の活動を宣伝できます。あなたのファンがクレゲーを知るきっかけにもなり、クレゲーユーザーがあなたを見つけるきっかけにもなる、お互いにとってうれしい導線です。
          </p>
        </Card>

        {/* ランキング・マイ戦績 */}
        <Card>
          <SectionTitle icon="🏆">ランキング・マイ戦績</SectionTitle>
          <ul style={{ fontSize: '.82rem', color: 'var(--lav)', lineHeight: 2, paddingLeft: 18, margin: 0 }}>
            <li><strong style={{ color: 'var(--text)' }}>ランキング</strong>：全国 / 都道府県別 / 月間全国 / 月間覇者の4タブで元取り率を競えます</li>
            <li><strong style={{ color: 'var(--text)' }}>マイ戦績</strong>：ログインすると、自分のこれまでの全チャレンジ履歴と自己ベストをいつでも振り返れます</li>
            <li>都道府県の月間1位には全国大会出場チケットが贈られます</li>
          </ul>
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', lineHeight: 1.8, marginTop: 10 }}>
            🌏 ランキングへの別途エントリー作業は不要です。スタンダード会員（または創業メンバー特典）でチャレンジを記録すれば、フリーモード・対戦モードなどどのモードでもそのまま自動で全国・都道府県・月間ランキングすべてに反映されます。
          </p>
        </Card>

        {/* ログインのメリット */}
        <Card>
          <SectionTitle icon="🔐">ログインするとできること</SectionTitle>
          <p style={{ fontSize: '.82rem', color: 'var(--lav)', lineHeight: 1.8 }}>
            {isIOSApp
              ? <>チャレンジを記録するにはログインが必要です（アプリ版は記録機能も無料でご利用いただけます）。</>
              : <>チャレンジを記録するにはログイン＋スタンダード会員以上のご登録が必要です。</>}{' '}
            <strong style={{ color: 'var(--text)' }}>ログインすると戦績が自分のアカウントに蓄積</strong>され、マイ戦績ページでいつでも見返せるようになります。都道府県の月間チャンピオンを目指すなら、ログインは必須です。
          </p>
        </Card>

        {/* 店舗情報 */}
        <Card>
          <SectionTitle icon="🏪">お店の情報もチェック</SectionTitle>
          <p style={{ fontSize: '.82rem', color: 'var(--lav)', lineHeight: 1.8 }}>
            「店舗」タブでは全国のゲームセンター一覧や、ユーザーからの新店情報を見られます。新しいお店を見つけたら投稿して他のプレイヤーにも教えてあげましょう。
          </p>
        </Card>

      </div>

      {/* CTA */}
      <div style={{ margin: '8px 16px 0', background: 'linear-gradient(135deg,rgba(255,61,175,.12),rgba(196,0,255,.06))', border: '1px solid rgba(255,61,175,.4)', borderRadius: 14, padding: '18px 16px', textAlign: 'center' }}>
        <p style={{ fontWeight: 900, fontSize: '1rem', marginBottom: 6 }}>🎯 早速チャレンジしてみよう！</p>
        <Link href="/challenge" style={{
          display: 'block', padding: '14px', fontWeight: 900, fontSize: '1rem', letterSpacing: '.04em',
          borderRadius: 12, background: 'linear-gradient(135deg,var(--accent),var(--purple))', color: '#fff',
        }}>
          🕹️ チャレンジ開始！
        </Link>
      </div>

      <AppFooter />
    </main>
  );
}
