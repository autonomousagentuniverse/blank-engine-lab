"""MIRA-03 pure numeric contract: same function used by Blender and preflight."""
import math
def tissue_delta(dx,z,depth,smooth=True):
 orbit=1-math.exp(-.5*(min(math.hypot(dx-.033,z),math.hypot(dx+.033,z))/.026)**2)
 anterior=max(0.,min(1.,(depth+.025)/.048))
 face=orbit*anterior
 cheek=math.exp(-.5*((abs(dx)-.05)/.028)**2-.5*((z+.037)/.029)**2)
 jaw=math.exp(-.5*((abs(dx)-.045)/.03)**2-.5*((z+.089)/.033)**2)
 chin=math.exp(-.5*(dx/.035)**2-.5*((z+.125)/.035)**2)
 nose=math.exp(-.5*(dx/.014)**2-.5*((z+.053)/.026)**2)
 lateral=face*(.0052*cheek-.0067*jaw)*(math.tanh(dx/.024) if smooth else (1 if dx>=0 else -1))
 return lateral,face*(.002*cheek+.004*chin-.0015*nose),face*(-.0034*chin+.0012*cheek)
def check_midline():
 old=[];new=[]
 for z in [-.025,-.055,-.089,-.12,-.145]:
  for d in [-.02,0.,.02,.035]:
   old.append(abs(tissue_delta(1e-6,z,d,False)[0]-tissue_delta(-1e-6,z,d,False)[0])*1000)
   new.append(abs(tissue_delta(1e-6,z,d,True)[0]-tissue_delta(-1e-6,z,d,True)[0])*1000)
   assert abs(tissue_delta(0,z,d,True)[0])<1e-12
   assert abs(tissue_delta(-.004,z,d,True)[0]+tissue_delta(.004,z,d,True)[0])<1e-10
 assert max(old)>2 and max(new)<.01 and max(old)/max(new)>500
 return {"sample_count":len(old),"old_max_mm":max(old),"smooth_max_mm":max(new),
  "reduction_factor":max(old)/max(new),"centerline_zero":True}
if __name__=="__main__":
 import json
 print("MIRA03_MATH_PREFLIGHT",json.dumps(check_midline()))
