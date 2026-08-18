import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const payload = await verifySessionToken(token);
      if (payload?.jti) {
        // Delete server-side session from database
        await prisma.session.deleteMany({
          where: { sessionToken: payload.jti },
        }).catch(() => {});
      }
    }

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error) {
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}
