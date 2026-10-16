#!/usr/bin/env python3
"""Fetch-independent audit of the official CC0 Blender Human Base Meshes bundle.
Does not rely on unverified third-party sample mirrors, does not mutate source.
"""
from pathlib import Path
import hashlib, json, sys, zipfile

SOURCE_URL="https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip"
EXPECTED_BYTES=50643039
def main():
    if len(sys.argv)!=3: raise SystemExit("Usage: bundle_inspect.py zipfile outputdir")
    src=Path(sys.argv[1]);out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
    raw=src.read_bytes()
    if len(raw)!=EXPECTED_BYTES:raise ValueError("Source bundle length changed; refuse silent replacement: "+str(len(raw)))
    digest=hashlib.sha256(raw).hexdigest()
    record={"source_url":SOURCE_URL,"license":"CC0-1.0, as marked on official Blender demo files page",
      "sha256":digest,"download_bytes":len(raw),"license_status":"published_cc0_scope_confirmed_for_bundle_only",
      "photorealism_approved":False,"source_immutable":True,"blend_files":[]}
    with zipfile.ZipFile(src) as z:
        bad=z.testzip()
        if bad:raise ValueError("ZIP integrity failed on "+bad)
        for info in z.infolist():
            path=Path(info.filename)
            if path.is_absolute() or '..' in path.parts or info.file_size>650_000_000:
                raise ValueError("Unsafe zip entry: "+info.filename)
            if path.suffix.lower()!='.blend':continue
            # Strip nested directories, avoid overwriting identical basenames.
            dest=out/"blend-files"/path.name
            if dest.exists():dest=dest.with_name(hashlib.sha256(info.filename.encode()).hexdigest()[:8]+"-"+path.name)
            dest.parent.mkdir(parents=True,exist_ok=True)
            with z.open(info) as source, dest.open('wb') as target:
                import shutil
                shutil.copyfileobj(source,target)
            record["blend_files"].append({"archive_path":info.filename,"extracted_path":str(dest),
                "size":info.file_size,"sha256":hashlib.sha256(dest.read_bytes()).hexdigest()})
    if not record["blend_files"]:raise ValueError("Official bundle has no .blend files")
    p=out/"bundle-audit.json";p.write_text(json.dumps(record,indent=2)+"\n")
    print("HERO_V2_CC0_BUNDLE_AUDIT_PASS "+json.dumps(record))
if __name__=="__main__":main()
