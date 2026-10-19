# Anatomy Builder: Generation Stall / Recovery Fix (19 October 2026)

## Problem

The nine-animation one-shot Blender renderer requires multiple minutes. The
browser previously showed only RUNNING or STATUS ERROR with no stage, frame
count, progress estimate, or way to reconnect after a transient polling failure
or page refresh. A single failed GET ended tracking even while Blender
continued in the sandbox.

Access to the actual user's Vercel runtime logs was denied (403). This
diagnosis follows inspected source and reproduced local tests, not verified
logs from the user's specific generation.

## Implementation

- Blender worker inspects its own actual Cycles console output. Counts unique
  rendered PNG frames across nine animation clips (153 total), recording
  the phase, frame count, active clip, elapsed time and estimated remaining
  time. The status endpoint reports available completed MP4 clips.
- The selected Animation Studio clip is passed from browser -> Vercel API ->
  worker -> Blender and rendered FIRST. All remaining clips are then rendered
  in the same one-shot.
- Blender writes each MP4 to a temporary .mp4 filename and atomically renames
  after FFmpeg succeeds, so the worker cannot serve a half-encoded video.
- Completed clips may be downloaded/playable while the rest of the job is
  running, not only after the entire nine-animation build has completed.
- Browser progress panel reports current clip, total frame count, completed
  videos, ETA and lack of recent progress.
- Polling tolerates five consecutive transient failures, clearly reports
  reconnect attempts, and offers reconnect after tracking pauses. The job ID,
  creation time and selected animation are retained in localStorage, so
  reloading within the 30-minute sandbox window reconnects automatically.
  Expired 404/410 jobs are distinguished from transient failures.
- Full Blender worker still has a 15-minute process limit; if exceeded,
  the job now reports that limit and recommends reducing render quality
  instead of a generic SIGKILL status.
- Job output remains ephemeral, with no persistent external Blob storage.

## Verification

Existing Node tests and the new static recovery contract test passed.
Real HTTP POST with canonical MakeHuman fixture and selected Jog tested the
worker's actual Blender stdout progress from 0 to 153 frames. Jog was
downloadable while worker status was still RUNNING and the other eight
animations continued. The job ultimately completed with all nine clips.

Visual human/motion realism remains an independent quality gate. This fix
addresses job observability, early results and recovery, not gait fidelity.
