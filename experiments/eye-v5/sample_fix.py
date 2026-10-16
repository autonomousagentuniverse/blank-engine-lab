#!/usr/bin/env python3
"""An isolated diagnostic candidate, NOT an approved eye repair."""
import argparse,hashlib,json,struct
from pathlib import Path
import numpy as np
KINDS={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}
DIM={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
BASE_V=8456;BASE_T=15500;NEW_V=112;NEW_T=224
def parse(b):
 if len(b)<100 or struct.unpack_from('<III',b,0)!=(0x46546c67,2,len(b)):raise ValueError('Expected GLB2')
 jn,jtype=struct.unpack_from('<II',b,12)
 if jtype!=0x4e4f534a:raise ValueError('No JSON chunk')
 d=json.loads(b[20:20+jn]);bn,bt=struct.unpack_from('<II',b,20+jn)
 if bt!=0x004e4942 or 28+jn+bn>len(b):raise ValueError('No BIN chunk')
 return d,d['meshes'][0]['primitives'][0],28+jn
def attr(b,d,off,i):
 a=d['accessors'][i];v=d['bufferViews'][a['bufferView']]
 t=np.dtype(KINDS[a['componentType']]);n=DIM[a['type']]
 s=v.get('byteStride',t.itemsize*n)
 return np.ndarray((a['count'],n),dtype=t,buffer=b,offset=off+v.get('byteOffset',0)+a.get('byteOffset',0),strides=(s,t.itemsize))
def audit(f,p,uv,n):
 f=f[BASE_T:];q=p[f];cross=np.cross(q[:,1]-q[:,0],q[:,2]-q[:,0]);area=np.linalg.norm(cross,axis=1)
 vn=n[f].mean(axis=1);vn/=np.maximum(np.linalg.norm(vn,axis=1,keepdims=True),1e-30)
 dot=np.einsum('ij,ij->i',cross/np.maximum(area[:,None],1e-30),vn)
 u=uv[f];a=u[:,1]-u[:,0];z=u[:,2]-u[:,0];ua=np.abs(a[:,0]*z[:,1]-a[:,1]*z[:,0])/2
 return {'triangles':len(f),'zero_3d':int(np.count_nonzero(area<=1e-12)),'zero_uv':int(np.count_nonzero(ua<=1e-12)),'backwards':int(np.count_nonzero(dot<=0)),'median_normal_angle_deg':round(float(np.median(np.degrees(np.arccos(np.clip(dot,-1,1))))),3)}
def make(src):
 b=bytearray(src);d,prim,off=parse(b)
 if d['meshes'][0]['name']!='base' or len(d['skins'][0]['joints'])!=53 or len(d['animations'])!=4:raise ValueError('Unexpected source rig')
 ind=attr(b,d,off,prim['indices']).reshape(-1);p=attr(b,d,off,prim['attributes']['POSITION'])
 uv=attr(b,d,off,prim['attributes']['TEXCOORD_0']);n=attr(b,d,off,prim['attributes']['NORMAL'])
 if len(p)!=BASE_V+NEW_V or len(ind)!=(BASE_T+NEW_T)*3:raise ValueError('Not v4 geometry')
 faces=ind.reshape(-1,3);before=audit(faces,p,uv,n)
 if before['zero_uv']!=224 or before['backwards']!=224:raise ValueError('Unexpected input defects')
 keep_p=p[:BASE_V].copy();keep_uv=uv[:BASE_V].copy();keep_i=ind[:BASE_T*3].copy()
 faces[BASE_T:,[1,2]]=faces[BASE_T:,[2,1]]
 for side in range(2):
  first=BASE_T*3+side*112*3
  outer=np.asarray([ind[first+6*j] for j in range(28)],dtype=int)
  if len(set(outer.tolist()))!=28 or np.any(outer>=BASE_V):raise ValueError('Boundary mismatch')
  src_uv=uv[outer].astype(float);center=src_uv.mean(axis=0)
  for ring,factor in enumerate((.89,.78)):
   candidate=center+(src_uv-center)*factor
   if np.any(candidate<=0) or np.any(candidate>=1):raise ValueError('UV unsafe')
   start=BASE_V+side*56+ring*28
   uv[start:start+28]=candidate
 acc=np.zeros((len(n),3),dtype=float);f=faces[BASE_T:];area=np.cross(p[f[:,1]]-p[f[:,0]],p[f[:,2]]-p[f[:,0]])
 for k in range(3):np.add.at(acc,f[:,k],area)
 acc/=np.maximum(np.linalg.norm(acc,axis=1,keepdims=True),1e-30);old_n=n.copy()
 for i in range(BASE_V,len(n)):
  v=.3*old_n[i]+.7*acc[i];n[i]=v/np.linalg.norm(v)
 after=audit(faces,p,uv,n)
 if after['zero_3d'] or after['zero_uv'] or after['backwards']:raise ValueError('Sample structural failure '+repr(after))
 if not np.array_equal(p[:BASE_V],keep_p) or not np.array_equal(uv[:BASE_V],keep_uv) or not np.array_equal(ind[:BASE_T*3],keep_i):raise ValueError('Original face modified')
 return bytes(b),before,after
def main():
 ap=argparse.ArgumentParser();ap.add_argument('source');ap.add_argument('output');ap.add_argument('report');a=ap.parse_args()
 src=Path(a.source).read_bytes();out,before,after=make(src)
 output=Path(a.output);output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(out)
 report={'schema':'blank.geometry.eye-v5-sample.v1','approval':'blocked','source_sha256':hashlib.sha256(src).hexdigest(),'output_sha256':hashlib.sha256(out).hexdigest(),'before':before,'after':after,'preserved':'Original 8456 face vertices/15500 triangles, joints, animation and GLB original source','limitations':['inner socket still disconnected','source atlas pink texels unchanged','procedural eyes unchanged','no blinking or gaze']}
 p=Path(a.report);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,indent=2)+'\n')
 print('EYE_V5_EXPERIMENT_PASS '+json.dumps(report))
if __name__=='__main__':main()
