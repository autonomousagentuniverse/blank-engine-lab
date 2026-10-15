# Blank Engine multi-agent alpha 0.3

Server-side, provider-independent GameSpec generation using NVIDIA's OpenAI-compatible inference endpoint.

The six roles are **director**, **world**, **gameplay**, **character**, **mission**, and **qa**. Four specialists run with a maximum concurrency of two; the director first and QA last. All generated changes pass deterministic GameSpec v1 validation; invalid or QA-rejected results fail closed. Characters currently provide ideas rather than implemented NPCs.

Default free prototype model: `openai/gpt-oss-20b`. Availability, rate limits, and free-tier terms may change. Override independently with `BLANK_MODEL` or `BLANK_MODEL_<ROLE>`. Never copy the `NVIDIA_API_KEY` GitHub Actions secret into browser code.

## Manual tests

Use GitHub Actions → **Blank Engine — NVIDIA manual test** and choose:
- `smoke`: a single authenticated model request.
- `agents`: a bounded six-agent call creating a validated GameSpec.

Neither workflow mode runs on a push, changes the database, or deploys to Vercel. Persistent agent execution and a secure browser-accessible backend are future milestones.
