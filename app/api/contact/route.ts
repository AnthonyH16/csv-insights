import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ContactRequestSchema } from '@/lib/schemas';

const FROM_ADDRESS = 'CSV Insights <onboarding@resend.dev>';

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = ContactRequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toAddress = process.env.CONTACT_EMAIL;

  if (!apiKey || !toAddress) {
    console.error('contact: missing RESEND_API_KEY or CONTACT_EMAIL');
    return NextResponse.json({ error: 'contact form not configured' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  const body = `New contact from the CSV Insights demo

From: ${parsed.name} <${parsed.email}>
Company: ${parsed.company || 'Not provided'}

Message:
${parsed.message}
`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: toAddress,
      replyTo: parsed.email,
      subject: `CSV Insights — new inquiry from ${parsed.name}`,
      text: body,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('contact send failed', err);
    return NextResponse.json({ error: 'failed to send' }, { status: 502 });
  }
}
