# ⚡ Developer REST v1 API & Outbound Webhooks Guide

WAYAPP Enterprise provides a developer-friendly REST v1 API and an outbound webhook dispatch engine with HMAC cryptographic signatures.

---

## 🔑 Authentication

All requests to `/api/v1/*` must include a valid API Key in the `X-API-Key` header:

```bash
curl -X GET "https://your-domain.com/api/v1/contacts" \
  -H "X-API-Key: wayapp_live_sec_99a8b7c6d5e4f3a2b1" \
  -H "Content-Type: application/json"
```

---

## 📡 REST v1 API Endpoints

### 1. Send Single WhatsApp Message
`POST /api/v1/messages/send`

```json
{
  "phoneNumber": "+971501234567",
  "messageType": "text",
  "text": "Hello! Your appointment is confirmed for tomorrow at 10:00 AM."
}
```

### 2. Send Approved WhatsApp Template
`POST /api/v1/messages/template`

```json
{
  "phoneNumber": "+971501234567",
  "templateName": "order_delivery_notification",
  "language": "en",
  "components": [
    {
      "type": "body",
      "parameters": [
        { "type": "text", "text": "Ahmed" },
        { "type": "text", "text": "#1042" }
      ]
    }
  ]
}
```

### 3. Create or Update Contact
`POST /api/v1/contacts`

```json
{
  "phoneNumber": "+971501234567",
  "firstName": "Ahmed",
  "lastName": "Al-Mansoor",
  "email": "ahmed@example.com",
  "company": "Dubai Properties LLC",
  "dealValue": 50000,
  "leadStage": "QUALIFIED",
  "tags": ["VIP", "Real Estate"]
}
```

---

## 🔔 Outbound Webhooks Delivery Engine

Configure outbound webhooks to receive real-time notifications in your CRM or ERP whenever an event occurs.

### Event Types:
* `message.received`: When a customer sends a message.
* `message.status_updated`: When a message status progresses (`SENT`, `DELIVERED`, `READ`, `FAILED`).
* `contact.created`: When a new contact enters the platform.
* `contact.stage_changed`: When a deal stage changes in the sales pipeline.

### Cryptographic Signature Verification:
Every outbound webhook contains an `X-WAYAPP-Signature` header calculated as:
$$\text{Signature} = \text{HMAC-SHA256}(\text{RawPayload}, \text{WebhookSecret})$$
