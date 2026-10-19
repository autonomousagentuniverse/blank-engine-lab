# Hosted Anatomy Builder — Vercel Sandbox one-shot Blender

This is the active Vercel-only implementation. The former Render Docker worker
was not deployed; the previous description in this file is superseded.

## Execution contract

- User adjusts 93 controls on the Vercel preview builder and presses
  "Generate actual Blender build".
- The Vercel API route \`/api/anatomy\` validates the full control and indexed
  MakeHuman geometry snapshot, forks a pre-warmed Vercel Sandbox named
  \`blank-anatomy-blender-base\`, and launches the protected Node worker.
- The base Sandbox was prepared in the Blank Engine Lab project with
  Blender 5.0.1, 2 vCPUs and 4 GB RAM. Its saved snapshot contains a
  checkout of the experimental worker branch and its installed Blender.
  Forks inherit these dependencies without repeating apt installation.
- Each job gets a unique sandbox and its own cryptographically random
  authentication token. The token is stored inside the isolated sandbox;
  neither the browser nor the Vercel Preview env stores a shared worker key.
- The Vercel route POST returns a composite job ID (sandbox UUID + worker
  UUID). GET with that ID reconnects to the sandbox and polls the job.
- When Blender completes, the user sees 6 actual Cycles PNGs and an
  editable .blend file, directly served over the sandbox's exposed HTTPS port.
  The worker includes strict numeric geometry parity, closed topology,
  eye-diameter verification and real source provenance.

## Limitations and security

**This is temporary experimental storage, not Vercel Blob.** Creating a Vercel
Blob store failed with a Vercel 403 authorization error for the connected
account. Sandbox files expire when the sandbox shuts down (configured
30-minute runtime). Users MUST download .blend and image files promptly.
For long-term asset preservation, a separately authorized private Blob
store or equivalent object storage will be needed.

Sandbox workers are protected by per-job bearer tokens for API access.
Download URLs are public but random UUID-scoped (anyone with the specific
output link can read the file while that sandbox exists). The browser preview
currently relies on Vercel Deployment Protection for user access. Before
production or larger concurrency, add account-level quotas and rate limits
to prevent abusive expensive Sandbox creation.

## Verified independently

- Real Sandbox source snapshot contained Blender 5.0.1.
- The worker was started on port 10000 and was publicly reachable via
  \`https://*.vercel.run/healthz\`.
- A valid 93-control indexed MakeHuman test fixture submitted over HTTPS
  ran headless Blender; all 6 rendered views and .blend were returned.
- The strict eye metric rejected an intentionally inconsistent fixture;
  correcting the fixture's actual sclera diameter to 24mm passed.
- Existing 14 regression tests pass.
- Previous Vercel Sandbox run with genuine browser-sourced morphs already
  built a 5.7 MB editable .blend and six output images.
- Final hosted preview API deployment and end-to-end button click remain
  separate verification gates; do not claim READY without checking them.

## Projects, files, and ops

- Repo: \`autonomousagentuniverse/blank-engine-lab\`
- Experiment: \`experiment/anatomy-blender-cloud-worker-20261019\`
- Vercel project: \`blank-engine-lab\` (preview only)
- Base sandbox: \`blank-anatomy-blender-base\` (saved snapshot, expiry 7 days)
- Core: \`api/anatomy.js\`, \`character-pipeline/manual-builder/app.mjs\`
- Blender: \`character-pipeline/manual-builder/build_replica.py\`
- Config: \`@vercel/sandbox\` SDK, Node.js 24
- No Render service is used. Do not change production without owner approval.
