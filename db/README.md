# Blank Engine PostgreSQL (alpha 0.2)

This is a server-only database adapter. Browser modules must never load db/store.mjs or see BLANK_PG_URL.

## Configuration
Store BLANK_PG_URL as a GitHub Actions repository secret. It is NOT automatically available to Vercel or the browser. Use the provider's TLS connection string; do not bypass certificate checks. The database role needs permission to create tables in the public schema.

## Manual-only operations
GitHub → Actions → Blank Engine — manual database check → Run workflow.

Choose **check** (default): runs engine unit tests and a read-only SELECT 1; changes no database tables.

Choose **migrate** only when explicitly approved: transactionally creates public.blank_* tables from db/migrations/0001_core.sql and records migration version. It does not alter unrelated tables.

Tables:
- blank_projects: authoritative versioned GameSpec
- blank_spec_revisions: historical specs and rollback support
- blank_agent_runs: full game-creation requests
- blank_agent_tasks: queued agent jobs, leasing, retries, model usage
- blank_agent_events: provenance and audit trail
- blank_schema_migrations: applied versions

## Development
Run local tests: node --test test.mjs test/*.test.mjs.
After installing dependencies and securely supplying BLANK_PG_URL:
npm run db:check

Database migration is NEVER invoked automatically on commits or Vercel deployments. This module lays the foundation for a future authenticated backend and workers; a persistent orchestrator and server authorization layer are still required.


## GitHub-hosted runner network compatibility

The read-only workflow can report `NETWORK_UNREACHABLE` when a database
hostname resolves only to IPv6 addresses. Standard GitHub-hosted runners
may not have outbound IPv6 connectivity. Reordering DNS to prefer IPv4
cannot help unless the hostname has an IPv4 (A) record.

Obtain a provider-supplied **IPv4-reachable PostgreSQL connection string**,
typically a *session pooler* URL (or enable the provider's IPv4 endpoint),
then replace the GitHub Actions repository secret `BLANK_PG_URL`.
Do not paste database URLs into commits, issues or logs. Ensure the
endpoint permits connections from GitHub-hosted runners and requires TLS.
Rerun the manual workflow with `operation=check`. This runs only
`SELECT 1` and does not apply migrations.
