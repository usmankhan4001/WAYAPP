# Getting Started with WAYAPP — Non-Technical Guide 📚

Welcome to **WAYAPP**! This guide is written specifically for marketers, sales teams, and business owners. No coding knowledge is required.

---

## Table of Contents
1. [Connecting Your WhatsApp Business Account](#1-connecting-your-whatsapp-business-account)
2. [Syncing Pre-Approved WhatsApp Templates](#2-syncing-pre-approved-whatsapp-templates)
3. [Importing Contacts & Managing CRM Pipelines](#3-importing-contacts--managing-crm-pipelines)
4. [Sending Broadcast Campaigns](#4-sending-broadcast-campaigns)
5. [Using the Live Team Inbox & AI Co-Pilot](#5-using-the-live-team-inbox--ai-copilot)
6. [Understanding the 24-Hour WhatsApp Rule](#6-understanding-the-24-hour-whatsapp-rule)
7. [Creating Visual Chatbot Funnels](#7-creating-visual-chatbot-funnels)

---

## 1. Connecting Your WhatsApp Business Account

To send official WhatsApp messages, WAYAPP connects directly to Meta's Cloud API:

1. Log into **[Meta for Developers](https://developers.facebook.com/)** and select your WhatsApp App.
2. Go to **WhatsApp > API Setup**.
3. Copy your:
   - **Phone Number ID** (e.g. `105928374829102`)
   - **WhatsApp Business Account ID (WABA)**
   - **Permanent Access Token**
4. In WAYAPP, click **Settings** in the left sidebar.
5. Paste your credentials into the **Meta API Settings** tab and click **Save Settings**.
6. A green status badge will appear confirming that your WhatsApp connection is live! ✨

---

## 2. Syncing Pre-Approved WhatsApp Templates

Meta requires business-initiated messages (like marketing announcements or reminders) to use pre-approved templates:

1. Create and submit your template in **Meta Business Manager** (e.g., promotional discount, order confirmation).
2. Once Meta marks it as `APPROVED`, open WAYAPP and click **Templates** in the sidebar.
3. Click the **Sync from Meta** button.
4. WAYAPP instantly downloads your approved templates with all buttons, headers, and dynamic variables ready to use!

---

## 3. Importing Contacts & Managing CRM Pipelines

### Importing via CSV
1. Go to **Contacts & CRM** in the sidebar.
2. Click **Import Contacts**.
3. Upload your CSV file. Ensure your CSV has:
   - `phone` (with country code, e.g. `+971501234567` or `966501234567`)
   - `firstName` and `lastName` (optional)
   - `company` and `city` (optional)
4. Assign initial tags (e.g. `VIP`, `Lead`, `Webinar 2026`) and click **Start Import**.

### Visual Kanban Board
You can switch between **Table View** and **Kanban Pipeline Board**:
- Drag and drop contacts across deal stages: `New Lead` ➡️ `Contacted` ➡️ `Qualified` ➡️ `Proposal Sent` ➡️ `Deal Won`!
- Assign sales reps with 1 click.

---

## 4. Sending Broadcast Campaigns

1. Go to **Campaigns** in the sidebar and click **New Campaign**.
2. **Name your Campaign:** (e.g. "Ramadan Exclusive Offer").
3. **Choose Audience:** Filter by specific Tags, Contact Groups, or send to all opted-in contacts.
4. **Select Approved Template:** Preview the message body and map any dynamic variables (like `{{firstName}}`).
5. **Schedule or Send Now:** Click **Launch Campaign**.
6. Watch real-time delivery metrics update live on your **Dashboard** (Sent, Delivered, Read, Replied)!

---

## 5. Using the Live Team Inbox & AI Co-Pilot

The **Live Inbox** works just like WhatsApp Web, with powerful enterprise tools:

- **1-Click AI Suggested Replies:** Click the purple `Suggest Reply` button to let AI draft an intelligent sales response based on recent chat history.
- **Tone Polish & Translation:** Type a quick draft, then click `Polish` to improve grammar or `Translate` to convert your response into Arabic, French, or Spanish.
- **Canned Snippets:** Type `/` in the message bar to insert quick saved templates (e.g. `/pricing`, `/refund`, `/booking`).
- **1-Click Invoicing & Meetings:** Click `Send Invoice` to generate an instant payment link or `Book Meeting` to send your team calendar.
- **Voice Notes & Media:** Record WhatsApp voice notes directly from your browser or drag-and-drop photos, videos, and PDFs.

---

## 6. Understanding the 24-Hour WhatsApp Rule

Meta protects WhatsApp users from unsolicited spam using a strict **24-Hour Service Window**:

- **Active Window (Green Badge):** When a customer messages you, a 24-hour timer starts. During this window, you can chat freely with standard text, photos, voice notes, and links.
- **Expired Window (Amber Lock Badge):** After 24 hours of inactivity from the customer, free-form text is locked. To resume the conversation, click the **Templates** button and send an approved template. Once the customer replies, the 24-hour window reopens!

---

## 7. Creating Visual Chatbot Funnels

1. Click **Automations** in the sidebar.
2. Select **Visual Flow Builder**.
3. Drag and drop nodes onto the infinite canvas:
   - **Trigger Node:** Start when a user types a specific keyword (e.g. `DEMO`, `PRICING`).
   - **Message Node:** Send interactive buttons or text menus.
   - **Condition Node:** Branch users based on button choices or existing tags.
   - **Action Node:** Tag the contact or assign them to an available human sales agent.
4. Test your entire flow in real-time using the **Interactive Simulator** drawer before publishing live!

---

💡 **Need technical or deployment support?** Check the **[Deployment Guide](DEPLOYMENT_GUIDE.md)** or **[Troubleshooting Guide](TROUBLESHOOTING.md)**.
