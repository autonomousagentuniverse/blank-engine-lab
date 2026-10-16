#!/usr/bin/env python3
"""EXPERIMENT ONLY: front-camera orientation correction of generated v5/v6 faces."""
import sys,hashlib,json,argparse
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'eye-v5'))
from sample_fix import parse,attr
PINNED='b131b6d05834e7039dfce75c63da0dbd6a1924ed2d09f8e35c7ce2ee4ae13922'
def build(source):
 sha=hashlib.sha256(source).hexdigest()
 if sha!=PINNED:raise ValueError('Incorrect source v6 hash')
 b=bytearray(source);doc,prim,off=parse(b)
 faces=attr(b,doc,off,prim['indices']).reshape(-1,3)
 pos=attr(b,doc,off,prim['attributes']['POSITION'])
 normals=attr(b,doc,off,prim['attributes']['NORMAL'])
 if len(faces)!=15948 or len(pos)!=8680 or len(doc['skins'][0]['joints'])!=53 or len(doc['animations'])!=4:raise ValueError('Unexpected hero geometry')
 orig=faces[:15500].copy();orig_normals=normals[:8456].copy()
 changed=0
 for j in range(15500,len(faces)):
  a,c,e=pos[faces[j]]
  if np.cross(c-a,e-a)[2]<0:
   faces[j,1],faces[j,2]=faces[j,2],faces[j,1];changed+=1
 if changed!=448:raise ValueError('Expected 448 previously back-facing experimental triangles')
 f=faces[15500:];q=pos[f];cross=np.cross(q[:,1]-q[:,0],q[:,2]-q[:,0]);size=np.linalg.norm(cross,axis=1)
 if np.any(cross[:,2]<=0) or np.any(size<1e-11):raise ValueError('3D faces invalid or culled from front')
 acc=np.zeros((len(normals),3),dtype=float)
 for k in range(3):np.add.at(acc,f[:,k],cross)
 acc/=np.maximum(np.linalg.norm(acc,axis=1,keepdims=True),1e-30)
 for k in range(8456,len(normals)):
  blended=.08*normals[k]+.92*acc[k]
  normals[k]=blended/max(np.linalg.norm(blended),1e-30)
 if not np.array_equal(faces[:15500],orig) or not np.array_equal(normals[:8456],orig_normals):raise ValueError('Original face modified')
 out=bytes(b)
 return out,{'schema':'blank.geometry.eye-v7-facing-experiment','input_sha256':sha,'output_sha256':hashlib.sha256(out).hexdigest(),'changed_experiment_faces':changed,'front_facing_experiment_faces':448,'original_face_index_and_normals_preserved':True,'human_visual_approval':'BLOCKED','limitations':['No eyelid shape acceptance','Eye materials and gaze unchanged','Human camera-render review required']}
def main():
 p=argparse.ArgumentParser();p.add_argument('input');p.add_argument('output');p.add_argument('report');a=p.parse_args()
 out,info=build(Path(a.input).read_bytes())
 path=Path(a.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(out)
 path=Path(a.report);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(info,indent=2)+'\n')
 print('EYE_V7_FRONT_FACING_PASS',json.dumps(info))
if __name__=='__main__':main()
