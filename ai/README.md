# Blank Engine multi-agent NVIDIA prototype (alpha 0.3)

Server-only modules: `ai/nvidia.mjs` and `ai/orchestrator.mjs`.

## What it does

- Uses NVIDIA's hosted OpenAI-compatible chat-completions API, with `NVIDIA_API_KEY` stored only in GitHub Actions or another trusted backend.
- One director, four independent specialists (`world`, `gameplay`, `character`, `mission`) running at up to two concurrent requests, and one QA reviewer.
- Converts AI answers to a **strict version-1 GameSpec** (`core.mjs`), with deterministic validation and rejection of invalid values. Characters currently provide a design note, not actual animated NPC content.
- Independent model selection per role via `BLANK_MODEL_DIRECTOR`, `BLANK_MODEL_WORLD`, `BLANK_MODEL_GAMEPLAY`, `BLANK_MODEL_CHARACTER`, `BLANK_MODEL_MISSION`, and `BLANK_MODEL_QA`. `BLANK_MODEL` sets a default for all roles.
- Default NVIDIA model: `openai/gpt-oss-20b`, currently listed as a hosted free prototype endpoint. Availability and quotas may change; don't assume unlimited free use.
- No retries on HTTP failures, no unbounded recursion, 45-second timeout per API call, 512 output-token cap per role, and zero dynamic code execution.

## How to test

1. Run unit tests locally with `npm test` — no API key needed.
2. Store `NVIDIA_API_KEY` as a GitHub Actions repository secret.
3. GitHub Actions → `Blank Engine — NVIDIA manual test` → Run workflow → `smoke` for a single authenticated model response; `agents` for an optional end-to-end six-agent experiment.

Both Actions tests are **manually triggered**, never on push. Neither action changes the database nor deploys to Vercel.

The current prototype does **not** yet persist LLM call outputs into the PostgreSQL task ledger or expose a secure authenticated API to the browser. Those are the next backend milestones.

## Alpha 0.4: PostgreSQL-backed playable GameSpec pipeline

Manual workflow: `.github/workflows/blank-create-game-manual.yml` (GitHub Actions → **Blank Engine — create playable GameSpec (manual)**).

- Requires repository Actions secrets `NVIDIA_API_KEY` and `BLANK_PG_URL` (server-side only).
- Runs all unit tests; one director, four specialists, and QA produce validated GameSpec v1.
- Creates a project or updates an explicitly supplied project UUID with an optimistic version check.
- Tracks one run, six task outputs including model/token usage, revision history and audit event.
- On provider/QA failure, records run failure without publishing an unvalidated revision.
- Uploads **GameSpec JSON** plus provenance receipt as a 7-day GitHub Actions artifact. Unzip and import `blank-game-spec.json` using the **Import GameSpec** button in the *updated* Blank Engine browser editor. The current deployed Vercel version does not yet include that button.
- Rerunning a workflow attempt cannot run the same creation request twice: GitHub run ID is the request key. Start a new manual workflow run for a new attempt.
- **Not yet available:** a live browser-to-AI backend; the browser does not access PostgreSQL or NVIDIA secrets. The GameSpec controls an existing procedural 3D world, not a fully generated AAA game or character assets.
- **No automatic Vercel deployment** is configured. Every deployment requires explicit authorization.
