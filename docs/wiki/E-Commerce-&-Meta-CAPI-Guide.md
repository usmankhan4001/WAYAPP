# 🛍️ E-Commerce Connectors & Meta Conversions API (CAPI)

WAYAPP Enterprise features native, direct webhook connectors for **Shopify** and **WooCommerce**, coupled with server-to-server **Meta Conversions API (CAPI)** dispatching for Click-to-WhatsApp Ads conversion optimization.

---

## 🛒 1. Shopify Direct Webhook Connector (`/api/webhooks/shopify`)

Connect your Shopify store by adding a Webhook in **Shopify Admin $\rightarrow$ Settings $\rightarrow$ Notifications $\rightarrow$ Webhooks** pointing to `https://your-domain.com/api/webhooks/shopify`.

### Automated Workflows:
1. **`orders/create` (Instant Order Confirmation)**:
   * Extracts customer billing/shipping phone, order ID, and total amount.
   * Creates/updates contact record in WAYAPP CRM with `dealValue` and stage `WON`.
   * Sends an automated WhatsApp order confirmation receipt.
2. **`checkouts/create` & `checkouts/update` (Abandoned Cart Recovery)**:
   * Extracts customer phone from partially completed checkout.
   * Auto-dispatches a friendly recovery reminder after a configured delay offering a 10% discount code (`SAVE10`) with direct 1-click checkout recovery link.
3. **`orders/fulfilled` (Shipping & Tracking Update)**:
   * Ingests courier tracking number and URL $\rightarrow$ dispatches live delivery update on WhatsApp.

---

## 🛍️ 2. WooCommerce Direct Webhook Connector (`/api/webhooks/woocommerce`)

Connect your WooCommerce store by adding a Webhook in **WooCommerce $\rightarrow$ Settings $\rightarrow$ Advanced $\rightarrow$ Webhooks** pointing to `https://your-domain.com/api/webhooks/woocommerce`.

### Automated Workflows:
* Ingests customer order details, billing phone, product list, and currency.
* Updates customer CRM record, applies `WooCommerce Order` tag, and sends WhatsApp confirmation.

---

## 🎯 3. Meta Conversions API (CAPI) Integration (`src/lib/whatsapp/capi.ts`)

When running **Click-to-WhatsApp Ads (CTWA)** on Instagram and Facebook, Meta's ad algorithm needs server-side signal feedback on which leads converted into paying customers.

### How WAYAPP Dispatches CAPI Events:
* **Server-to-Server Direct Dispatch**: Sends events directly to `https://graph.facebook.com/v21.0/{PIXEL_ID}/events` using permanent access tokens.
* **Cryptographic Data Hashing**: Customer phone numbers, emails, and names are normalized and hashed using **SHA-256** before transmission in compliance with Meta privacy standards.
* **Supported Events**:
  * `Lead`: Dispatched when a customer initiates contact from an ad.
  * `QualifiedLead`: Dispatched when a sales agent marks the lead as `QUALIFIED` or customer completes a WhatsApp Flow form.
  * `InitiateCheckout`: Dispatched when an abandoned cart is captured.
  * `Purchase`: Dispatched when an order is completed or deal is marked `WON`.
