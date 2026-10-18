#!/usr/bin/env python3
"""Analyze authentic real human photo crops versus prior MIRA-A Cycles evidence.
No facial identity estimation, reconstructed anatomy, learned identities or copied texture.
Photometric/camera effects confound all scalar pixel measurements. No photoreal pass.
"""
import hashlib,json,os,math,statistics,sys
from pathlib import Path
import numpy as np
import cv2
from PIL import Image,ImageOps,ImageDraw,ImageFont
ROOT=Path("experiments/real-human-reference")
OUT=Path("artifacts/real-human-reference")
OUT.mkdir(parents=True,exist_ok=True)
PHOTOS=Path("photo-input")
RENDERS=Path("mira-a-render")
def shasum(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def crop(im,rect):
 w,h=im.size
 xy=(max(0,round(w*rect[0])),max(0,round(h*rect[1])),
     min(w,round(w*rect[2])),min(h,round(h*rect[3])))
 assert xy[2]-xy[0]>100 and xy[3]-xy[1]>90,("crop too narrow",xy,w,h)
 return im.crop(xy)
def tensor_stats(im):
 """Intensity-gradient orientation anisotropy and inter-cell spatial correlation.
 Angles are axial 180°-periodic. Filter/camera and scale dependence explicitly reported.
 """
 tile=np.array(ImageOps.fit(im,(512,512),method=Image.Resampling.LANCZOS).convert("RGB"),np.float32)/255.
 lab=cv2.cvtColor(tile,cv2.COLOR_RGB2LAB)
 l=lab[:,:,0]/100
 saturated=(tile.max(axis=2)>=.98)
 shadows=(tile.min(axis=2)<=.02)
 blur={s:cv2.GaussianBlur(l,(0,0),s) for s in (1,3,9,27)}
 bands={}
 for label,a,b in [('fine','1','3'),('medium','3','9'),('coarse','9','27')]:
  delta=blur[int(a)]-blur[int(b)]
  bands[label]=float(np.sqrt(np.mean(delta**2)))
 tot=sum(bands.values())+1.e-9
 bands_rel={k:round(v/tot,6) for k,v in bands.items()}
 x=cv2.Sobel(blur[1],cv2.CV_32F,1,0,ksize=3)
 y=cv2.Sobel(blur[1],cv2.CV_32F,0,1,ksize=3)
 local_angles=[];local_coh=[];weights=[]
 block=32
 for j in range(0,512,block):
  for i in range(0,512,block):
   gx=x[j:j+block,i:i+block];gy=y[j:j+block,i:i+block]
   jxx=float(np.mean(gx*gx));jyy=float(np.mean(gy*gy));jxy=float(np.mean(gx*gy))
   s=jxx+jyy
   coherence=math.sqrt((jxx-jyy)**2+4*jxy*jxy)/(s+1e-8)
   orientation=.5*math.atan2(2*jxy,jxx-jyy)
   local_angles.append(orientation)
   local_coh.append(coherence)
   weights.append(s)
 angles=np.array(local_angles);coh=np.array(local_coh);weights=np.array(weights)
 thresh=np.quantile(weights,.25)
 valid=weights>max(1e-7,thresh)
 selected=angles[valid]
 counts,_=np.histogram((selected+math.pi/2)/math.pi%1,bins=12,range=(0,1))
 p=counts[counts>0]/max(1,np.sum(counts))
 entropy=float(-np.sum(p*np.log(p))/math.log(12)) if len(p) else None
 # Count neighboring orientation agreement weighted by coherence, NOT image-level human score
 theta=angles.reshape(16,16)
 good=valid.reshape(16,16)
 local=coh.reshape(16,16)
 diffs=[]
 for a,b,ca,cb,va,vb in [
  (theta[:,:-1],theta[:,1:],local[:,:-1],local[:,1:],good[:,:-1],good[:,1:]),
  (theta[:-1,:],theta[1:,:],local[:-1,:],local[1:,:],good[:-1,:],good[1:,:])]:
  mask=va & vb & (ca>.1) & (cb>.1)
  diffs.extend(np.cos(2*(a-b))[mask].tolist())
 return {
  "normalized_patch_px":[512,512],
  "pixel_clip_ge_0p98_fraction":round(float(np.mean(saturated)),5),
  "pixel_black_le_0p02_fraction":round(float(np.mean(shadows)),5),
  "lab_luminance_median":round(float(np.median(l)),5),
  "intensity_mad":round(float(np.median(np.abs(l-np.median(l)))),5),
  "bandpass_rms_relative":bands_rel,
  "gradient_orientation_entropy_12bins":None if entropy is None else round(entropy,5),
  "local_orientation_coherence_median":round(float(np.median(coh[valid])),5) if valid.any() else None,
  "neighbor_axial_direction_agreement":round(float(statistics.mean(diffs)),5) if diffs else None,
  "valid_gradient_blocks":int(np.sum(valid)),
  "limitations":["2D image statistics not 3D follicle direction or physics",
    "JPEG compression/ISO/camera focus/exposure can dominate fine texture",
    "Single crop and mixed subject/camera are NOT valid numeric acceptance threshold"]}
def panel(im,label,sub,color=(230,230,230)):
 w,h=560,410
 bg=Image.new('RGB',(w,h),(32,35,41))
 tile=ImageOps.contain(im,(536,360),method=Image.Resampling.LANCZOS)
 bg.paste(tile,((w-tile.width)//2,36+(360-tile.height)//2))
 d=ImageDraw.Draw(bg)
 d.text((12,8),label,fill=color)
 d.text((12,390),sub[:83],fill=(180,188,195))
 return bg
def main():
 manifest=json.loads((ROOT/"verified_photos.json").read_text())
 assert len(manifest["sources"])>=5
 records=[]
 panes=[]
 for src in manifest["sources"]:
  p=PHOTOS/src["file"]
  assert p.exists(),p
  with Image.open(p) as raw:
   assert raw.format=="JPEG" and raw.width>=1500 and raw.height>=1400
   im=ImageOps.exif_transpose(raw).convert("RGB")
  sha=shasum(p)
  im=crop(im,src["rect"])
  stats=tensor_stats(im)
  stats.update({"sample_id":src["id"],"source_sha256":sha,"source_license":src["license"],
      "source_url":src["source"],"author":src["author"],"kind":src["kind"],
      "crop_normalized_xyxy":src["rect"],"photo_conditions":src["photometry"],
      "source_bias":src["limits"],"is_genuine_photograph":True})
  records.append(stats)
  panes.append(panel(im,src["id"]+" | real photograph",src["license"]+" | "+src["author"]))
  print("REAL_PHOTO_MEASURED",src["id"],sha[:16],json.dumps({
       k:stats[k] for k in ("pixel_clip_ge_0p98_fraction","gradient_orientation_entropy_12bins",
       "neighbor_axial_direction_agreement","bandpass_rms_relative")}),flush=True)
 cg_files=[("cg_eye","eyes_macro.png",[.1,.34,.46,.62],"eye"),("cg_hair","front.png",[.70,.39,.94,.87],"hair"),
           ("cg_skin","front.png",[.29,.47,.49,.67],"skin")]
 cg_records=[]
 for sid,file,roi,typ in cg_files:
  p=RENDERS/file
  with Image.open(p) as img:raw=img.convert("RGB")
  sample=crop(raw,roi)
  values=tensor_stats(sample)
  values.update({"sample_id":sid,"kind":typ,"is_genuine_photograph":False,
                 "render_sha256":shasum(p),"roi":roi,
                 "render":"Original unchanged MIRA A, Blender Cycles 24 spp, 700px",
                 "limitations":values.pop("limitations")+[
                   "Photographic ROIs have different angular field and pixels per mm; not equal subject/camera"]})
  cg_records.append(values)
  panes.append(panel(sample,sid+" | CGI control", "MIRA-05 A | 24 Cycles samples",color=(255,205,140)))
 metric={x["sample_id"]:x for x in records}
 assert metric["eye_macro"]["source_license"]=="CC-BY-4.0"
 assert metric["skin_macro"]["source_license"]=="CC0-1.0"
 assert all(x["valid_gradient_blocks"]>10 for x in records+cg_records)
 # Reject overexposed image as photo-pigment/roughness calibration, regardless of actual threshold.
 exclusions={"face_high_exposure":"Predeclared high-key exposure negative control; unsuitable for material/pore calibration",
 "face_dark_exposure":"Predeclared low-key and processed portrait negative control; material photometry confounded"}
 result={"schema":"blank.real-human.photo-measurement.v1",
         "data_provenance":"Wikimedia Commons real photographs with explicit source-page rights, original bytes SHA",
         "reference_photographs":records,"generated_control":cg_records,
         "source_exclusions_from_material_calibration":exclusions,
         "geometric_anatomy_measurement":"NOT_MEASURED: no calibrated camera/paired same-subject views or 3D scans",
         "eyelid_to_cornea_mm":"NOT_MEASURED: 2D photography lacks depth calibration",
         "follicle_growth_angle_3D":"NOT_MEASURED: requires strand root geometry with known camera",
         "photometric_BRDF":"NOT_MEASURED: uncalibrated lighting and image pipeline",
         "human_visual_approval":False,"generator_photoreal_pass":False,
         "reference_pool_sufficiency":"PILOT_ONLY_SIX_IMAGES_NOT_POPULATION_DISTRIBUTION",
         "release_allowed":False,
         "conclusion":"Observational multi-scale statistics; does not demonstrate physical causes or acceptance thresholds",
         "next_build_requirements":["real whole-human procedural source with independent generated identity, separate optics and scalp-groom",
             "geometry-attached structures neutral/head turn/blink", 
             "matched-light real photo or scan plus lens/exposure metadata before quant realism claims",
             "complete Blender Cycles render reviewed against references without identity imitation"]}
 (OUT/"photo-versus-mira-metrics.json").write_text(json.dumps(result,indent=2)+"\n")
 cols=3;rows=math.ceil(len(panes)/cols)
 sheet=Image.new("RGB",(cols*560,rows*410),(25,27,31))
 for i,p in enumerate(panes):sheet.paste(p,((i%cols)*560,(i//cols)*410))
 sheet.save(OUT/"real-human-vs-cgi-review.jpg",quality=90)
 # Make attribution unmissable in artifact
 license_lines=["PHOTO CREDITS / IMAGE LICENSES — cropped/downscaled for research comparison"]
 for src in manifest["sources"]:
  license_lines += [f'{src["id"]}: {src["author"]} — {src["license"]}',
                     src["source"]]
 license_lines += ["Human subjects' identity is not reconstructed. Images do not establish commercial likeness/consent rights.",
                   "No measured follicle, facial landmark or eye/cornea depth ground truth is claimed."]
 (OUT/"ATTRIBUTION.txt").write_text("\n".join(license_lines)+"\n")
 print("REAL_HUMAN_PHOTO_COMPARISON_COMPLETE",len(records),len(cg_records),flush=True)
if __name__=="__main__":main()
