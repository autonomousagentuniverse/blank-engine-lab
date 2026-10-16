#!/usr/bin/env python3
"""Blank Engine headless Blender asset factory v1.

One manifest -> licensed source -> Blender evaluated asset -> real GLB ->
structural gate -> real Chrome/Three.js screenshots -> evidence manifest.

This is a proven Einar adapter, not a claim that arbitrary mesh generation,
source film shaders, hair grooming or blink animations are already supported.
A failed stage never promotes a visual result or changes the live website.
"""
import argparse,hashlib,json,os,re,subprocess,sys,time,urllib.parse,urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCHEMA="blank.asset-factory.profile.v1"
VERSION="blank.asset-factory.run.v1"
APPROVED_ADAPTERS={"einar-static-pbr-v1"}
PUBLISHER="studio.blender.org"
SOURCE_ZIP=ROOT/".ci-einar/einar-official.zip"
RUNTIME=ROOT/"artifacts/hero-v5-einar/einar-static-pbr.glb"
CAPTURE=ROOT/"artifacts/hero-v5-einar"
STAGES=("download","restore","blender","glb_integrity","engine_tests","webgl_capture","contact_sheet")

def read_profile(path):
    raw=json.loads(Path(path).read_text())
    if raw.get("schema")!=SCHEMA or raw.get("adapter") not in APPROVED_ADAPTERS:
        raise ValueError("Unsupported asset factory schema or adapter")
    asset=raw.get("asset",{})
    aid=asset.get("id","")
    if not re.fullmatch(r"[a-z][a-z0-9_-]{2,39}",aid):raise ValueError("Unsafe asset ID")
    if asset.get("kind")!="character":raise ValueError("Only character adapter is implemented in v1")
    src=raw.get("source",{})
    url=urllib.parse.urlparse(src.get("url",""))
    if url.scheme!="https" or url.hostname!=PUBLISHER or url.username or url.password or url.fragment:
        raise ValueError("Source must be an uncredentialed official Blender Studio HTTPS archive")
    if url.query:raise ValueError("Credentials/query-string URLs are forbidden")
    if not url.path.endswith(".zip"):raise ValueError("Expected publisher ZIP")
    if not re.fullmatch("[0-9a-f]{64}",src.get("sha256","")):raise ValueError("Missing pinned SHA256")
    if not isinstance(src.get("bytes"),int) or not 0<src["bytes"]<2_000_000_000:
        raise ValueError("Source byte bound invalid")
    license=raw.get("license",{})
    if license.get("id")!="CC-BY" or not license.get("credit"):
        raise ValueError("Missing explicitly recorded licensed publisher/credit")
    if raw.get("publish",False) is not False:raise ValueError("Automatic publishing is forbidden")
    if not isinstance(raw.get("visual_approval_required"),bool) or not raw["visual_approval_required"]:
        raise ValueError("Mandatory independent human visual approval missing")
    if raw.get("outputs")!={"runtime_glb":"artifacts/hero-v5-einar/einar-static-pbr.glb",
                             "browser_evidence":"artifacts/hero-v5-einar"}:
        raise ValueError("Adapter output paths must match verified v5 toolchain")
    return raw

def sha256(path):
    h=hashlib.sha256()
    with Path(path).open("rb") as file:
        for block in iter(lambda:file.read(4*1024*1024),b""):h.update(block)
    return h.hexdigest()

def verify_download(profile):
    return SOURCE_ZIP.is_file() and SOURCE_ZIP.stat().st_size==profile["source"]["bytes"] and sha256(SOURCE_ZIP)==profile["source"]["sha256"]

def get_archive(profile):
    SOURCE_ZIP.parent.mkdir(parents=True,exist_ok=True)
    if verify_download(profile):
        print("FACTORY_SOURCE_CACHE_VERIFIED",flush=True);return
    part=SOURCE_ZIP.with_suffix(".zip.partial")
    part.unlink(missing_ok=True)
    url=profile["source"]["url"]
    req=urllib.request.Request(url,headers={"User-Agent":"BlankEngineAssetFactory/1.0"})
    h=hashlib.sha256();size=0
    try:
        with urllib.request.urlopen(req,timeout=100) as response,part.open("wb") as writer:
            if urllib.parse.urlparse(response.url).hostname!=PUBLISHER:
                raise RuntimeError("Unexpected cross-domain redirect")
            while True:
                block=response.read(2*1024*1024)
                if not block:break
                size+=len(block)
                if size>profile["source"]["bytes"]:raise ValueError("Downloaded archive exceeded pinned size")
                h.update(block);writer.write(block)
        if size!=profile["source"]["bytes"] or h.hexdigest()!=profile["source"]["sha256"]:
            raise ValueError("Authenticity check failed; original ZIP hash/size mismatch")
        os.replace(part,SOURCE_ZIP)
    except Exception:
        part.unlink(missing_ok=True)
        raise
    print("FACTORY_SOURCE_VERIFIED",size,h.hexdigest(),flush=True)

def atomic_json(path,data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_name(path.name+".tmp")
    temp.write_text(json.dumps(data,indent=2,sort_keys=True)+"\n")
    os.replace(temp,path)

def commands():
    python=sys.executable
    return {
        "restore":[python,"experiments/hero-v4/restore_textures.py"],
        "blender":[python,"-u","experiments/hero-v5/export_einar_runtime.py"],
        "glb_integrity":[python,"experiments/hero-v5/validate_glb.py"],
        "engine_tests":["npm","test"],
        "webgl_capture":["node","experiments/hero-v5/chrome_smoke.mjs"],
        "contact_sheet":[python,"experiments/hero-v5/montage.py"]}

def run_stage(stage,output,env,limit):
    cmd=commands()[stage]
    log=output/"logs"/(stage+".log");log.parent.mkdir(parents=True,exist_ok=True)
    print("FACTORY_STAGE_START",stage,flush=True)
    started=time.monotonic()
    with log.open("w") as file:
        try:
            proc=subprocess.run(cmd,cwd=ROOT,env=env,stdout=file,stderr=subprocess.STDOUT,
                timeout=limit,check=False)
        except subprocess.TimeoutExpired:
            raise RuntimeError(stage+" exceeded "+str(limit)+"s; see "+str(log))
    dt=round(time.monotonic()-started,2)
    if proc.returncode!=0:
        detail="\n".join(log.read_text(errors="replace").splitlines()[-14:])
        raise RuntimeError(stage+" returned "+str(proc.returncode)+" after "+str(dt)+"s:\n"+detail[:4000])
    return {"status":"PASS","duration_seconds":dt,"log":str(log.relative_to(ROOT)),
            "command_adapter":stage}

def run(profile,output,limits):
    aid=profile["asset"]["id"]
    report={"schema":VERSION,"asset_id":aid,"asset_kind":profile["asset"]["kind"],
        "adapter":profile["adapter"],"source_sha256":profile["source"]["sha256"],
        "license":profile["license"],"status":"RUNNING","stages":{},
        "visual_approval":"BLOCKED_REQUIRES_HUMAN_REVIEW","production_published":False,
        "blinking_verified":False,"full_film_material_parity":False,"android_performance_verified":False,
        "limits_seconds":limits,"created_at_utc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())}
    report_file=output/"factory-report.json"
    atomic_json(report_file,report)
    try:
        begun=time.monotonic()
        get_archive(profile)
        report["stages"]["download"]={"status":"PASS","bytes":SOURCE_ZIP.stat().st_size,
            "sha256":sha256(SOURCE_ZIP),"duration_seconds":round(time.monotonic()-begun,2)}
        atomic_json(report_file,report)
        env=os.environ.copy()
        env.update({"LIBGL_ALWAYS_SOFTWARE":"1","OMP_NUM_THREADS":"4"})
        for step in STAGES[1:]:
            report["stages"][step]=run_stage(step,output,env,limits.get(step,480))
            if step=="blender":
                if not RUNTIME.exists() or not RUNTIME.stat().st_size:raise ValueError("Blender produced no real GLB")
            if step=="webgl_capture":
                actual=json.loads((CAPTURE/"webgl-runtime-audit.json").read_text())
                if actual.get("status")!="FIVE_REAL_CHROME_WEBGL_VIEWS_COMPLETE" or not actual.get("webgl2"):
                    raise ValueError("Real WebGL proof not confirmed")
                report["webgl_evidence"]=actual
            atomic_json(report_file,report)
        original=json.loads((CAPTURE/"glb-integrity.json").read_text())
        report["output"]={"glb":str(RUNTIME.relative_to(ROOT)),
            "glb_sha256":sha256(RUNTIME),"bytes":RUNTIME.stat().st_size,
            "glb_source_geometry_verified":original["source_geometry_in_glb"],
            "embedded_skin_eye_maps":original["source_skin_eye_textures_embedded"],
            "contact_sheet":str((CAPTURE/"blank-webgl-contact-sheet.jpg").relative_to(ROOT))}
        report["status"]="TECHNICAL_PASS_VISUAL_APPROVAL_PENDING"
        atomic_json(report_file,report)
        print("FACTORY_TECHNICAL_PASS_HUMAN_APPROVAL_BLOCKED",aid,report["output"]["glb_sha256"],flush=True)
        return report
    except Exception as ex:
        report["status"]="BLOCKED"
        report["error"]=type(ex).__name__+": "+str(ex)[:4500]
        atomic_json(report_file,report)
        print("FACTORY_FAILED",report["error"],flush=True)
        raise

def main():
    ap=argparse.ArgumentParser(description="Manifest-driven headless Blender -> Blank Engine asset factory")
    ap.add_argument("--manifest",default="assets/specs/einar-static-hero.json")
    ap.add_argument("--mode",choices=("plan","run"),default="plan")
    ap.add_argument("--output-root",default="artifacts/asset-factory")
    args=ap.parse_args()
    manifest=(ROOT/args.manifest).resolve()
    if ROOT not in manifest.parents:raise ValueError("Manifest path must be inside repo")
    p=read_profile(manifest)
    out=(ROOT/args.output_root/p["asset"]["id"]).resolve()
    if ROOT not in out.parents:raise ValueError("Output root must remain in repo")
    limits={"restore":150,"blender":420,"glb_integrity":40,
        "engine_tests":150,"webgl_capture":160,"contact_sheet":40}
    if args.mode=="plan":
        print(json.dumps({"schema":VERSION,"asset":p["asset"],"adapter":p["adapter"],
            "stages":list(STAGES),"source_hash":p["source"]["sha256"],
            "will_deploy":False,"will_modify_source":False,"human_approval_required":True},indent=2))
        return
    run(p,out,limits)
if __name__=="__main__":main()
