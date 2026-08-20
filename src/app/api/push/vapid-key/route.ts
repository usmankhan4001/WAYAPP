import { NextResponse } from 'next/server';
import { getVapidKeys } from '@/lib/push';

export async function GET() {
  try {
    const keys = await getVapidKeys();
    return NextResponse.json({ publicKey: keys.publicKey });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to retrieve VAPID key' }, { status: 500 });
  }
}
