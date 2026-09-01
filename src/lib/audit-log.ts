import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'ROLE_CHANGED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'MODULE_TOGGLED'
  | 'SETTINGS_UPDATED'
  | 'AUTH_CONFIG_UPDATED';

interface WriteAuditLogInput {
  actorId?: string | null;
  actorEmail?: string | null;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  detail?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Fire-and-forget audit trail write. Never throws — a failure here must not
 * break the request that triggered it.
 */
export function writeAuditLog(input: WriteAuditLogInput): void {
  prisma.auditLog
    .create({
      data: {
        actorId: input.actorId || null,
        actorEmail: input.actorEmail || null,
        action: input.action,
        targetType: input.targetType || null,
        targetId: input.targetId || null,
        detail: input.detail ? JSON.stringify(input.detail) : null,
        ipAddress: input.ipAddress || null,
      },
    })
    .catch((error) => {
      logger.error({ error, action: input.action }, 'Failed to write audit log entry');
    });
}
