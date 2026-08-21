# 🛡️ Security, Compliance & Resilience Guide

This guide details the security model, cryptographic guarantees, and Meta compliance mechanisms engineered into WAYAPP Enterprise.

---

## 🔒 1. Cryptographic HMAC-SHA256 Signature Verification

Meta sends an `X-Hub-Signature-256` header with every inbound webhook payload computed with your App Secret:
$$\text{Signature} = \text{HMAC-SHA256}(\text{RawBody}, \text{AppSecret})$$

### Fail-Closed Implementation
* **Constant-Time Comparison**: We use `crypto.timingSafeEqual` via our `timingSafeCompare()` helper to prevent byte-by-byte timing attacks.
* **Raw Body Preservation**: The webhook route verifies the exact raw body string before JSON parsing.
* **Instant 401 Rejection**: Any request with an absent or mismatched signature is dropped immediately without accessing application state.

```typescript
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string | null): boolean {
  if (!signatureHeader || !appSecret) return false;
  const hash = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const expected = `sha256=${hash}`;
  return timingSafeCompare(signatureHeader, expected);
}
```

---

## ⏱️ 2. Meta 24-Hour Service Window Compliance

Under Meta's Business Messaging Policy:
* Businesses have **24 hours** from the customer's last inbound message to reply with standard free-form messages (text, media, interactive buttons).
* Once 24 hours elapse, free-form messaging is automatically blocked by Meta (Error `131047`), requiring an approved **Meta WhatsApp Template** to re-engage the customer.

### In-App Enforcement:
1. **Live Countdown Badge**: The chat window displays a color-coded timer (`Active (23h 45m left)` $\rightarrow$ `Expired`).
2. **Input Interceptor**: Free-form input is locked with a helpful banner when the window expires.
3. **1-Click Template Re-Engagement**: A button opens the approved template picker, allowing the agent to send a valid template with 1 click to re-open the 24-hour window.

---

## 📊 3. Status Progression Lifecycle Guard

To prevent out-of-order webhook delivery from regressing a message's state (e.g. a delayed `SENT` webhook overwriting an already `READ` message), WAYAPP enforces a strict **Rank-Based Progression Guard**:

$$\text{PENDING (1)} \rightarrow \text{SENDING (2)} \rightarrow \text{SENT (3)} \rightarrow \text{DELIVERED (4)} \rightarrow \text{READ (5)} \rightarrow \text{REPLIED (6)} \rightarrow \text{FAILED (99)}$$

* An update is **only applied** if $\text{NewRank} \ge \text{CurrentRank}$.
* If $\text{NewRank} < \text{CurrentRank}$, the out-of-order update is ignored and logged.

---

## 🔐 4. Data Encryption & RBAC
* **Credential Vault**: Meta System User Access Tokens and App Secrets are encrypted in the database at rest using **AES-256-GCM**.
* **Role-Based Access Control (RBAC)**:
  * `ADMIN`: Full access to settings, API keys, credentials, and modules.
  * `MANAGER`: Full access to team inbox, campaigns, automations, and CRM pipeline.
  * `AGENT`: Scoped access to assigned conversations, contacts, and canned snippets.
