import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchema } from '@/lib/db-init';
import { requireAuth } from '@/lib/auth/rbac';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    await ensureDatabaseSchema();
    const { id } = await params;
    const body = await request.json();

    const dataToUpdate: any = {};
    if (body.name !== undefined) dataToUpdate.name = body.name.trim();
    if (body.description !== undefined) dataToUpdate.description = body.description?.trim();
    if (body.triggerType !== undefined) dataToUpdate.triggerType = body.triggerType;
    if (body.triggerConfig !== undefined) {
      dataToUpdate.triggerConfig =
        typeof body.triggerConfig === 'string' ? body.triggerConfig : JSON.stringify(body.triggerConfig);
    }
    if (body.actionsJson !== undefined) {
      dataToUpdate.actionsJson =
        typeof body.actionsJson === 'string' ? body.actionsJson : JSON.stringify(body.actionsJson);
    }
    if (body.isActive !== undefined) dataToUpdate.isActive = Boolean(body.isActive);

    const updated = await prisma.automation.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, automation: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    await ensureDatabaseSchema();
    const { id } = await params;

    await prisma.automation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
