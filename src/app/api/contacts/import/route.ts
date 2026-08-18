import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rows = [], columnMapping = {}, targetGroupId, targetTagId } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No data rows provided for import' }, { status: 400 });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 'default' } });
    const defaultCountry = settings?.defaultCountryCode || '+1';

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
          },
        });

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

        // Assign Tag if requested
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
