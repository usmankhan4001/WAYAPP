# Troubleshooting FAQ

Here are answers to the most common questions.

## Why are my messages failing?
- **Invalid Number:** The contact's phone number might be incorrect or missing the country code.
- **Template Rejected:** Meta might have paused or rejected your message template. Check the Templates tab.
- **Outside 24-Hour Window:** You cannot send regular text messages to a user if they haven't replied in the last 24 hours. You must use an approved Template message instead.
- **Meta Limits:** Your WhatsApp account might have hit its daily sending limit (e.g., 1,000 or 10,000 messages/day).

## Why is analytics empty?
- **Webhooks not configured:** Meta sends delivery and read receipts via Webhooks. If your webhook is not properly set up in the Meta Developer Dashboard, WAYAPP won't receive the data.
- **Wait a moment:** It can sometimes take a few minutes for Meta to process large broadcasts.

## How do I restore a backup?
If your server crashes or you need to move to a new database:
1. Locate your backup file (`.sql.gz`) in your backups directory or R2 bucket.
2. Ask your server administrator to run the restore script provided in the source code:
   `./scripts/restore-db.sh ./path/to/your/backup.sql.gz`
3. Restart the WAYAPP containers.
