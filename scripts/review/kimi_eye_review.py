#!/usr/bin/env python3
"""Request an independent Kimi review of real Blank Engine eye geometry failures.

Read-only. Runs in GitHub Actions with repository secret MOONSHOT_API_KEY.
Never prints tokens or raw API error bodies. No production edits.
"""
import base64
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "artifacts" / "kimi-eye-review"
API = "https://api.moonshot.ai/v1"
PREFERRED = ("kimi-k2.6", "kimi-k2.5")
SOURCE_FILES = [
 "experiments/eye-v7/front_facing.py",
 "experiments/eye-v6/bridge_socket.py",
 "geometry/eye-socket-remesh.mjs",
 "experiments/eye-v5/sample_fix.py",
 "character-lab/eyes.mjs",
 "docs/eye-v7-facing.md",
 "docs/eye-v6-transition.md",
]
def request(route,key,method="GET",data=None,timeout=160):
    headers={"Authorization":"Bearer "+key,"Content-Type":"application/json"}
    req=urllib.request.Request(API+route,headers=headers,data=data,method=method)
    try:
        with urllib.request.urlopen(req,timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as ex:
        raise RuntimeError("Moonshot request failed with HTTP "+str(ex.code)+" (response suppressed)") from None
    except urllib.error.URLError as ex:
        raise RuntimeError("Moonshot connection failed; credentials and raw body suppressed") from None

def load_images():
    root=ROOT/".ci-kimi-eye-screenshots"/"artifacts"
    pairs=[("v6 prior input macro",root/"hero-v7-facing-before-macro.png"),
           ("v7 repaired-face direction macro",root/"hero-v7-facing-after-macro.png")]
    found=[]
    for label,p in pairs:
        if p.exists() and 1000 < p.stat().st_size < 900000:
            found.append((label,p))
    return found

def main():
    key=os.environ.get("MOONSHOT_API_KEY","").strip()
    if not key:raise RuntimeError("MOONSHOT_API_KEY secret missing; no request made")
    available=request("/models",key)["data"]
    models={x["id"]:x for x in available if isinstance(x,dict) and isinstance(x.get("id"),str)}
    # MOONSHOT_ID may be an account ID; prefer a documented Kimi instant-capable model.
    model=next((m for m in PREFERRED if m in models),None)
    if not model:raise RuntimeError("No preferred Kimi model returned from Moonshot account /models")
    texts=[]
    for file in SOURCE_FILES:
        path=ROOT/file
        if not path.exists():raise RuntimeError("Required repo file missing: "+file)
        txt=path.read_text(encoding="utf-8")
        if len(txt)>2400:txt=txt[:2400]+"\n[EXCERPT TRUNCATED]"
        texts.append("=== "+file+" ===\n"+txt)
    history="""User goal: create ONE photorealistic isolated game-ready hero; do not mass produce.
Actual source is a 53-joint CC0 MakeHuman suited GLB with pink original sockets; source material is Human.body, the eye assembly is 8 rigid head-attached procedural opaque meshes.
v4: skinned face socket copy, 112 new face vertices/224 triangles; Chrome and GLB tests passed but human visual FAIL. Discovered all 224 new triangles had collapsed UVs and mismatched orientation.
v5: experimental fix UV and face normals, structural PASS; actual real Three.js/Chrome eye-region image changed just ~0.25%, pink rim unchanged.
v6: source two 28-point boundary contours per eye and measured gap ~2.313mm; +112 skinned vertices/+224 triangles, structural and Chrome PASS, 0 eye-region pixels changed: visual FAIL.
v7: flipped 448 added v5/v6 triangles toward Character Lab +Z front camera, preserve original 15,500 face triangles/8,456 original normals, real Chrome/GLB PASS. Eye-region pixels changed ~3.946% but still conspicuous pink rims, synthetic sclera/iris and socket shading. Human photorealism acceptance remains BLOCKED.
Critical uncertainty: the real source pink socket surface may continue drawing in front of the new geometry; inspect depth, UV ownership, backface visibility and actual pixels. DO NOT claim zero differences prove invisibility without examining actual screenshots.
Deployment policy: no Vercel deploy, no production merge, all QA manual-only outside a narrowly-scoped one-time branch test. User expects hard evidence before edits."""
    prompt="""Independent expert technical review. You are Kimi reviewing an actual experimental Three.js/glTF source-pinned character.
Challenge the prior assistant's conclusions. Distinguish findings proven by code and run results from hypotheses. In particular do not assume a global +/-Z normal direction alone proves faces are correctly oriented for every eyelid position and viewing angle.
Analyze why v4 through v7 structural passes do not improve the eyes, and what smallest MEASURABLE experiment is most likely to isolate the true cause of visible pink eye rims.
Provide:
1) Exact code-rooted defects with file/function references; severity and confidence, and note mathematical mistakes if any.
2) Render-debug experiment plan to determine per-pixel visible triangle/object/material IDs, UV/texel ownership, depth occlusion and front/profile images; exact falsification tests, no fake numerical results.
3) Proposed corrected anatomical topology/skin UV work ONLY after diagnosis, preserving 53 joints, 4 clips, original bytes, provenance, no hidden overlays or production edits.
4) Brief recommendation: keep iterating on current MakeHuman head vs source a genuinely complete properly licensed face; compare effort and failure risk.
5) Ask for only essential missing artifacts.
Be rigorous, direct, concrete. State what cannot be inferred from screenshots or code. Cite filenames and line/function names in the provided data; no invented citations.
Context:
"""+history+"\n\nRepository source:\n"+"\n\n".join(texts)
    maxchars=23500
    if len(prompt)>maxchars:prompt=prompt[:maxchars]+"\n[INPUT TRUNCATED]"
    images=[]  # Text-only for time-bounded retry.
    usercontent=[{"type":"text","text":prompt}]
    vis=False
    if vis:
        for label,p in images:
            uri="data:image/png;base64,"+base64.b64encode(p.read_bytes()).decode("ascii")
            usercontent += [{"type":"text","text":"Actual previous GitHub Actions Chrome screenshot: "+label},
                             {"type":"image_url","image_url":{"url":uri}}]
    sysmsg="You are a skeptical senior graphics engineer specializing in glTF 2.0, facial skin meshes, texture atlases, depth/occlusion and realtime rendering. Answer exactly the user's technical question. No vague reassurance. Do not output secrets."
    payload=json.dumps({"model":model,"messages":[{"role":"system","content":sysmsg},
        {"role":"user","content":usercontent if vis else prompt}],"max_tokens":4200,"thinking":{"type":"disabled"}},
        separators=(",",":")).encode("utf-8")
    reply=request("/chat/completions",key,"POST",payload,timeout=125)
    msg=reply.get("choices",[{}])[0].get("message",{})
    c=msg.get("content")
    if isinstance(c,str):answer=c
    elif isinstance(c,list):answer="\n".join(item.get("text","") for item in c if isinstance(item,dict))
    else:answer=""
    if len(answer.strip())<250:raise RuntimeError("Kimi model returned empty/too-short content; review incomplete")
    OUT.mkdir(exist_ok=True,parents=True)
    report="# Kimi independent Blank Engine eye geometry review\n\n"
    report+="**Model:** "+model+"\n\n**Images attached:** "+(", ".join(x[0] for x in images) if vis else "none; source and logged evidence only")+"\n\n"
    report+="**Status:** third-party technical review, NOT implementation or human photorealism approval.\n\n"+answer+"\n"
    (OUT/"KIMI_EYE_REVIEW.md").write_text(report,encoding="utf-8")
    (OUT/"metadata.json").write_text(json.dumps({"model":model,"image_input":vis,
      "source_files":SOURCE_FILES,"usage":reply.get("usage",{}),"review_chars":len(answer),
      "source_revision":os.environ.get("GITHUB_SHA","unknown"),
      "review_status":"received_not_approved"},indent=2)+"\n")
    print("KIMI_EYE_REVIEW_RECEIVED model="+model+" chars="+str(len(answer))+" images="+str(vis))
    print("Review saved as Actions artifact; no source modifications or secret values printed.")

if __name__=="__main__":
    try:main()
    except Exception as ex:
        print("KIMI_EYE_REVIEW_FAILED "+str(ex),file=sys.stderr)
        sys.exit(1)
