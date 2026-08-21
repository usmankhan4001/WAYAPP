import { describe, it, expect } from 'vitest';
import { POST as shopifyPost } from '@/app/api/webhooks/shopify/route';
import { POST as wcPost } from '@/app/api/webhooks/woocommerce/route';
import { NextRequest } from 'next/server';
import { setModuleEnabled } from '@/lib/modules';

describe('E-Commerce Direct Connectors', () => {
  it('should process Shopify order webhook and return 200', async () => {
    await setModuleEnabled('ecommerce', true);

    const payload = {
      id: 987654321,
      order_number: 1042,
      total_price: '199.00',
      currency: 'USD',
      phone: '+971501234567',
      customer: {
        first_name: 'Zaid',
        last_name: 'Al-Mansoor',
        email: 'zaid@example.com',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/shopify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shopify-topic': 'orders/create',
      },
      body: JSON.stringify(payload),
    });

    const res = await shopifyPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.orderNumber).toBe(1042);
  });

  it('should process WooCommerce order webhook and return 200', async () => {
    await setModuleEnabled('ecommerce', true);

    const payload = {
      id: 554433,
      number: 'WC-5544',
      total: '89.50',
      currency: 'USD',
      billing: {
        first_name: 'Fatima',
        last_name: 'Khan',
        email: 'fatima@example.com',
        phone: '+966501234567',
      },
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/woocommerce', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const res = await wcPost(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
