# Parallel workstream contract

Read this before touching anything. Several people/agents work at the same time on separate
branches. Staying inside your files is what keeps the merge clean.

## Rules for every workstream
1. Work only in your own git worktree and branch (given in your brief). Never edit the main
   checkout at `D:/GCC Startup/WayApp`.
2. Edit only the files you **own** below. If you need a change elsewhere, do not make it:
   write it under "Needs from others" in your final report.
3. **Do not edit `prisma/schema.prisma`.** Fields you may need already exist (see below).
4. Do not push, deploy, or touch Dokploy, n8n or any live system. Commit locally only.
5. Additive and reversible. Never delete data, routes or columns.
6. Before your final commit all of these must pass in your worktree:
   `npx tsc --noEmit -p .`, `npm run lint:design`, and
   `npx vitest run <your new test files>`. Tests that touch a real database cannot run here;
   mock `@/lib/prisma` like `src/__tests__/message-log.test.ts` does.
7. Match the surrounding code style. Use design tokens and existing UI components; the design
   lint rejects raw colours. Plain, non-technical wording for anything a customer sees.
8. Keep changes small and committed in logical commits. Prefix messages with your stream letter.
9. Final report (max 25 lines): what changed, files, tests run and their result, what you could
   not verify, and "Needs from others".

## Shared foundation already in place
- `User.developerMode` (boolean, default false). Developer tools are hidden unless true.
- `Contact.consentSource`, `Contact.consentAt`.
- `PushSubscription.lastSeenAt`, `.muted`, `.quietStart`, `.quietEnd`.
- `src/lib/webhook-events.ts`: the only list of webhook event names and payload shapes.
- Held on purpose, do not switch on: `CAMPAIGN_DISPATCH` (src/lib/feature-gates.ts) and
  `INBOUND_AUTOMATIONS`.

## Ownership
| Stream | Owns |
|---|---|
| A. Mobile notifications | `mobile/**`, `src/lib/push.ts`, `src/app/api/push/**` |
| B. App UI and simplicity | `src/app/settings/page.tsx`, `src/app/page.tsx`, `src/app/setup/**`, `src/app/register/**`, `src/app/login/**`, `src/components/common/SetupWalkthrough.tsx`, `src/components/layout/**`, `src/lib/navigation.ts`, `src/app/api/me/**` (new), global styles |
| D. API and webhooks | `src/app/api/v1/**`, `src/app/api/webhooks/endpoints/**`, `src/app/api/webhooks/deliveries/**`, `src/worker/outbound-webhooks.ts`, `src/app/settings/developer/**` (new), emitters call sites listed in the brief |
| E. Broadcast safety | `src/worker/dispatcher.ts`, `src/worker/scheduler.ts`, `src/worker/sweeper.ts`, `src/components/campaigns/**`, `src/app/campaigns/**`, `src/components/contacts/CsvImportModal.tsx`, `src/app/api/campaigns/**`, `src/app/api/contacts/import*/**` |
| F. Reliability and access | `src/app/api/webhooks/whatsapp/route.ts`, `src/app/inbox/**`, `src/components/inbox/**`, `src/app/api/chat/**`, `src/lib/modules.ts`, `src/app/api/modules/**`, `src/app/api/auth/**`, `src/lib/auth/**` |

`InitialSetupGatekeeper.tsx` belongs to stream C (not started). Nobody edits it.
