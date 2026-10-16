#!/usr/bin/env python3
"""Source-pinned official Einar v1 ZIP texture restoration.
Unpack only the verified licensed publisher archive into an isolated runner dir.
Do not alter the source blend, commit source binaries or invent missing files.
"""
from pathlib import Path
import hashlib,json,zipfile,stat,shutil
ZIP=Path(".ci-einar/einar-official.zip")
ROOT=Path(".ci-einar/source")
OUT=Path("artifacts/hero-v4-einar")
SHA="3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7"
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 if not ZIP.exists():raise FileNotFoundError("Missing official Einar ZIP")
 h=hashlib.sha256()
 with ZIP.open("rb") as f:
  for p in iter(lambda:f.read(4*1024*1024),b""):h.update(p)
 if h.hexdigest()!=SHA:raise ValueError("Unauthorized or changed source archive")
 records=[];count_images=0
 with zipfile.ZipFile(ZIP) as z:
  bad=z.testzip()
  if bad:raise ValueError("ZIP CRC failure: "+bad)
  if sum(x.file_size for x in z.infolist())>6_000_000_000:raise ValueError("Unpack budget exceeded")
  for e in z.infolist():
   p=Path(e.filename)
   if p.is_absolute() or '..' in p.parts or stat.S_ISLNK(e.external_attr>>16):
    raise ValueError("Unsafe archive entry: "+e.filename)
   if e.is_dir():continue
   if p.suffix.lower() not in {'.blend','.tif','.tiff','.png','.jpg','.jpeg','.exr','.hdr','.tga','.webp'}:continue
   dest=ROOT/p;dest.parent.mkdir(parents=True,exist_ok=True)
   with z.open(e) as src,dest.open("wb") as dst:shutil.copyfileobj(src,dst)
   records.append({"path":e.filename,"bytes":e.file_size})
   if p.suffix.lower()!='.blend':count_images+=1
 src=ROOT/"einar_release_v1.blend"
 if not src.is_file() or count_images!=63:raise ValueError("Missing required blend or texture count: "+str(count_images))
 report={"schema":"blank.hero-v4.einar-texture-source.v1","archive_sha256":SHA,
  "archive_crc":"PASS","license":"CC-BY","credit":"Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
  "source_blend":str(src),"textures_unpacked":count_images,
  "all_binary_files_unmodified_from_publisher_zip":True,
  "source_embedded_in_repo":False,"files":records}
 (OUT/"texture-restore.json").write_text(json.dumps(report,indent=2)+"\n")
 print("EINAR_V4_SOURCE_RESTORED",json.dumps({"sha256":SHA,"textures":count_images,"blend":str(src)}),flush=True)
if __name__=="__main__":main()
