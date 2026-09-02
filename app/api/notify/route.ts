import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const { type, category, body } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_ADDRESS,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const catLabel: Record<string, string> = { bug: 'バグ報告', request: '改善要望', other: 'その他' };
    const subject = type === 'feedback'
      ? `【フィードバック・${catLabel[category] ?? category}】クレゲー`
      : `【通知】クレゲー`;
    const text = `アプリ: クレゲー\nカテゴリ: ${catLabel[category] ?? category}\n内容:\n${body}\n受信日時: ${new Date().toLocaleString('ja-JP')}`;

    await transporter.sendMail({
      from: `"株式会社華" <${process.env.GMAIL_ADDRESS}>`,
      to: 'hanaosaka87@gmail.com',
      subject,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
