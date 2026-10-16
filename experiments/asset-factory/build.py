#!/usr/bin/env python3
"""Blank Engine automated asset factory v1.
ONE spec -> immutable source verification -> headless Blender asset build ->
GLB/PBR source audits -> real Chrome WebGL frames -> build manifest.
No human Blender clicks. No publication, deployment, or fake visual approval.

Only the verified Einar head/eyes template is currently supported. Other
templates intentionally fail closed rather than fabricating an asset.
"""
import argparse,datetime,hashlib,json,os,re,subprocess,sys,time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
SOURCE_URL="https://studio.blender.org/download-source/files/41/419e83fb75f30b989adf7920dec7a21c/419e83fb75f30b989adf7920dec7a21c.zip"
SOURCE_SHA="3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7"
CREDIT="Einar Rig (CC-BY) Blender Foundation | studio.blender.org"
SPEC_FIELDS={"schema","asset_id","template","source","output","quality"}
CATEGORIES=("head","eyes","cornea","tearline","eyelashes")
class InvalidSpec(ValueError):pass

def load_spec(path):
    d=json.loads(Path(path).read_text())
    if not isinstance(d,dict) or set(d)!=SPEC_FIELDS:raise InvalidSpec("Unknown/missing top-level keys")
    if d["schema"]!="blank.asset-factory.v1":raise InvalidSpec("Unsupported asset job schema")
    if not isinstance(d["asset_id"],str) or not re.fullmatch(r"[a-z][a-z0-9-]{2,55}",d["asset_id"]):
        raise InvalidSpec("Unsafe asset_id")
    if d["template"]!="einar-head-pbr-static":raise InvalidSpec("Only licensed Einar head template implemented")
    s=d["source"]
    if not isinstance(s,dict) or set(s)!={"url","sha256","license","credit"}:
        raise InvalidSpec("Invalid source manifest")
    if s!={"url":SOURCE_URL,"sha256":SOURCE_SHA,"license":"CC-BY","credit":CREDIT}:
        raise InvalidSpec("Source provenance/license must match the pinned official source")
    o=d["output"]
    if not isinstance(o,dict) or set(o)!={"format","texture_max_edge","components","publication"}:
        raise InvalidSpec("Unexpected output fields")
    if o["format"]!="glb" or o["texture_max_edge"]!=2048 or o["publication"]!="human-approval-required":
        raise InvalidSpec("GLB 2048px and explicit human approval are mandatory")
    if o["components"]!=list(CATEGORIES):
        raise InvalidSpec("Component contract mismatch")
    q=d["quality"]
    if not isinstance(q,dict) or set(q)!={"webgl_views","min_meshes","require_skin_roughness","require_skin_eye_albedo","visual_approval"}:
        raise InvalidSpec("Quality keys mismatch")
    if q["webgl_views"]!=["front","three_quarter","profile","eyes_macro","eyes_three_quarter"]:
        raise InvalidSpec("Camera coverage must include 5 independent angles")
    if q["min_meshes"]!=7 or q["require_skin_roughness"] is not True or q["require_skin_eye_albedo"] is not True or q["visual_approval"]!="human":
        raise InvalidSpec("Required material/visual gates disabled")
    return d

def build_id(d):
    return hashlib.sha256(json.dumps(d,sort_keys=True,separators=(",",":")).encode()).hexdigest()[:16]

def stages():
    py=sys.executable
    return [
      ("download_official_source",["curl","--fail","--location","--retry","3","--connect-timeout","30","--max-time","540",
         "--silent","--show-error",SOURCE_URL,"-o",".ci-einar/einar-official.zip"],600),
      ("validate_restore_63_textures",[py,"experiments/hero-v4/restore_textures.py"],180),
      ("build_geometry_pbr_roughness",["timeout","-k","10s","410s","xvfb-run","-a",py,"-u",
         "experiments/asset-factory/einar_pbr_export.py"],450),
      ("verify_glb_material_maps",[py,"experiments/asset-factory/verify_factory_glb.py"],90),
      ("unchanged_engine_regression",["npm","test"],240),
      ("blank_engine_webgl_five_view_proof",["node","experiments/hero-v5/chrome_smoke.mjs"],240),
      ("evidence_contact_sheet",[py,"experiments/hero-v5/montage.py"],90)
    ]

def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")

def atomic_json(path,obj):
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj,indent=2,sort_keys=True)+"\n")
    tmp.replace(path)

def run(spec,execute):
    uid=build_id(spec)
    output=ROOT/"artifacts"/"asset-factory"/spec["asset_id"]
    manifest=output/"build-manifest.json"
    plan=[{"name":name,"timeout_seconds":time_limit,"command":cmd[:1]+["<arguments>"]}
          for name,cmd,time_limit in stages()]
    if not execute:
        print(json.dumps({"mode":"PLAN_ONLY","asset_id":spec["asset_id"],"build_id":uid,
         "stages":plan,"no_deploy":True,"human_approval_required":True},indent=2))
        return 0
    result={"schema":"blank.asset-factory.result.v1","asset_id":spec["asset_id"],
      "build_id":uid,"state":"BUILDING","started_utc":now(),
      "source_sha256":SOURCE_SHA,"license":"CC-BY","attribution":CREDIT,
      "outputs":{"glb":"artifacts/hero-v5-einar/einar-static-pbr.glb",
                 "browser_audit":"artifacts/hero-v5-einar/webgl-runtime-audit.json",
                 "contact_sheet":"artifacts/hero-v5-einar/blank-webgl-contact-sheet.jpg"},
      "stage_results":[],"source_modified":False,"publication":"NOT_AUTHORIZED",
      "human_photorealism_approved":False,"blink_verified":False,"hair_verified":False,
      "android_perf_verified":False,
      "limits":["Static original source head and eyes only","Source roughness map required",
                "No normal/displacement/SSS film shader parity","No converted hair, blink or Android device result"]}
    atomic_json(manifest,result)
    (ROOT/".ci-einar").mkdir(exist_ok=True)
    (ROOT/"artifacts"/"hero-v5-einar").mkdir(parents=True,exist_ok=True)
    logs=output/"logs";logs.mkdir(parents=True,exist_ok=True)
    env={**os.environ,"PYTHONUNBUFFERED":"1","LIBGL_ALWAYS_SOFTWARE":"1","OMP_NUM_THREADS":"4"}
    for name,cmd,time_limit in stages():
        start=time.monotonic()
        print("ASSET_FACTORY_STAGE_START",name,flush=True)
        path=logs/(name+".log")
        try:
            with path.open("wb") as out:
                proc=subprocess.run(cmd,cwd=ROOT,env=env,stdout=out,stderr=subprocess.STDOUT,
                    timeout=time_limit,check=False)
            passed=proc.returncode==0
            reason=f"exit_{proc.returncode}" if not passed else None
        except subprocess.TimeoutExpired:
            passed=False;reason="timeout"
        except OSError as e:
            passed=False;reason="spawn_"+type(e).__name__
        rec={"stage":name,"passed":passed,"elapsed_seconds":round(time.monotonic()-start,2),
             "failure":reason,"log":str(path.relative_to(ROOT))}
        result["stage_results"].append(rec)
        result["state"]="BUILDING" if passed else "FAILED"
        result["failed_stage"]=None if passed else name
        result["updated_utc"]=now()
        atomic_json(manifest,result)
        print("ASSET_FACTORY_STAGE_RESULT",name,"PASS" if passed else "FAIL",reason or "",flush=True)
        if not passed:
            # Display only the last 900 safe chars; no env or credential dumps.
            tail=path.read_text(errors="replace")[-900:] if path.exists() else ""
            print("ASSET_FACTORY_ERROR_TAIL",tail,flush=True)
            return 1
    asset=ROOT/"artifacts"/"hero-v5-einar"
    for key,value in result["outputs"].items():
        if not (ROOT/value).is_file() or (ROOT/value).stat().st_size<100:
            result["state"]="FAILED";result["failed_stage"]="output_contract_"+key
            atomic_json(manifest,result);return 1
    glb=json.loads((asset/"glb-integrity.json").read_text())
    runtime=json.loads((asset/"webgl-runtime-audit.json").read_text())
    result["verification"]={"glb_sha256":glb["sha256"],"glb_mesh_count":glb["mesh_count"],
        "glb_image_count":glb["image_count"],"roughness_map_verified":glb["real_skin_roughness_verified"],
        "webgl_views":runtime["views"],"webgl2":runtime["webgl2"],"runtime_triangles":runtime["triangles"]}
    result["state"]="READY_FOR_HUMAN_VISUAL_REVIEW"
    result["completed_utc"]=now()
    atomic_json(manifest,result)
    print("ASSET_FACTORY_AUTOMATION_PASS_VISUAL_APPROVAL_PENDING",str(manifest.relative_to(ROOT)),flush=True)
    return 0

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--spec",required=True)
    g=p.add_mutually_exclusive_group(required=True);g.add_argument("--plan",action="store_true");g.add_argument("--execute",action="store_true")
    args=p.parse_args()
    try:spec=load_spec(ROOT/args.spec)
    except (ValueError,OSError) as e:
        print("ASSET_FACTORY_INVALID_SPEC",str(e),file=sys.stderr);return 2
    return run(spec,args.execute)
if __name__=="__main__":sys.exit(main())
