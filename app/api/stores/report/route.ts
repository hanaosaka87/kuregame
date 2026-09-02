import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  const body = await request.json();
  const { name, prefecture, addr, comment } = body;

  if (!name || !prefecture) {
    return NextResponse.json({ error: '店舗名と都道府県は必須です' }, { status: 400 });
  }

  // Supabase が設定されていれば DB 保存
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      const { error } = await supabase.from('store_reports').insert({
        name, prefecture, addr: addr || null, comment: comment || null,
        status: 'approved',
      });
      if (error) throw error;
    } catch (e) {
      console.error('Supabase insert error:', e);
      // DB失敗でもメール通知にフォールバック
    }
  }

  // メール通知（常に送信）
  if (process.env.GMAIL_ADDRESS && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
      });
      await transporter.sendMail({
        from: process.env.GMAIL_ADDRESS,
        to: process.env.GMAIL_ADDRESS,
        subject: `【クレゲー】新店報告: ${name}（${prefecture}）`,
        text: `店舗名: ${name}\n都道府県: ${prefecture}\n住所: ${addr || '未入力'}\nコメント: ${comment || '未入力'}`,
      });
    } catch (e) {
      console.error('Mail error:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
