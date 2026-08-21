import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isModuleEnabled } from '@/lib/modules';
import { sendMetaConversionEvent } from '@/lib/whatsapp/capi';
import { logger } from '@/lib/logger';

/**
 * Meta WhatsApp Flows 3.0 Direct Data-Exchange Endpoint
 * Powers native in-chat multi-step forms, lead qualification, and appointment booking.
 */
export async function POST(request: NextRequest) {
  try {
    const enabled = await isModuleEnabled('whatsapp_flows');
    if (!enabled) {
      return NextResponse.json({ error: 'WhatsApp Flows module is disabled' }, { status: 403 });
    }

    const body = await request.json();
    const { action, flow_token, screen, data } = body;

    // Health check ping from Meta Flow tester
    if (action === 'ping') {
      return NextResponse.json({
        version: '3.0',
        data: { status: 'active' },
      });
    }

    // INIT Action: Provide initial dynamic data for Screen 1
    if (action === 'INIT') {
      return NextResponse.json({
        version: '3.0',
        screen: 'LEAD_CAPTURE',
        data: {
          available_dates: [
            { id: '2026-08-22', title: 'Tomorrow (10:00 AM - 12:00 PM)' },
            { id: '2026-08-23', title: 'Sunday (2:00 PM - 4:00 PM)' },
            { id: '2026-08-24', title: 'Monday (11:00 AM - 1:00 PM)' },
          ],
          departments: [
            { id: 'sales', title: 'Enterprise Sales & Pricing' },
            { id: 'real_estate', title: 'Property Viewings' },
            { id: 'support', title: 'Technical Integration' },
          ],
        },
      });
    }

    // DATA_EXCHANGE Action: Handle in-chat form submissions
    if (action === 'data_exchange') {
      const { full_name, email, company, preferred_date, department, budget } = data || {};

      if (flow_token) {
        // Look up contact by flow token or ID
        const contact = await prisma.contact.findFirst({
          where: {
            OR: [{ id: flow_token }, { phoneNumber: flow_token }],
          },
        });

        if (contact) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              firstName: full_name ? full_name.split(' ')[0] : contact.firstName,
              lastName: full_name ? full_name.split(' ').slice(1).join(' ') : contact.lastName,
              email: email || contact.email,
              company: company || contact.company,
              dealValue: budget ? parseFloat(budget) : contact.dealValue,
              leadStage: 'QUALIFIED',
            },
          });

          // Tag contact
          const flowTag = await prisma.tag.upsert({
            where: { name: 'WhatsApp Flow Lead' },
            update: {},
            create: { name: 'WhatsApp Flow Lead', color: '#3B82F6' },
          });

          await prisma.contactsOnTags.upsert({
            where: { contactId_tagId: { contactId: contact.id, tagId: flowTag.id } },
            update: {},
            create: { contactId: contact.id, tagId: flowTag.id },
          }).catch(() => {});

          // Trigger Meta CAPI QualifiedLead Conversion Event
          sendMetaConversionEvent({
            eventName: 'QualifiedLead',
            contactId: contact.id,
            phoneNumber: contact.phoneNumber,
            email: email || contact.email || undefined,
            firstName: full_name,
            value: budget ? parseFloat(budget) : undefined,
            customData: { preferred_date, department },
          }).catch(() => {});
        }
      }

      return NextResponse.json({
        version: '3.0',
        screen: 'SUCCESS',
        data: {
          extension_message_response: {
            params: {
              flow_token,
              status: 'COMPLETED',
              message: 'Your details have been registered successfully! Our sales advisor will reach out shortly. ✨',
            },
          },
        },
      });
    }

    return NextResponse.json({
      version: '3.0',
      screen: screen || 'SUCCESS',
      data: {},
    });
  } catch (error: any) {
    logger.error({ error }, 'WhatsApp Flows endpoint error');
    return NextResponse.json({ error: error.message || 'Flow execution error' }, { status: 500 });
  }
}
