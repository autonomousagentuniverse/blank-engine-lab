# Hosted Anatomy Builder: Real Blender worker

## What is implemented

The Vercel-hosted Anatomy Builder submits its exact deformed connected
MakeHuman snapshot (93 controls, body geometry, eye ornaments and curved hair)
through a Node Vercel Function at /api/anatomy. The function forwards
authenticated POST /api/rebuild and GET job-status requests to a separate
Render-hosted Blender worker; the secret remains server-side. Blender starts
a clean scene and returns six Cycles PNGs, a report and a downloadable editable
anatomical_character.blend; the browser polls until the result is ready.

The previous hosted "Submit -> export JSON" implementation is gone. Errors
must display as errors, not simulated success.

## Hosting architecture

- Vercel project: blank-engine-lab, experimental preview branch only.
- Render: new isolated public web service, Docker runtime,
  Dockerfile.anatomy, port 10000, branch experiment/anatomy-blender-cloud-worker-20261019.
- WORKER_MODE=1 (Dockerfile), BLENDER_WORKER_TOKEN=<unique high-entropy secret>
  on Render; match same secret in the *Vercel Preview branch environment*.
- Vercel Preview env BLENDER_WORKER_URL=https://<render-service>.onrender.com.
- Render API POST and GET job status are bearer-token restricted.
- Result file routes are read-only, served directly from Render by
  unguessable UUID; they expire and are pruned after one hour.
- No Render workspace or paid plan should be chosen without owner approval.
  The Render connector explicitly requires workspace selection first.

## Test evidence before hosted deployment

Real Chromium produced an African-feminine default MakeHuman snapshot
with 13,524 vertices and 286 scalp follicles (845,394 UTF-8 bytes).
A real Vercel Function handler forwarded it to a protected local Node worker.
Blender 5.0.1 generated 6 Cycles PNGs and a 5,708,094-byte editable .blend.
Actual full-round-trip job-status and direct asset downloads passed.
Unprotected POST/GET job-status requests returned HTTP 401.
14 Node tests passed.

Measured one-shot Blender process high-water resident memory:
425,036 kB at 480px/8 Cycles samples, 5.62 s in the isolated 4GB test VM.
Render 512MB free instances may run out of memory when Node overhead is added;
a >=2GB instance is safer if user authorizes associated charges.
This is compute readiness, not proof that an unprovisioned hosted Render
worker is already running.

## Next steps

1. Get owner confirmation for which Render workspace to use.
2. Create worker service on approved workspace, provision random shared secret.
3. Set matching Vercel Preview branch env and manually deploy preview commit.
4. Check worker is healthy and submit a real browser request from deployed URL.
5. Show actual six PNGs and .blend link; inspect and preserve failure logs.
6. Never change Blank Engine production Vercel aliases during this test.

## Known limitations

Worker local disk and job state may be lost during a Render restart; output
downloads must be completed within the lifetime of the instance and job TTL.
A durable object-storage-backed job queue should precede broader multi-user
production use. A free Render instance can sleep, delaying the first request.
Body/face/hair anatomical photorealism is still on visual HOLD; this workflow
guarantees a real Cycles build, not human visual certification.

