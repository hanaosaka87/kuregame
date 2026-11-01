import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { pageType, company, storeCount, name, email, plan, message } = await req.json();

    if (!company || !name || !email) {
      return NextResponse.json({ error: '入力不足' }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const isStore = pageType === 'store';
    const subject = isStore
      ? `【スポンサー問い合わせ・施設】${company}（${plan || '未選択'}）`
      : `【スポンサー申し込み】${company}（${plan || '未選択'}）`;

    const lines = [
      `種別: ${isStore ? 'アミューズメント施設向け' : '一般スポンサー'}`,
      `${isStore ? '店舗名・チェーン名' : '会社名・団体名'}: ${company}`,
      ...(isStore ? [`店舗数（目安）: ${storeCount || '未記入'}`] : []),
      `担当者: ${name}`,
      `メール: ${email}`,
      `希望プラン: ${plan || '未選択'}`,
      `メッセージ:\n${message || 'なし'}`,
    ];

    await transporter.sendMail({
      from: `"クレゲー" <${process.env.GMAIL_ADDRESS}>`,
      to: 'hanaosaka87@gmail.com',
      subject,
      text: lines.join('\n'),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: '送信に失敗しました' }, { status: 500 });
  }
}
