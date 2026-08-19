# WAYAPP Automation & GCCStartup Qualification Flow — Audit and Implementation Plan

## 1. Executive Summary

WAYAPP is already much closer to the required solution than initially assumed.

The repository already contains:

- Official Meta WhatsApp Cloud API integration
- Meta webhook verification and inbound message processing
- Interactive reply parsing for button replies and list replies
- An Automation model and execution engine
- Actions for sending text/templates and applying tags/groups
- Contacts with JSON custom attributes
- Chat/inbox persistence
- Campaign tracking and template synchronization
- Docker deployment and a persistent database

Therefore, the recommendation is **not** to replace WAYAPP or build a separate automation platform.

The recommended next step is to evolve the existing Automation feature into a **stateful Conversation Flow Engine**.

The first production use case should be the GCCStartup lead qualification flow:

Initial Template
→ Quick Reply
→ Business Type List
→ Country List
→ Goal List
→ Timeline List
→ Save answers
→ Tag/score lead
→ Notify/admin handoff
→ Follow-up or close.

---

## 2. Audit Findings

### 2.1 Technology stack

The repository is based on:

- Next.js 15 App Router
- React 19
- TypeScript
- Prisma
- SQLite in the current deployment
- Meta Graph API v21.0
- Docker / Dokploy / Cloudflare Tunnel

### 2.2 Existing WhatsApp capability

The WhatsApp client already handles Meta credentials, phone registration, template synchronization, template sending and text sending.

The webhook already:

1. verifies Meta subscriptions
2. optionally validates Meta HMAC signatures
3. processes template status updates
4. processes delivery/read/failure statuses
5. creates or finds contacts
6. stores inbound messages
7. detects interactive messages
8. extracts:
   - button_reply.title
   - list_reply.title
9. triggers the existing automation engine

This is the key finding: inbound List Message selections are already reaching the application.

### 2.3 Existing automation capability

The existing Automation model supports:

Trigger types:
- KEYWORD_MATCH
- BUTTON_CLICK
- NEW_CONTACT
- CAMPAIGN_REPLY

The current executor supports:
- SEND_TEXT
- SEND_TEMPLATE
- ADD_TAG
- ASSIGN_GROUP

The current implementation is useful, but it is primarily **stateless keyword automation**. It evaluates inbound text against all active automations.

This creates the main limitation:

> The system does not yet know which question the individual contact is currently answering.

For a multi-step qualification funnel, the platform needs persistent conversation state.

### 2.4 Current database strengths

The Contact model already includes:

- phone number
- first/last name
- email
- customAttributes JSON
- status
- last interaction

The customAttributes field can immediately store qualification answers.

Example:

```json
{
  "businessType": "E-commerce",
  "country": "Netherlands",
  "goal": "Company + Bank Account",
  "timeline": "Immediately"
}
```

This means the first version does not need to add four dedicated columns to Contact.

---

## 3. Critical Issues to Fix Before Production

### 3.1 Remove exposed credentials from GitHub

The repository currently contains a file named:

`WABA API Cedentials.txt`

This should be treated as a potential security incident.

Action:

1. Remove the file from the repository.
2. Rotate any credentials contained inside it.
3. Generate a new Meta system-user access token if a live token was exposed.
4. Move all secrets to environment variables or secure deployment configuration.
5. Consider cleaning the credential from Git history if it contained a real secret.

Do this before production use.

### 3.2 Do not use a hardcoded default webhook secret

The schema currently contains a default webhook token value.

Production should require an explicitly configured secret instead of falling back to a predictable value.

### 3.3 SQLite is acceptable for the current GCCStartup MVP

For one business, one WABA and moderate traffic, SQLite is acceptable.

Before turning WAYAPP into a multi-user/high-volume SaaS, migrate to PostgreSQL.

### 3.4 Make inbound webhook processing idempotent

Meta can retry webhook delivery.

Before creating a ChatMessage, safely handle an already-known inbound `wamid`.

The unique constraint exists, but the webhook handler should gracefully ignore duplicate events rather than returning a database error.

---

## 4. Recommended Architecture

The recommended architecture is:

```text
Meta Ads / Website / Campaign
          ↓
Approved WhatsApp Template
          ↓
Quick Reply Button
          ↓
Meta Webhook
          ↓
WAYAPP Webhook Handler
          ↓
Conversation State Resolver
          ↓
Save Answer
          ↓
Advance Current Step
          ↓
Send Interactive List Message
          ↓
Meta
          ↓
Customer Selection
          ↓
Webhook
          ↓
Repeat
          ↓
Qualification Complete
          ↓
Contact Attributes + Tags + Lead Status
          ↓
Admin Notification / Human Handoff
```

The central new component should be:

`ConversationFlowEngine`

This should sit between the webhook handler and the existing generic automation engine.

---

# 5. Phase 1 — Add Interactive List Message Sending

## Goal

WAYAPP must be able to send native Meta WhatsApp List Messages.

Add to:

`src/lib/whatsapp/client.ts`

A method conceptually similar to:

```ts
sendListMessage({
  to,
  body,
  buttonText,
  sections
})
```

Suggested TypeScript shape:

```ts
interface ListRow {
  id: string;
  title: string;
  description?: string;
}

interface ListSection {
  title?: string;
  rows: ListRow[];
}

interface SendListMessageParams {
  to: string;
  body: string;
  buttonText: string;
  sections: ListSection[];
  header?: string;
  footer?: string;
}
```

The implementation should call the Meta `/messages` endpoint with:

- messaging_product: whatsapp
- type: interactive
- interactive.type: list

Use stable row IDs.

Example:

```text
business_ecommerce
business_consulting_agency
business_saas_it
business_other
```

Important: do not rely only on the visible title as the automation identifier. The stable Meta row ID should be preserved and passed into the automation engine.

---

# 6. Phase 2 — Preserve Interactive IDs in the Webhook

The current webhook extracts only:

```text
button_reply.title
list_reply.title
```

Change this so it also extracts:

```text
button_reply.id
list_reply.id
```

Normalize inbound messages into an internal event:

```ts
interface InboundConversationEvent {
  contactId: string;
  phoneNumber: string;
  wamid: string;
  messageType: string;
  text?: string;
  interactiveId?: string;
  interactiveTitle?: string;
}
```

This is important because titles may change, while IDs should remain stable.

---

# 7. Phase 3 — Add Conversation State

Do not try to run the GCCStartup qualification flow solely through independent keyword automations.

Add a new model:

```prisma
model ConversationSession {
  id          String   @id @default(cuid())
  contactId   String
  flowId      String
  currentStep String
  status      String   @default("ACTIVE")
  dataJson    String   @default("{}")
  startedAt   DateTime @default(now())
  completedAt DateTime?
  updatedAt   DateTime @updatedAt

  contact     Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId, status])
  @@index([flowId, currentStep])
}
```

Also add the relation to Contact:

```prisma
conversationSessions ConversationSession[]
```

Recommended statuses:

- ACTIVE
- COMPLETED
- ABANDONED
- HANDED_OFF
- CANCELLED

Rule:

A contact should normally have only one ACTIVE session per flow.

---

# 8. Phase 4 — Create a Flow Definition

The current Automation model can remain for simple triggers.

For multi-step conversations, add:

```prisma
model ConversationFlow {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  description String?
  definition  String   // JSON
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

For the first version, the complete flow can live as JSON.

Example:

```json
{
  "startTrigger": {
    "type": "QUICK_REPLY",
    "id": "start_qualification"
  },
  "steps": [
    {
      "id": "business_type",
      "type": "LIST",
      "saveAs": "businessType"
    },
    {
      "id": "country",
      "type": "LIST",
      "saveAs": "country"
    },
    {
      "id": "goal",
      "type": "LIST",
      "saveAs": "goal"
    },
    {
      "id": "timeline",
      "type": "LIST",
      "saveAs": "timeline"
    }
  ]
}
```

Do not build a visual drag-and-drop editor in the first phase.

Build the engine first.

---

# 9. Phase 5 — GCCStartup Qualification Flow

## Entry

Template:

`gcc_initial_qualification`

Quick Reply ID:

`start_qualification`

When received:

1. create/find ConversationSession
2. set currentStep = `business_type`
3. send Business Type list

## Step 1 — Business Type

Body:

`What is your business activity?`

Button:

`Select Activity`

Rows:

```text
business_ecommerce
business_consulting_agency
business_saas_it
business_other
```

Save:

```json
{
  "businessType": "E-commerce"
}
```

Advance:

`country`

Send:

`Great. Now tell me where you're currently living.`

## Step 2 — Country

Rows:

```text
country_netherlands
country_germany
country_france
country_uk
country_other
```

Save:

```json
{
  "country": "Netherlands"
}
```

Advance:

`goal`

## Step 3 — Goal

Rows:

```text
goal_company_registration
goal_company_bank
goal_tax_optimization
goal_nominee_ubo
goal_other
```

Advance:

`timeline`

## Step 4 — Timeline

Rows:

```text
timeline_immediately
timeline_one_month
timeline_three_months
timeline_exploring
```

On completion:

1. merge session data into Contact.customAttributes
2. add tag: `GCC Qualified`
3. optionally add more tags:
   - `E-commerce`
   - `Netherlands`
   - `Company + Bank`
   - `Hot Lead`
4. mark session COMPLETED
5. send final message
6. notify admin
7. optionally create a lead in a future CRM module

---

# 10. Phase 6 — Conversation Engine Logic

Create:

`src/lib/whatsapp/conversation-engine.ts`

Primary method:

```ts
processConversationEvent(event)
```

Algorithm:

```text
1. Receive inbound event
2. Check for active ConversationSession
3. If active session exists:
   a. validate input against current step
   b. save answer
   c. calculate next step
   d. send next interactive message
   e. update currentStep
4. If no active session:
   a. check whether event starts a ConversationFlow
   b. create session
   c. send first step
5. If flow completes:
   a. merge answers into contact
   b. add tags
   c. execute completion actions
   d. close session
```

Webhook order should become:

```text
Verify webhook
↓
Store inbound message
↓
Normalize event
↓
ConversationFlowEngine
↓
Generic Automation Engine
```

The conversation engine should normally consume matching flow events first.

This prevents generic `ANY_INBOUND` automations from accidentally responding to every qualification answer.

---

# 11. Phase 7 — Extend Automation Actions

Keep the existing actions, then add:

```text
SEND_LIST
SET_CONTACT_ATTRIBUTE
START_FLOW
END_FLOW
HANDOFF_TO_AGENT
NOTIFY_ADMIN
UPDATE_CONTACT_STATUS
```

Recommended payload examples:

```json
{
  "type": "SET_CONTACT_ATTRIBUTE",
  "payload": {
    "key": "country",
    "value": "Netherlands"
  }
}
```

```json
{
  "type": "SEND_LIST",
  "payload": {
    "body": "Where are you currently living?",
    "buttonText": "Select Country",
    "sections": []
  }
}
```

This makes the existing automation system reusable.

---

# 12. Phase 8 — Dashboard Changes

Add:

```text
Analytics
Campaigns
Contacts
Templates
Inbox
Automations
Conversation Flows
Settings
```

Initially, the Automations page can remain for simple keyword/trigger rules.

Create a new:

`Conversation Flows`

page.

## First MVP UI

No visual canvas initially.

Use:

- Flow name
- Status toggle
- Entry trigger
- Ordered step list
- Add step
- Edit question
- Edit list options
- Save answer as
- Completion actions

Later, add a visual flow builder.

---

# 13. Phase 9 — Contact Qualification View

On the Contact detail page, add:

## GCCStartup Qualification

```text
Business Type: E-commerce
Country: Netherlands
Goal: Company + Bank Account
Timeline: Immediately
```

Also display:

```text
Flow Status: Completed
Qualified At: timestamp
```

This data should be easy to filter from Contacts and Campaigns.

---

# 14. Phase 10 — Lead Scoring

Do not over-engineer scoring in the first release.

Start with rules:

```text
Immediately        +30
Within 1 Month     +20
Within 3 Months    +10
Just Exploring      +0

Company + Bank     +20
Tax Optimization   +15
Company Registration +10
```

Then:

```text
70+ = HOT
40–69 = WARM
0–39 = COLD
```

Store:

```json
{
  "leadScore": 70,
  "leadTemperature": "HOT"
}
```

Future UI:

- HOT 🔥
- WARM 🟡
- COLD 🔵

---

# 15. Phase 11 — Human Handoff

When qualification completes:

```text
Conversation Bot
      ↓
Qualification Complete
      ↓
Tag: GCC Qualified
      ↓
Lead Score
      ↓
Notify Abdullah/Admin
      ↓
Conversation assigned to human
      ↓
Automation paused
```

Critical rule:

Once a human takes over, the automation must not continue sending qualification messages.

Add:

```text
HANDOFF
automationPaused = true
```

The human can later resume or restart a flow manually.

---

# 16. Recommended File-Level Changes

## Existing files to modify

### `src/lib/whatsapp/client.ts`

Add:

- `sendListMessage()`
- optionally `sendReplyButtons()`

### `src/app/api/webhooks/whatsapp/route.ts`

Change:

- preserve interactive reply IDs
- normalize inbound event
- call ConversationFlowEngine before generic automation
- make duplicate WAMID handling safe

### `src/lib/whatsapp/automation.ts`

Extend:

- trigger handling using IDs where possible
- new action types
- avoid multiple unintended matches
- allow conversation-aware execution

### `prisma/schema.prisma`

Add:

- ConversationFlow
- ConversationSession
- optional indexes
- Contact relation

## New files

```text
src/lib/whatsapp/conversation-engine.ts
src/lib/whatsapp/conversation-types.ts
src/lib/whatsapp/interactive.ts
```

Potential API routes:

```text
src/app/api/conversation-flows/route.ts
src/app/api/conversation-flows/[id]/route.ts
src/app/api/conversation-sessions/route.ts
```

Potential UI:

```text
src/app/conversation-flows/page.tsx
src/components/conversation-flows/FlowEditor.tsx
src/components/conversation-flows/StepEditor.tsx
```

---

# 17. Recommended Implementation Order

## Sprint 1 — Make GCCStartup Flow Work

Priority:

1. Remove/rotate exposed secrets
2. Add `sendListMessage`
3. Preserve list reply IDs in webhook
4. Add ConversationSession
5. Build minimal ConversationFlowEngine
6. Hard-code/configure the GCCStartup flow
7. Save answers to Contact.customAttributes
8. Add qualification tags
9. Test end-to-end

Result:

A real lead can receive the template and complete the four-step flow.

## Sprint 2 — Make It Configurable

Add:

- ConversationFlow database model
- API CRUD
- Flow editor
- reusable LIST/TEXT/QUICK_REPLY steps
- completion actions

Result:

New flows can be created without editing application code.

## Sprint 3 — Operational Features

Add:

- lead scoring
- admin notifications
- human handoff
- flow analytics
- abandonment tracking
- follow-up scheduling

## Sprint 4 — Advanced Platform Features

Later:

- visual drag-and-drop flow builder
- A/B branches
- conditional routing
- wait/delay steps
- webhook actions
- CRM integrations
- appointment booking
- AI-assisted classification

---

# 18. Testing Plan

Test every inbound type:

- normal text
- template quick reply
- interactive button reply
- interactive list reply
- unsupported input
- duplicate webhook
- no active session
- expired/abandoned session
- STOP message
- human handoff
- Meta API failure

End-to-end test:

```text
Campaign
↓
gcc_initial_qualification
↓
Quick Reply
↓
Business Type List
↓
Country List
↓
Goal List
↓
Timeline List
↓
Completion
↓
Contact attributes
↓
Tags
↓
Admin notification
```

---

# 19. Final Recommendation

Do not rebuild WAYAPP.

The audit shows that the project already has the core infrastructure required for the GCCStartup qualification system:

- official Cloud API
- inbound webhooks
- interactive message detection
- automation persistence
- contact storage
- custom attributes
- inbox
- tagging
- templates
- deployment

The missing architectural piece is **persistent conversation state**.

The best implementation path is:

> Extend WAYAPP's current automation engine with a ConversationSession + ConversationFlow layer.

Build the GCCStartup qualification flow first as the real-world test case.

Once stable, generalize it into a reusable Conversation Flow feature.

That approach minimizes rewrites, uses the existing architecture, and turns WAYAPP into a genuinely reusable WhatsApp automation platform rather than a collection of one-off auto-replies.

---

## Immediate Next Action

Implement Sprint 1 in this order:

1. Security cleanup and credential rotation.
2. Add native Meta List Message sending.
3. Update webhook parsing to preserve interactive reply IDs.
4. Add `ConversationSession`.
5. Add `conversation-engine.ts`.
6. Implement the GCCStartup four-step qualification flow.
7. Test it using the approved `gcc_initial_qualification` template.
8. Only after the end-to-end flow works, build the dashboard editor.


---

# 20. Marketing Messages API for WhatsApp — Optimized Marketing Campaigns

## 20.1 Why this should be part of WAYAPP

Meta is presenting an onboarding option in WhatsApp Manager/App Dashboard as:

> **Improve ROI with marketing messages with optimizations**

This refers to the **Marketing Messages API for WhatsApp (MM API for WhatsApp)**, previously referred to as Marketing Messages Lite API.

This should be added to WAYAPP because GCCStartup will use WhatsApp for:

- Meta ad lead follow-up
- website lead re-engagement
- abandoned qualification follow-ups
- campaign broadcasts
- segmented promotions
- lead nurturing
- reactivation of opted-in contacts

The key architectural decision is:

> **WAYAPP should support both Cloud API and Marketing Messages API in parallel on the same WhatsApp business phone number.**

Cloud API should continue handling inbound messages, interactive conversations, List Messages, service conversations, and non-marketing message types.

Marketing Messages API should be used for eligible outbound **approved marketing template messages** where optimization is desired.

Meta describes these optimizations as improving the relevance and performance of marketing delivery. Meta's published examples and best-practice material indicate potential improvements in delivery/read/click performance compared with non-optimized marketing sends, while actual results will vary by audience and campaign.

---

## 20.2 GCCStartup architecture with both APIs

Recommended routing:

```text
                         WAYAPP
                           │
             ┌─────────────┴─────────────┐
             │                           │
      Cloud API Router             MM API Router
             │                           │
             │                           │
     ┌───────┴────────┐          Marketing Templates
     │                │                   │
Inbound Messages   Interactive             ↓
List Messages      Messages          Optimized Delivery
Service/Utility    Conversations     + Performance Signals
             │                           │
             └─────────────┬─────────────┘
                           ↓
                    WAYAPP Database
                           ↓
              Analytics + Contact + Campaigns
```

### Use Cloud API for:

- receiving inbound messages
- webhook processing
- free-form messages within the allowed customer-service window
- interactive List Messages
- reply buttons
- utility templates
- authentication templates
- conversation automation
- human-agent inbox communication

### Use MM API for WhatsApp for:

- outbound marketing templates
- bulk/segmented marketing campaigns
- eligible re-engagement campaigns
- optimized marketing delivery
- optimization-related message activity and performance measurement where available

Do not attempt to replace Cloud API entirely. MM API and Cloud API are complementary.

---

## 20.3 Recommended WAYAPP Message Routing Layer

Create a routing layer rather than allowing campaign code to directly call the existing WhatsApp client.

New file:

```text
src/lib/whatsapp/message-router.ts
```

Concept:

```ts
type MessageChannel =
  | "CLOUD_API"
  | "MARKETING_MESSAGES_API";

interface MessageRoutingDecision {
  channel: MessageChannel;
  reason: string;
}
```

The router should decide:

```text
Is this a marketing template?
        │
       Yes
        │
Is MM API enabled and eligible?
        │
   Yes ───────────────→ MM API
        │
       No
        ↓
Cloud API fallback
```

For non-marketing traffic:

```text
Interactive message → Cloud API
Inbound reply → Cloud API/Webhook
Utility template → Cloud API
Authentication template → Cloud API
Free-form conversation → Cloud API
```

The routing decision should be stored for every outbound message so analytics can compare optimized and non-optimized sends.

---

## 20.4 Add MM API Configuration to WAYAPP

Extend the WhatsApp account/settings model with fields conceptually similar to:

```text
marketingMessagesEnabled
marketingMessagesOnboarded
marketingMessagesPolicy
messageActivitySharingDefault
```

Suggested values:

### `marketingMessagesPolicy`

```text
CLOUD_API_FALLBACK
STRICT
```

Recommended default for GCCStartup:

```text
CLOUD_API_FALLBACK
```

Reason:

If a campaign/template/contact is not eligible for MM API routing, WAYAPP can fall back to the existing Cloud API instead of silently losing the campaign send.

Use `STRICT` only when GCCStartup explicitly wants to prevent fallback and send exclusively through the optimized marketing route.

---

## 20.5 Update the WhatsApp Client

The current client should be separated into clearer services:

```text
src/lib/whatsapp/cloud-api-client.ts
src/lib/whatsapp/marketing-messages-client.ts
src/lib/whatsapp/message-router.ts
```

Or, for a smaller first implementation:

```text
src/lib/whatsapp/client.ts
```

can expose:

```ts
sendTemplateMessage(...)
sendMarketingMessage(...)
sendListMessage(...)
sendTextMessage(...)
```

The campaign service should not need to know endpoint details. It should call:

```ts
sendOutboundMessage({
  campaignId,
  contactId,
  template,
  parameters,
  optimization: "AUTO"
})
```

The router decides which underlying API to use.

---

## 20.6 Campaign-Level Optimization Setting

Add a campaign field:

```text
optimizationMode
```

Suggested options:

```text
AUTO
OPTIMIZED
STANDARD
```

### AUTO

WAYAPP automatically uses MM API when:

- the campaign uses an approved marketing template
- the WhatsApp account is onboarded
- the recipient/campaign is eligible
- optimization is enabled

Otherwise use Cloud API fallback.

### OPTIMIZED

Prefer or require MM API.

Expose the fallback policy:

```text
Allow Cloud API fallback: ON/OFF
```

### STANDARD

Force the existing Cloud API route.

This is useful for:

- controlled A/B tests
- debugging
- comparing baseline performance
- campaigns where optimization should not be used

---

## 20.7 Add Marketing Optimization Data to Campaign Analytics

Current delivery statuses alone are not enough.

WAYAPP should introduce an optimization analytics layer.

At minimum, store:

```text
messageChannel
optimizationMode
deliveryStatus
sentAt
deliveredAt
readAt
clickedAt
failedAt
failureReason
```

Campaign-level metrics:

```text
Recipients
Sent
Delivered
Delivery Rate
Read
Read Rate
Clicks
Click-Through Rate
Replies
Reply Rate
Conversions
Conversion Rate
Cost
Cost per Lead
Cost per Qualified Lead
Cost per Conversion
```

Where Meta makes additional MM API insights available, store them separately from normal Cloud API metrics.

Do not assume all metrics are available for every geography/account/API version. WAYAPP should treat advanced optimization metrics as capability-based.

---

## 20.8 Add a Channel Comparison Dashboard

A useful WAYAPP feature would be:

```text
Campaign Performance

Optimized (MM API)
────────────────────
Sent:       X
Delivered:  X%
Read:       X%
Clicked:    X%
Replied:    X%
Qualified:  X
CPL:        X

Standard (Cloud API)
────────────────────
Sent:       X
Delivered:  X%
Read:       X%
Clicked:    X%
Replied:    X%
Qualified:  X
CPL:        X
```

This allows GCCStartup to answer a real business question:

> Does optimized WhatsApp delivery actually produce more qualified leads for our audience?

Do not evaluate optimization solely by delivery rate.

For GCCStartup, the most important downstream events are:

```text
Message Sent
→ Delivered
→ Read
→ Clicked/Quick Reply
→ Qualification Started
→ Qualification Completed
→ Qualified Lead
→ Consultation Booked
→ Sale
```

The platform should optimize and report on business outcomes, not vanity metrics alone.

---

## 20.9 Integrate Conversions API for Business Messaging

This should be a later but important phase.

WAYAPP already knows events that occur after a WhatsApp interaction.

For GCCStartup, useful events include:

```text
Lead
QualificationStarted
QualificationCompleted
QualifiedLead
ConsultationBooked
Purchase / ClosedWon
```

Create an internal event model:

```prisma
model ConversionEvent {
  id          String   @id @default(cuid())
  contactId   String?
  campaignId  String?
  eventName   String
  eventTime   DateTime
  value       Float?
  currency    String?
  metadata    String?
  createdAt   DateTime @default(now())

  @@index([eventName, eventTime])
}
```

Then create an event dispatcher:

```text
src/lib/analytics/conversion-events.ts
```

The dispatcher can:

1. store the event locally
2. associate it with the WAYAPP contact/campaign/message
3. later forward supported events to Meta's Conversions API for Business Messaging

Important architectural principle:

> Store the business event first. Treat Meta reporting as an external destination.

This prevents GCCStartup analytics from depending entirely on Meta's event availability.

---

## 20.10 GCCStartup Marketing Campaign Strategy with MM API

### Campaign A — Initial Lead Follow-Up

Trigger:

```text
Meta Lead / Website Lead
```

Message:

```text
gcc_initial_qualification
```

Recommended behavior:

```text
Optimization Mode: AUTO
Message Type: Marketing Template
```

If the user responds:

```text
Cloud API
→ ConversationFlowEngine
→ Interactive qualification flow
```

### Campaign B — No-Response Follow-Up

Example timing:

```text
Lead enters
↓
Initial marketing template
↓
No response
↓
Wait according to campaign strategy
↓
Follow-up marketing template
```

Use:

```text
MM API AUTO
```

Track:

```text
Follow-up sent
Follow-up delivered
Follow-up read
Qualification started
Qualification completed
```

### Campaign C — Re-engagement

Audience example:

```text
Tag: GCC Qualified
AND
No consultation booked
AND
Last interaction older than X days
```

Send an approved marketing template through MM API when eligible.

### Campaign D — Segment-Based Campaigns

Examples:

```text
E-commerce
Consulting/Agency
SaaS/IT
```

WAYAPP should use Contact.customAttributes collected by the ConversationFlowEngine to build audiences.

This is one of the strongest reasons to integrate the qualification flow and campaign engine.

The flow creates the segmentation data.

The campaign engine uses the segmentation data.

The MM API optimizes the outbound marketing delivery.

---

## 20.11 Add a Marketing Eligibility Layer

Before sending a campaign message, WAYAPP should evaluate:

```text
1. Is the contact eligible for a marketing message?
2. Does the campaign use an approved marketing template?
3. Is the WABA/MM API onboarded?
4. Is the selected optimization mode allowed?
5. Has the contact opted out or sent STOP?
6. Is the contact blocked/suppressed?
7. Is there an active human handoff that should prevent automation?
```

Create:

```text
src/lib/whatsapp/marketing-eligibility.ts
```

Concept:

```ts
const eligibility = await checkMarketingEligibility({
  contact,
  campaign,
  template,
  account
});

if (!eligibility.allowed) {
  return suppressMessage(eligibility.reason);
}
```

Store the reason:

```text
OPTED_OUT
SUPPRESSED
TEMPLATE_INVALID
MM_API_NOT_ONBOARDED
NO_FALLBACK_ALLOWED
ACTIVE_HANDOFF
OTHER
```

---

## 20.12 STOP and Suppression Management

The existing plan should be extended with a dedicated suppression mechanism.

When a contact sends:

```text
STOP
```

WAYAPP should:

1. stop active marketing flows
2. add the contact to a marketing suppression list
3. prevent future marketing campaign sends
4. retain an audit record
5. optionally confirm the opt-out through the applicable messaging route

Add a model:

```prisma
model ContactSuppression {
  id        String   @id @default(cuid())
  contactId String
  type      String
  reason    String?
  createdAt DateTime @default(now())

  contact   Contact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId, type])
}
```

Suggested types:

```text
MARKETING_OPT_OUT
GLOBAL_SUPPRESSION
MANUAL_SUPPRESSION
```

The campaign eligibility check must run before every outbound marketing send.

---

## 20.13 A/B Testing Plan

Do not immediately assume optimized delivery is better for every GCCStartup campaign.

WAYAPP should support controlled testing.

Example:

```text
Audience: 10,000 eligible contacts

Group A:
Cloud API / STANDARD

Group B:
MM API / OPTIMIZED
```

Keep constant:

- template
- audience criteria
- sending period
- offer/CTA

Compare:

```text
Delivery Rate
Read Rate
Click Rate
Reply Rate
Qualification Start Rate
Qualification Completion Rate
Qualified Lead Rate
Consultation Rate
Revenue / Cost
```

For GCCStartup, the primary KPI should be:

> **Cost per qualified lead and cost per consultation**

Not merely CTR.

---

## 20.14 Data Model Additions

Recommended additions to the existing Campaign model or related models:

```text
optimizationMode
marketingApiPolicy
messageActivitySharing
```

Recommended additions to Message/ChatMessage or a dedicated outbound message record:

```text
channel
optimizationApplied
campaignId
templateName
sentAt
deliveredAt
readAt
clickedAt
```

A separate `MarketingMessageMetric` model may be preferable if MM API metrics expand over time.

Do not overload the Contact model with campaign analytics.

---

## 20.15 Implementation Phases

### Phase MM-1 — Onboard GCCStartup

In Meta:

1. Open the WhatsApp App Dashboard.
2. Go to the WhatsApp Quickstart area.
3. Find **Improve ROI with marketing messages with optimizations**.
4. Click **Get started**.
5. Continue to the integration guide.
6. Accept the applicable terms.
7. Confirm the WABA/phone number is onboarded.
8. Ensure the messages webhook subscription is active.
9. Run a controlled test send.

Eligibility and geographic availability should be checked in the Meta onboarding flow because advanced capabilities can vary by geography and account.

### Phase MM-2 — WAYAPP Routing

Implement:

- MM API configuration
- message router
- optimized/standard campaign setting
- fallback policy

### Phase MM-3 — Tracking

Implement:

- channel attribution
- message status tracking
- optimization metrics where available
- campaign comparison

### Phase MM-4 — Business Outcome Events

Implement:

- qualification started
- qualification completed
- qualified lead
- consultation booked
- sale

Then integrate supported events with Meta's Conversions API for Business Messaging.

### Phase MM-5 — Optimization Dashboard

Build:

```text
Campaign
Audience
Channel
Optimization Mode
Delivery
Reads
Clicks
Replies
Qualified Leads
Consultations
Revenue
ROI
```

---

## 20.16 Updated Overall WAYAPP Architecture

The complete recommended system becomes:

```text
                         LEAD SOURCES
                    ┌─────────┴─────────┐
                    │                   │
                 Meta Ads            Website
                    │                   │
                    └─────────┬─────────┘
                              ↓
                           WAYAPP
                              │
                  ┌───────────┴───────────┐
                  │                       │
          Campaign Engine          Conversation Engine
                  │                       │
                  ↓                       ↓
          Message Router          Cloud API Interactive
                  │                       │
          ┌───────┴────────┐              │
          │                │              │
       MM API          Cloud API           │
          │                │              │
          └────────┬───────┘              │
                   ↓                      ↓
                       WhatsApp
                           │
                           ↓
                      Customer Reply
                           │
                           ↓
                        Webhook
                           │
                           ↓
                   Conversation Session
                           │
                           ↓
               Contact Attributes / Tags
                           │
                           ↓
                    Lead Qualification
                           │
                ┌──────────┴──────────┐
                │                     │
          Human Handoff         Conversion Events
                                      │
                                      ↓
                              Meta CAPI / Analytics
```

---

## 20.17 Final Recommendation on MM API

WAYAPP should adopt the Marketing Messages API as an **additional outbound marketing channel**, not as a replacement for the current WhatsApp Cloud API integration.

Recommended GCCStartup default:

```text
Marketing templates:
AUTO → MM API when available
Fallback:
Cloud API allowed
Interactive qualification:
Cloud API
Inbound/webhooks:
Cloud API
Human conversations:
Cloud API
Analytics:
Compare optimized vs standard
Primary KPI:
Qualified leads and consultations
```

The architecture should remain provider/API-aware but business-outcome-centered.

The goal is not simply:

> Send more WhatsApp messages.

The goal is:

> Use Meta's optimized marketing delivery to send eligible marketing campaigns more efficiently, then use WAYAPP's conversation flow to turn engagement into structured qualification data and measurable business outcomes.

