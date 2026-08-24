# Changelog

All notable changes to the WAYAPP platform will be documented in this file.

## [4.0.0] - 2026-08-25

### Added
- **Real-time SSE Engine**: Smart capacity-based auto-routing for the agent inbox.
- **Visual Pipeline Kanban**: Step 2 & 3 integrations for CRM functionality.
- **R2 Backups**: Twice-daily automated and encrypted streaming backups to Cloudflare R2.
- **Graceful Shutdown**: Zero-downtime rollover support for Node/Docker deployments.
- **Health Checks**: Deep `/api/health` monitoring with memory usage and database pings.
- **UI System**: Professional Skeleton loaders and Empty States across all modules.
- **Analytics Export**: CSV data export for campaigns and messages.

### Changed
- **Database Architecture**: Full transition to PostgreSQL 16 via Docker with memory limits.
- **Security**: Strict environment fallback protections for `AUTH_SECRET` and passwords.
- **Repository Structure**: Added `AGENTS.md`, `.github/CODEOWNERS`, and prompt templates for AI development.
- **Docs**: Comprehensive non-tech user documentation (Getting Started, Deployment, Troubleshooting).

### Fixed
- **Analytics Integrity**: Fixed critical bug where `REPLIED` messages were omitted from sent/delivered/read counts.
- **Message Mirroring**: Fixed dispatcher to properly mirror campaign template sends to the `ChatMessage` table for agent inbox visibility.
- **Data Loss**: Preserved original `totalContacts` counts when resuming paused campaigns.
- **Audience Filters**: Abort campaigns with malformed JSON filters instead of defaulting to bulk broadcasts.
- **Status Guards**: Enforced `STATUS_RANK` progression on all webhook receipt updates to prevent backsliding.
