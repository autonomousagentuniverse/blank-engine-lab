#!/usr/bin/env python3
"""Assemble evidence. A successful run is not a photorealism verdict."""
import json,hashlib,os
from pathlib import Path
from PIL import Image,ImageDraw
root=Path("comparisons")
out=Path("artifacts/abc-comparison")
out.mkdir(parents=True,exist_ok=True)
arms=("A","B","C")
views=("front","three_quarter","profile","eyes_macro")
reports={}
for arm in arms:
    folder=root/arm
    r=json.loads((folder/"report.json").read_text())
    assert r["variant"]==arm and r["status"]=="GENERATED_UNAPPROVED_AWAITING_COMPARISON"
    assert len(r["frames"])==4 and r["release_allowed"] is False
    for f in r["frames"]:
        file=folder/(f["view"]+".png")
        assert file.exists() and file.stat().st_size>12000
        assert hashlib.sha256(file.read_bytes()).hexdigest()==f["sha256"]
    assert len({v["view"] for v in r["frames"]})==4
    assert (folder/("complete_"+arm+".blend")).exists()
    reports[arm]=r

# Side-by-side display, source and numerical metrics stored separately for reviewer masking.
labels={"A":"P2","B":"P3","C":"P1"}  # fixed predeclared shuffle to resist cherry-picking
canvas=Image.new("RGB",(4*700,3*745),(23,26,30))
d=ImageDraw.Draw(canvas)
for arm in arms:
    row=int(labels[arm][-1])-1
    for i,v in enumerate(views):
        tile=Image.open(root/arm/(v+".png")).convert("RGB")
        assert tile.size==(700,700)
        canvas.paste(tile,(i*700,row*745+30))
        d.text((i*700+12,row*745+8),labels[arm]+" | "+v,fill=(240,240,240))
canvas.save(out/"blinded_comparison.jpg",quality=94)
for r in reports.values():assert r["source_hash"]==reports["A"]["source_hash"]
summary={
 "schema":"blank.abc.compare.v1",
 "same_source_hash":reports["A"]["source_hash"],
 "camera_views":views,
 "cycles_samples":24,
 "pixel_size":[700,700],
 "candidate_count":3,
 "simultaneous_independent_jobs":True,
 "photoreal_acceptance":False,
 "release_allowed":False,
 "blinded_labels":labels,
 "metrics":{arm:{
   "hair_entropy_2d":r["hair_direction"]["tip_direction_entropy_2d"],
   "dominant_two_bin_fraction":r["hair_direction"]["two_largest_bins_fraction"],
   "hair_histogram":r["hair_direction"]["tip_direction_bins_12"],
   "face_field":r.get("face_field",{}),
   "hair_delta":r.get("hair_delta",{}),
   "brow_delta":r.get("brows_delta",{})} for arm,r in reports.items()},
 "result":"THREE_TECHNICALLY_VERIFIED_UNAPPROVED_CANDIDATES",
 "limitations":["same CC0-derived baseline identity, not independent new human anatomy",
               "C uses conditional procedural hair, brows, skin and face, but not a complete scan-quality eye rebuild",
               "global projected hair direction entropy cannot by itself establish hairstyle realism",
               "human visual ranking has not been obtained; preview cannot imply photorealism"]
}
(out/"comparison-report.json").write_text(json.dumps(summary,indent=2)+"\n")
print("ABC_COMPARE_EVIDENCE_VALID",json.dumps(summary),flush=True)
