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

    const topic = request.headers.get('x-shopify-topic') || 'orders/create';
    const payload = await request.json();

    const customer = payload.customer || {};
    const rawPhone = payload.phone || customer.phone || payload.billing_address?.phone || payload.shipping_address?.phone;

    if (!rawPhone) {
      return NextResponse.json({ status: 'no_phone_number_in_payload' }, { status: 200 });
    }

    const normalizedPhone = sanitizePhoneNumber(rawPhone).e164 || rawPhone;
    const firstName = customer.first_name || payload.billing_address?.first_name || 'Customer';
    const lastName = customer.last_name || payload.billing_address?.last_name || '';
    const orderNumber = payload.order_number || payload.name || `#${payload.id}`;
    const totalPrice = parseFloat(payload.total_price || payload.total_price_set?.shop_money?.amount || '0');
    const currency = payload.currency || 'USD';

    // 1. Upsert Contact
    const contact = await prisma.contact.upsert({
      where: { phoneNumber: normalizedPhone },
      update: {
        firstName,
        lastName,
        email: customer.email || payload.email,
        company: payload.billing_address?.company || undefined,
        city: payload.shipping_address?.city || payload.billing_address?.city || undefined,
        dealValue: totalPrice,
        leadStage: 'WON',
        lastInteractionAt: new Date(),
      },
      create: {
        phoneNumber: normalizedPhone,
        firstName,
        lastName,
        email: customer.email || payload.email,
        company: payload.billing_address?.company,
        city: payload.shipping_address?.city || payload.billing_address?.city,
        dealValue: totalPrice,
        leadStage: 'WON',
        status: 'ACTIVE',
        lastInteractionAt: new Date(),
      },
    });

    // 2. Add E-Commerce Customer Tag
    const tag = await prisma.tag.upsert({
      where: { name: 'Shopify Order' },
      update: {},
      create: { name: 'Shopify Order', color: '#10B981' },
    });

    await prisma.contactsOnTags.upsert({
      where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
      update: {},
      create: { contactId: contact.id, tagId: tag.id },
    }).catch(() => {});

    // 3. Craft Notification Message
    let msgBody = '';
    if (topic.includes('checkouts')) {
      msgBody = `Hi ${firstName}! 🛍️ We noticed you left items in your shopping cart. Click here to complete your order with 10% OFF using code SAVE10: ${payload.abandoned_checkout_url || 'https://yourstore.com'}`;
    } else if (topic.includes('fulfilled')) {
      const tracking = payload.fulfillments?.[0]?.tracking_number || '';
      const trackingUrl = payload.fulfillments?.[0]?.tracking_url || '';
      msgBody = `Great news ${firstName}! 🚚 Your order ${orderNumber} has been shipped! Tracking Number: ${tracking} (${trackingUrl})`;
    } else {
      msgBody = `Thank you for your order ${firstName}! 🎉 Your order ${orderNumber} for $${totalPrice.toFixed(2)} ${currency} has been received and is now being processed.`;
    }

    // 4. Create ChatMessage in Shared Inbox
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
        wamid: `shopify_${Date.now()}_${payload.id}`,
        messageType: 'text',
        body: msgBody,
        status: 'SENT',
      },
    });

    // 5. Send Meta CAPI Conversion Event for Ads Optimization
    sendMetaConversionEvent({
      eventName: topic.includes('checkouts') ? 'InitiateCheckout' : 'Purchase',
      contactId: contact.id,
      phoneNumber: normalizedPhone,
      email: customer.email || payload.email,
      firstName,
      lastName,
      value: totalPrice,
      currency,
      customData: { orderNumber, topic },
    }).catch(() => {});

    return NextResponse.json({ success: true, contactId: contact.id, orderNumber });
  } catch (error: any) {
    logger.error({ error }, 'Shopify Webhook error');
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
