import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ADMIN_SESSION } from '@/lib/auth/rbac';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    authenticated: true,
    user: {
      id: DEFAULT_ADMIN_SESSION.userId,
      email: DEFAULT_ADMIN_SESSION.email,
      name: DEFAULT_ADMIN_SESSION.name,
      role: DEFAULT_ADMIN_SESSION.role,
      status: 'ACTIVE',
      isActive: true,
      createdAt: new Date(),
    },
  });
}
