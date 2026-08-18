# Milestones, Dependencies & Risks

## Milestone map

```
M0  P0–P2   Emergency incident response + password auth/RBAC + PostgreSQL/migrations   ← foundation
M1  P3–P4   Separate worker (pg-boss) + webhook reliability + F3 campaigns complete    ← engine
M2  F1      Flow builder (core nodes + simulator)
M3  F2      AI/HTTP bots + OpenRouter + Knowledge Base generator
M4  F4      Multi-agent inbox (Conversation model, assignment, notes)
M5  F5      Public API v1 (full surface) + outbound webhook delivery + docs
M6  F6+P8   Expo native app + PWA offline/push + observability + test suite
M7  P9      Docs & config hygiene + Postgres backups
```

## Dependencies

- M0 → everything (auth/RBAC + PG are prerequisites for all features)
- M1 → F1, F2, F4 (flow engine + bots + webhook delivery run in the worker)
- F3 = M1 (campaign completion ships with engine hardening)
- M4 → M5 (conversation/agent APIs needed for full v1 surface)
- M5 → M6 (native app consumes v1 API — strict prerequisite)
- M6 + M7 → final release

## Execution order (recommended)

1. **M0 first, in one focused push** — P0 (manual cred rotation by owner + scripted purge), P1 (auth), P2 (Postgres + migrate). Touches overlapping files; do not parallelize internally.
2. **M1 next** — worker extraction touches queue/webhook/dispatch code; P3+P4 share the same surface.
3. **M2–M5 sequential** — each lands on the worker + PG foundation; M5 unblocks M6.
4. **M7 last** — docs must reflect the final state (Postgres, worker, env vars).

## Per-milestone tests

| Milestone | Tests |
|---|---|
| M0 | JWT sign/verify (fail-closed), RBAC helper, rate limiter, password hashing |
| M1 | Queue state machine transitions, dispatch idempotency (double-START/RESUME), webhook upsert dedup, counter transitions, HMAC |
| M2 | Flow node advance, delay resume, loop/run-limit guards, condition evaluation |
| M3 | Provider adapters, KB generation prompt, cooldown/daily-cap enforcement |
| M4 | Conversation auto-create, assignment transitions, round-robin skip-away |
| M5 | API key auth + scopes, bearer token, webhook HMAC + retry/backoff/dead-letter |
| M6 | Push delivery, PWA offline, app E2E (login → chat → send) |
| M7 | Backup/restore drill, migration from clean install |

## Risks & mitigations

1. **Git history purge vs repo visibility/forks** — set repo private before purge; coordinate with any open PRs; verify with `git rev-list --all` + gitleaks after.
2. **SQLite → PostgreSQL data migration** — rehearse against a copy; freeze writes during cutover; keep SQLite volume as rollback until smoke-tested.
3. **Meta token rotation breaks live integration** — schedule a maintenance window; re-run the 3-step activation gatekeeper after rotation.
4. **Single-instance worker constraint** — document "no replicas" in README; worker and web container must point at one Postgres; pg-boss guarantees single consumer per job type even if accidentally scaled.
5. **`NEXT_PUBLIC_*` baked at build** — never add runtime-needed values as `NEXT_PUBLIC_*`; use server env + runtime APIs.

## Decision log

| Decision | Choice |
|---|---|
| Auth model | Password-based (email + hashed password), RBAC roles |
| Database | PostgreSQL + `prisma migrate` |
| Dispatch architecture | Separate worker container (pg-boss queue) |
| AI providers | OpenAI, Anthropic, Gemini, OpenRouter, OpenAI-compatible + Knowledge Base generator |
| Flow builder | Core nodes (message, quick replies, condition, delay, tag/group actions, GoTo) |
| Mobile | Native Expo app now (consumes v1 API) |
| REST API v1 | Full surface (contacts, messages, templates, campaigns, conversations, agents, flows, analytics) |
