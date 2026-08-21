import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isModuleEnabled } from '@/lib/modules';
import { sanitizePhoneNumber } from '@/lib/whatsapp/phone';
import { sendMetaConversionEvent } from '@/lib/whatsapp/capi';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const enabled = await isModuleEnabled('ecommerce');
    if (!enabled) {
      return NextResponse.json({ status: 'module_disabled' }, { status: 200 });
    }

    const payload = await request.json();
    const billing = payload.billing || {};
    const shipping = payload.shipping || {};
    const rawPhone = billing.phone || shipping.phone;

    if (!rawPhone) {
      return NextResponse.json({ status: 'no_phone_number' }, { status: 200 });
    }

    const normalizedPhone = sanitizePhoneNumber(rawPhone).e164 || rawPhone;
    const firstName = billing.first_name || 'Customer';
    const lastName = billing.last_name || '';
    const orderNumber = payload.number || `#${payload.id}`;
    const totalPrice = parseFloat(payload.total || '0');
    const currency = payload.currency || 'USD';

    // 1. Upsert Contact
    const contact = await prisma.contact.upsert({
      where: { phoneNumber: normalizedPhone },
      update: {
        firstName,
        lastName,
        email: billing.email,
        company: billing.company || undefined,
        city: billing.city || shipping.city || undefined,
        dealValue: totalPrice,
        leadStage: 'WON',
        lastInteractionAt: new Date(),
      },
      create: {
        phoneNumber: normalizedPhone,
        firstName,
        lastName,
        email: billing.email,
        company: billing.company,
        city: billing.city || shipping.city,
        dealValue: totalPrice,
        leadStage: 'WON',
        status: 'ACTIVE',
        lastInteractionAt: new Date(),
      },
    });

    // 2. Add Tag
    const tag = await prisma.tag.upsert({
      where: { name: 'WooCommerce Order' },
      update: {},
      create: { name: 'WooCommerce Order', color: '#8B5CF6' },
    });

    await prisma.contactsOnTags.upsert({
      where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
      update: {},
      create: { contactId: contact.id, tagId: tag.id },
    }).catch(() => {});

    // 3. Craft Notification Message
    const msgBody = `Thank you for your WooCommerce order ${firstName}! 🎉 Order ${orderNumber} for $${totalPrice.toFixed(2)} ${currency} has been received and confirmed.`;

    const conversation = await prisma.conversation.upsert({
      where: { contactId: contact.id },
      update: { lastMessageAt: new Date(), status: 'OPEN' },
      create: { contactId: contact.id, status: 'OPEN', lastMessageAt: new Date() },
    });

    await prisma.chatMessage.create({
      data: {
        contactId: contact.id,
        conversationId: conversation.id,
        phoneNumber: normalizedPhone,
        direction: 'OUTBOUND',
        wamid: `wc_${Date.now()}_${payload.id}`,
        messageType: 'text',
        body: msgBody,
        status: 'SENT',
      },
    });

    // 4. Send Meta CAPI Conversion Event
    sendMetaConversionEvent({
      eventName: 'Purchase',
      contactId: contact.id,
      phoneNumber: normalizedPhone,
      email: billing.email,
      firstName,
      lastName,
      value: totalPrice,
      currency,
      customData: { orderNumber, platform: 'WooCommerce' },
    }).catch(() => {});

    return NextResponse.json({ success: true, contactId: contact.id, orderNumber });
  } catch (error: any) {
    logger.error({ error }, 'WooCommerce Webhook error');
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
