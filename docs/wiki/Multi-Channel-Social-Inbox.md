# 💬 Multi-Channel Social Inbox (Instagram DMs & Facebook Messenger)

WAYAPP Enterprise provides a unified omnichannel inbox that aggregates customer conversations across **WhatsApp**, **Instagram Direct Messages**, and **Facebook Messenger** in a single team interface without requiring third-party aggregation SaaS brokers.

---

## 🌐 How Multi-Channel Ingestion Works

Meta uses a unified Graph Webhook architecture for its family of apps. WAYAPP exposes a dedicated social webhook endpoint at:
`GET/POST /api/webhooks/meta-social`

### Webhook Capabilities:
1. **Verification Challenge (`GET`)**: Handles Meta's `hub.challenge` verification handshake securely using `timingSafeCompare()`.
2. **Instagram Direct Ingestion (`POST`)**: Ingests direct DMs, story replies, and interactive button postbacks from Instagram accounts connected to your Meta Business Manager.
3. **Facebook Messenger Ingestion (`POST`)**: Ingests customer messages sent to your official Facebook Business Pages.

---

## 🏷️ Channel Identification & Normalization

When a social message arrives:
1. **Identifier Normalization**:
   * Instagram Sender ID: `ig_17841400000000000`
   * Facebook Messenger Sender ID: `messenger_10023400000000`
   * WhatsApp Phone Number: `+971501234567` (E.164)
2. **Channel Badges**: Messages and conversations in the shared team inbox display clear visual badges (`[INSTAGRAM]`, `[MESSENGER]`, `[WHATSAPP]`).
3. **Unified Threading**: All past customer interactions across all channels are linked to the unified customer profile in the CRM.
