# AI Prompt Template: Debug Analytics & Delivery Metrics

You are tasked with debugging message analytics, broadcast delivery funnels, or webhook receipts in WAYAPP.

## Key Rules & Logic:
1. **Status Progression Hierarchy:**
   - Message status hierarchy is: `PENDING` -> `QUEUED` -> `SENT` -> `DELIVERED` -> `READ` -> `REPLIED`.
   - Never allow delayed webhooks to downgrade a status (e.g. `READ` back to `DELIVERED`). Use status ranking logic.
2. **Cumulative Funnel Counts:**
   - In analytics queries (`src/app/api/analytics/route.ts`), `SENT` count includes all messages that reached `SENT`, `DELIVERED`, `READ`, or `REPLIED`.
   - `DELIVERED` count includes `DELIVERED`, `READ`, and `REPLIED`.
   - `READ` count includes `READ` and `REPLIED`.
3. **Optimistic Counter Reconciliation:**
   - Reconcile `sentCount`, `deliveredCount`, `readCount`, and `failedCount` from `ChatMessage` table via `src/worker/sweeper.ts:reconcileCampaignCounters()`.
4. **Timezone & Aggregation:**
   - Use UTC ISO timestamps for group-by daily queries.
