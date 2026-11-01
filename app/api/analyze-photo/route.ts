import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const PROMPT = `この写真に写っているクレーンゲームの景品・商品を識別してください。

【最重要ルール】
- 写真の「主役」となる商品だけを返す。背景・床・台・棚など主役でないものは無視する。
- 主役の商品が1種類なら、必ず1件だけ返す（複数件にしない）。
- 同じ商品が複数個写っている場合は quantity で表現し、別エントリにしない。
- 明確に異なる複数種類の商品が並んでいる場合のみ、複数件返してよい。

各商品について返す内容：
- name: 商品名（ブランド名・シリーズ名があれば含める。不明なら「ぬいぐるみ」「お菓子」など種別名）
- retail_price: 日本での実勢価格（円）。キャラクター名・作品名・シリーズが少しでも読み取れる場合は、そのプライズ景品としての一般的な相場（安いものは数百円、人気キャラの大型フィギュアは3000〜5000円程度になることもある）を実際に推定すること。安易に定額へ逃げず、パッケージ・台座・POP等の手がかりも活用して具体的に見積もる。手がかりが本当に何もなく特定不能な場合に限り、categoryがfigureなら800、それ以外は500とする
- quantity: 個数（同じ商品の個数のみ。1が基本）
- category: food / daily / figure / toy / other のいずれか

必ずJSONの配列のみを返す。前置き・後書き・説明文は不要。
[{"name": "商品名", "retail_price": 定価数値, "quantity": 個数, "category": "カテゴリ"}]

商品が一つも写っていない場合は [] を返す。`;

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64) return NextResponse.json({ error: '画像なし' }, { status: 400 });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-5-5',
      max_tokens: 1500,
      thinking: { type: 'disabled' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: (mediaType || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    });

    const text = (message.content[0] as { type: string; text: string }).text;
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return NextResponse.json({ items: [] });

    const items = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ items });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '解析に失敗しました' }, { status: 500 });
  }
}
