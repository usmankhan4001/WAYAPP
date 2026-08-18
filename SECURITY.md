# Security Policy

WAYAPP takes the security of business messaging, API credentials, and customer data with utmost seriousness.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.x.x   | Yes       |

## Reporting a Vulnerability

If you discover a security vulnerability within WAYAPP, please do **not** open a public issue. Instead, follow these steps:

1. Send an email with full details and reproduction steps to `security@wayapp.dev` or directly open a [Private Security Advisory](https://github.com/usmankhan4001/WAYAPP/security/advisories/new) on GitHub.
2. Include description, impact, and proof-of-concept steps.
3. We will acknowledge receipt of your vulnerability report within 24 hours and provide regular updates on remediation progress.

## Meta API Key & Webhook Security Guidelines

- **Permanent Access Tokens**: Store System User tokens securely; never check `.env` files into source control.
- **Webhook Signature Validation**: WAYAPP verifies the `X-Hub-Signature-256` SHA256 HMAC header on all inbound Meta webhook events.
- **Database Safety**: Production deployments should ensure file permissions on the SQLite volume `/app/prisma` are restricted to the container process.
