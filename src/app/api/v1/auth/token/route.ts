import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { signSessionToken } from '@/lib/auth/jwt';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const TokenRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(`api_token:${clientIp}`, { limit: 10, windowSeconds: 60 });
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many authentication requests' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = TokenRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const { email, password } = parseResult.data;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Sign JWT Bearer Token (expires in 30 days)
    const token = await signSessionToken(
      {
        userId: user.id,
        email: user.email,
        name: user.name || user.email.split('@')[0],
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
      30 * 24 * 60 * 60
    );

    return NextResponse.json({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 30 * 24 * 60 * 60,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Token generation failed' }, { status: 500 });
  }
}
