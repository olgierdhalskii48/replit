import { NextResponse } from "next/server";

export const runtime = 'edge';

export async function GET() {
  const started = Date.now();
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
  if (!backend) {
    return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_BACKEND_URL not set' }, { status: 500 });
  }
  try {
    const res = await fetch(`${backend}/api/v1/health`, { cache: 'no-store' });
    const ms = Date.now() - started;
    const text = await res.text().catch(() => '');
    return NextResponse.json({ ok: res.ok, status: res.status, ms, body: text.slice(0, 500) });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'fetch_failed' }, { status: 500 });
  }
}
