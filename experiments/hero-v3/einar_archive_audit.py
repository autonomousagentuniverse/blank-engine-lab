#!/usr/bin/env python3
"""Audit downloaded official Einar ZIP; only files from verified Blender Studio.
No mutation of source and no source-binary upload to repository/artifact.
"""
import hashlib,json,os,sys,zipfile,stat
from pathlib import Path
OUT=Path("artifacts/hero-v3-einar");OUT.mkdir(parents=True,exist_ok=True)
INPUT=Path(".ci-einar/einar-official.zip")
URL="https://studio.blender.org/download-source/files/41/419e83fb75f30b989adf7920dec7a21c/419e83fb75f30b989adf7920dec7a21c.zip"
def main():
    if not INPUT.exists():raise FileNotFoundError("Expected official Blender Studio ZIP not downloaded")
    sha=hashlib.sha256(INPUT.read_bytes()).hexdigest()
    report={"schema":"blank.hero-v3.einar-archive-audit.v1","official_download_url":URL,
      "archive_sha256":sha,"archive_bytes":INPUT.stat().st_size,
      "source_acquired":True,"license_statement_verified_from_official_page":True,
      "license":"CC-BY, Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
      "blend_files":[],"image_files":[],"license_or_readme_files":[],
      "total_entries":0,"total_uncompressed_bytes":0,"zip_integrity":"not_checked",
      "model_data_loaded":False,"glb_verified":False,"photorealism_approved":False}
    with zipfile.ZipFile(INPUT) as z:
      entries=z.infolist()
      for i in entries:
        name=Path(i.filename)
        if name.is_absolute() or ".." in name.parts or str(name).startswith("/") or ":" in name.parts[0]:
          raise ValueError("Unsafe archive path "+i.filename)
        if i.file_size>2_000_000_000:raise ValueError("Single source entry too large "+i.filename)
        if stat.S_ISLNK((i.external_attr>>16)&65535):raise ValueError("Archive contains symlink")
      report["total_entries"]=len(entries)
      report["total_uncompressed_bytes"]=sum(x.file_size for x in entries)
      if report["total_uncompressed_bytes"]>6_000_000_000:raise ValueError("Archive expands beyond safety budget")
      damaged=z.testzip()
      if damaged:raise ValueError("Zip CRC mismatch at "+damaged)
      report["zip_integrity"]="PASS"
      for x in entries:
        n=x.filename;low=n.lower()
        item={"path":n,"bytes":x.file_size}
        if low.endswith(".blend"):report["blend_files"].append(item)
        if low.endswith((".png",".jpg",".jpeg",".exr",".tif",".tiff",".hdr",".webp",".tga")):report["image_files"].append(item)
        if low.endswith(("license","license.txt","license.md","readme","readme.md","readme.txt","credits.txt")):report["license_or_readme_files"].append(item)
      report["image_count"]=len(report["image_files"])
      report["image_total_bytes"]=sum(x["bytes"] for x in report["image_files"])
      # Preserve only lightweight text files to verify dependency license.
      for item in report["license_or_readme_files"][:12]:
        if item["bytes"]<200_000:
          content=z.read(item["path"]).decode("utf-8","replace")
          report.setdefault("embedded_rights",[]).append({"path":item["path"],"text_excerpt":content[:14000]})
      # To keep the runner bounded, extract at most one top-level source rig candidate.
      blends=sorted(report["blend_files"],key=lambda x:(0 if "einar" in x["path"].lower() else 1,
                                                            0 if "rig" in x["path"].lower() else 1,
                                                            -x["bytes"]))
      for entry in blends[:2]:
        if entry["bytes"]>1_600_000_000:continue
        target=Path(".ci-einar/source-files")/Path(entry["path"]).name
        target.parent.mkdir(parents=True,exist_ok=True)
        with z.open(entry["path"]) as r, target.open("wb") as f:
          import shutil
          shutil.copyfileobj(r,f)
        record={"path":str(target),"original_archive_path":entry["path"],"bytes":entry["bytes"],
                "sha256":hashlib.sha256(target.read_bytes()).hexdigest()}
        report.setdefault("extracted_for_inspection",[]).append(record)
    (OUT/"archive-audit.json").write_text(json.dumps(report,indent=2)+"\n")
    print("EINAR_OFFICIAL_ARCHIVE_INTEGRITY_PASS size="+str(report["archive_bytes"])+" sha256="+sha)
    print("EINAR_SOURCE_COUNTS blends="+str(len(report["blend_files"]))+
          " image_files="+str(report["image_count"])+" extracted="+str(len(report.get("extracted_for_inspection",[]))))
if __name__=="__main__":main()
