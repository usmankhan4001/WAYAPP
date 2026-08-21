# 🔍 Troubleshooting & Meta Cloud API Error Codes Directory

This reference directory documents the critical Meta WhatsApp Graph API error codes, their causes, and WAYAPP's automated self-healing procedures.

---

## 📋 Critical Error Codes & Automated Resolutions

| Error Code | Meta Error Subcode | Meaning / Cause | Automated Resolution in WAYAPP |
|---|---|---|---|
| **130472** | `USER_OPTED_OUT` | Recipient has blocked or opted out of messages | Contact is automatically added to `ContactSuppression` table and marked as `UNSUBSCRIBED` to prevent further broadcast attempts. |
| **131026** | `MESSAGE_UNDELIVERABLE` | Destination phone number is invalid or not registered on WhatsApp | Flagged as `INVALID_PHONE` in database; broadcast engine skips recipient in future campaigns. |
| **131047** | `RE_ENGAGEMENT_MESSAGE` | More than 24 hours have passed since the customer's last message | In-chat free-form input is locked with a 1-click prompt to dispatch an approved template. |
| **130429** | `RATE_LIMIT_EXCEEDED` | Account has hit its Tier messages-per-second or daily tier cap | Exponential backoff algorithm automatically throttles dispatch queue with random jitter. |
| **190** | `INVALID_ACCESS_TOKEN` | System User Access Token has expired or was revoked | Gatekeeper locks live dispatch with an alert prompting admin to input a valid token in `/settings`. |
| **100** | `INVALID_PARAMETER` | Positional template variable count mismatch or character limit exceeded | Pre-flight validator clips button text to $\le 20$ chars, list titles to $\le 24$ chars, and matches exact variable count. |

---

## 🛠️ Step-by-Step Diagnostic Procedures

### 1. Webhook Handshake Failing (403 Forbidden)
* **Verify Token Check**: Ensure `webhookVerifyToken` in `/settings` matches the Verify Token entered in Meta App Dashboard.
* **App Secret Check**: Ensure the App Secret in `/settings` matches your Meta App Secret for HMAC signature verification.

### 2. Messages Not Sending (Pending State)
* **Phone ID**: Verify the Phone Number ID belongs to the WABA associated with your System User Token.
* **Payment Method**: Ensure a valid payment method is attached to your Meta WhatsApp Business Account (WABA) in Meta Business Suite.
* **Quality Rating**: Check `/settings` diagnostics to confirm your phone number's quality rating is `GREEN`.
