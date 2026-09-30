import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/utils';
import { requireAuth } from '@/lib/auth/rbac';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const { rows = [], columnMapping = {}, targetGroupId, targetTagId, consentConfirmed, consentSource } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data rows provided for import' }, { status: 400 });
    }

    // Consent is recorded only when the uploader confirmed it AND said where it was given.
    const consentWhere = typeof consentSource === 'string' ? consentSource.trim() : '';
    const recordConsent = consentConfirmed === true && consentWhere.length > 0;
    if (consentConfirmed === true && !recordConsent) {
      return NextResponse.json({ error: 'Tell us where these people agreed to receive messages.' }, { status: 400 });
    }
    const consentLabel = `CSV import: ${consentWhere}`.slice(0, 200);
    const seenNumbers = new Set<string>();

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const defaultCountry = settings?.defaultCountryCode || '+971';

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const phoneCol = columnMapping.phoneNumber;
      const rawPhone = row[phoneCol];

      if (!rawPhone) {
        skippedCount++;
        continue;
      }

      const normalized = normalizePhoneNumber(String(rawPhone), defaultCountry);
      if (!normalized || normalized.length < 8) {
        skippedCount++;
        errors.push(`Row ${index + 1}: Invalid phone number (${rawPhone})`);
        continue;
      }

      // Same number twice in one file: keep the first row only.
      if (seenNumbers.has(normalized)) {
        skippedCount++;
        continue;
      }
      seenNumbers.add(normalized);

      const firstName = columnMapping.firstName ? String(row[columnMapping.firstName] || '').trim() : undefined;
      const lastName = columnMapping.lastName ? String(row[columnMapping.lastName] || '').trim() : undefined;
      const email = columnMapping.email ? String(row[columnMapping.email] || '').trim() : undefined;

      // Extract custom attributes
      const customAttributes: Record<string, any> = {};
      Object.keys(row).forEach((colName) => {
        if (
          colName !== columnMapping.phoneNumber &&
          colName !== columnMapping.firstName &&
          colName !== columnMapping.lastName &&
          colName !== columnMapping.email
        ) {
          customAttributes[colName] = row[colName];
        }
      });

      try {
        const contact = await prisma.contact.upsert({
          where: { phoneNumber: normalized },
          update: {
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            email: email || undefined,
            customAttributes: JSON.stringify(customAttributes),
          },
          create: {
            phoneNumber: normalized,
            firstName: firstName || null,
            lastName: lastName || null,
            email: email || null,
            customAttributes: JSON.stringify(customAttributes),
            status: 'ACTIVE',
            ...(recordConsent ? { consentSource: consentLabel, consentAt: new Date() } : {}),
          },
        });

        // Existing contacts: fill consent only if none is recorded; never overwrite.
        if (recordConsent) {
          await prisma.contact.updateMany({
            where: { id: contact.id, consentSource: null },
            data: { consentSource: consentLabel, consentAt: new Date() },
          });
        }

        // Assign Group if requested
        if (targetGroupId) {
          await prisma.contactsOnGroups.upsert({
            where: {
              contactId_groupId: {
                contactId: contact.id,
                groupId: targetGroupId,
              },
            },
            update: {},
            create: {
              contactId: contact.id,
              groupId: targetGroupId,
            },
          });
        }

        // Assign Tag if requested from dropdown
        if (targetTagId) {
          await prisma.contactsOnTags.upsert({
            where: {
              contactId_tagId: {
                contactId: contact.id,
                tagId: targetTagId,
              },
            },
            update: {},
            create: {
              contactId: contact.id,
              tagId: targetTagId,
            },
          });
        }

        // Auto-assign any comma-separated tags in the CSV row
        const rowTagsRaw = (columnMapping.tags ? row[columnMapping.tags] : row['tags'] || row['Tags'] || row['TAGS']) as string | undefined;
        if (rowTagsRaw && typeof rowTagsRaw === 'string') {
          const tagNames = rowTagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
          for (const tagName of tagNames) {
            const tagRecord = await prisma.tag.upsert({
              where: { name: tagName },
              update: {},
              create: { name: tagName },
            });
            await prisma.contactsOnTags.upsert({
              where: {
                contactId_tagId: {
                  contactId: contact.id,
                  tagId: tagRecord.id,
                },
              },
              update: {},
              create: {
                contactId: contact.id,
                tagId: tagRecord.id,
              },
            }).catch(() => {});
          }
        }

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${index + 1} (${normalized}): ${err.message}`);
        skippedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
