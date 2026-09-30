# WayApp UI spec (round 2)

Owner decisions: non-technical, mobile-first (phone first, then it grows to web), WhatsApp-style
patterns with our own palette, English only, team features not first priority.
Anyone touching UI follows this file. Where it conflicts with old code, this file wins.

## 1. Principles
1. A business owner who has never seen the app can send a message in under a minute.
2. Familiar WhatsApp patterns: chat list, bubbles, ticks, date chips, bottom tabs, pill inputs, round add button.
3. Mobile first: design at 390px wide, then let it expand. One component set, two layouts.
4. Plain words. No Meta or developer jargon in normal mode (WABA, HMAC, webhook, token, regex, payload, endpoint). Those live only under Advanced or Developer mode.
5. Semantic tokens only (`bg-background`, `text-foreground`, `bg-primary`, `bg-card`, `border-border`, `text-muted-foreground`...). Never raw colours; the design lint enforces it.

## 2. Palette "Ink and Lime" (tokens live in design-tokens/tokens.ts, one source for web and Expo)
Dark (default look of the app on phones)
- background `#141414`, card `#1B1B1B`, raised/secondary `#262626`, border `#2E2E2E`
- foreground `#F6F6F6`, muted-foreground `#A3A3A3`
- primary (lime) `#C0F7A6` with primary-foreground `#1B1B1B`
- sent bubble = primary, received bubble = raised `#262626`
Light
- background `#F6F6F6`, card `#FFFFFF`, border `#E6E6E6`, foreground `#1B1B1B`, muted-foreground `#6B6B6B`
- primary button = ink `#1B1B1B` on white text; accent fill = lime `#C0F7A6`; links, icons and chart line = deep green `#0F5C3A`
- sent bubble = lime `#D6F8C4` with ink text, received bubble = white
Charts: `--chart-1 #0F4D3A` (main), `--chart-2 #BFE3D0` (previous period), highlight `#F5E663` (the current point).
Status: success `#1F9D55`, warning `#E6A100`, danger `#D64545`, read-tick blue `#34B7F1`.
Lime is a fill and an accent in dark mode. Never lime text on a light background (contrast).

## 3. Type, shape, motion
- Font: Manrope (Google Fonts via next/font, variable). Fallback system-ui. Headings 600-700, body 400-500.
- Sizes: body 15-16px, secondary 13-14px, nothing below 12px. Touch targets at least 44px.
- Radius: cards 20px, bubbles 18px (tail corner 6px), buttons and chips pill, inputs 14px.
- Motion: 150-200ms transitions only; respect prefers-reduced-motion.

## 4. Layout
- Under 768px: single column, bottom tab bar (Home, Chats, Contacts, Broadcasts, More), round "new chat" button on Chats, full-screen chat with back arrow.
- 768-1279px: side rail (icons + labels) and two panes for Chats (list + chat).
- 1280px and up: side rail, and the dashboard becomes 2-3 columns.
- The bottom bar hides inside an open chat.

## 5. Shared components (built once by the design-system stream, reused everywhere)
The component layer is shadcn-style primitives (base-nova, cva variants, `cn`). Add missing primitives with
`npx shadcn@latest add <name>` and adapt them; never run `shadcn apply` and never hand-write colour variables.
Colours come only from design-tokens/tokens.ts, which feeds both the web app and the Expo app.
Button (pill), IconButton, Chip (filter), Badge (unread, count), Avatar (initials fallback), Card,
BottomSheet (mobile) / Dialog (desktop) using one API, ListRow, SearchField, SegmentedControl,
Switch, Toast, EmptyState (icon + one sentence + one button), Skeleton, StatPill (value + change arrow).

## 6. Screens
Chat list: search field, filter chips (All, Unread, Waiting on me, Archived), rows with avatar,
name, last message, time, unread badge, pin and mute icons, label dots. Swipe or long-press:
pin, archive, mark unread. Round button bottom right = new chat.
Chat: header (avatar, name, status line "You can reply freely" or "Use a template to reply"),
date chips ("Today"), bubbles with ticks (sent, delivered, read = blue), reply-to quote, emoji
reactions, star, internal notes (visually distinct, never sent, never counted in the reply
window), "/" opens saved replies, attach sheet (Photo, Document, Template, Saved reply), pill
input with voice note.
Dashboard (home): greeting; quick actions row (New chat, New broadcast, Add contact or import,
Send a template); "Needs attention" (unanswered chats, replies closing soon, failed messages);
"Today" numbers (sent, delivered, read, replies each with change vs the previous period);
"Replies over time" line with the current value tagged in yellow; "Leads by label or stage" bars.
Phone: one column of cards. Wide: numbers and chart left, attention and leads right.
Stats page: the same numbers over a period picker, with per-broadcast results.
Automations: one area with Quick setup (greeting, away message, saved replies, keyword replies),
Flows (visual builder, starts from templates, advanced nodes under More), Assistants (AI bot +
knowledge, with a Try it chat). Cards show On or Paused.
Contacts: labels (colour tags) as the everyday layer, Pipeline board for stages, import with consent.
Settings: simple list (Profile, Notifications, Team, Connected number, Help). Advanced and
Developer at the bottom, Developer only when developer mode is on.

## 7. Wording
Buttons say what happens ("Send", "Save as draft"). Errors say what went wrong and what to do.
No exclamation marks, no emoji as decoration, no "Enterprise", "Deep", "Engine", "Gateway".

## 8. Definition of done for any UI change
`npx tsc --noEmit -p .`, `npm run lint:design`, tests for any logic, works at 390px with no
horizontal scroll, visible focus states, both themes correct, plain wording.

---
# Round 3 additions: feedback layer, templates, broadcasts

## 9. Feedback layer (notifications, banners, alerts, toasts, dialogs)
One vocabulary, one component each, never hand-made markup:
- Toast: short confirmation ("Saved", "Message sent"), bottom on phones, top-right on desktop, 4s, never for errors that need action.
- Alert (`src/components/ui/alert.tsx`, tones info/success/warning/danger): inline in a page or dialog. States what happened and what to do next; one action at most.
- Banner (same component, `layout="banner"`): full width under the header for things that affect the whole app: WhatsApp not connected, connection lost/offline, install the app, sending is switched off. Dismissible only when harmless; stacks at most two.
- Dialog / confirm: destructive or irreversible actions only. Title says the action ("Delete this template?"), body says the consequence, the button repeats the verb. Danger tone for delete. Bottom sheet on phones.
- Notification centre: bell in the header (badge = unread count). Opens a bottom sheet on phones and a popover on desktop. Groups: Today, Earlier. Rows: new customer message, message failed to send, broadcast finished, template approved or rejected, connection problem. Tap opens the right screen; "Mark all as read". Empty state: "You are all caught up".
- Push-permission prompt: one calm card, not a modal, with "Turn on" and "Not now".

## 10. Templates
Templates are the messages Meta must approve before you can start a chat. Plain words:
- List: filter chips (All, Approved, Waiting, Rejected) and category chips; rows show name, first line of the message, category, language and a status pill (Approved = success, Waiting for Meta = warning, Rejected = danger, Paused = muted). Rejected rows say why in one sentence.
- Preview: a phone-shaped bubble preview (header, body with {{1}} filled with sample values, footer, buttons) beside or above the details.
- Create/edit: a step-by-step sheet: 1 Name and type, 2 Message (header optional, body, footer, buttons) with a live preview, 3 Review and submit to Meta. Variables inserted with a "Add a name" chip, never typed as {{1}}. Explain approval time in one sentence.
- Send a test: pick a contact, fill sample values, send.

## 11. Broadcasts
- List: rows with name, status pill (Draft, Scheduled, Sending, Sent, Paused, Failed), recipient count, sent/delivered/read/replied as a small progress bar, date. Filter chips by status. Empty state with one button "New broadcast".
- Create: a 4-step flow with a step indicator and a sticky bottom action bar on phones (Back, Next). 1 Name. 2 Message (pick an approved template, live bubble preview, fill variables from contact fields). 3 Audience (everyone / labels / groups, exclusions, live recipient count, consent warning). 4 Review and send (summary card, five masked sample recipients, when to send: now or schedule, confirm; audiences over 50 need typing SEND). While sending is switched off the last step says so and the button reads "Save as draft (not sent)".
- Detail: header with status and actions (Pause, Resume, Cancel), a live progress card (sent, delivered, read, replied, failed), a per-recipient table with status pills and error reasons in plain words, and the message preview.
- Every step has a plain-language help line under its title; no jargon.
