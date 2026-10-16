#!/usr/bin/env python3
"""v6 source-pinned eyelid 3D transition experimental candidate; NOT production."""
import sys,json,struct,hashlib,argparse
from pathlib import Path
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'eye-v5'))
from sample_fix import parse,attr
SOURCE='33c6c18869752b3378e8e372eaefcb156f2157504cda8ed65778bba956601ab3'
ORIG_T=15500;V5_T=15724;V5_V=8568
def eye_loops(pos,ind):
 edges={}
 for tri in ind[:ORIG_T]:
  for j in range(3):
   a,b=sorted((int(tri[j]),int(tri[(j+1)%3])));edges[a,b]=edges.get((a,b),0)+1
 adj={}
 for (a,b),v in edges.items():
  if v==1:adj.setdefault(a,set()).add(b);adj.setdefault(b,set()).add(a)
 visited=set();loops=[]
 for start in adj:
  if start in visited:continue
  stack=[start];members={start};visited.add(start)
  while stack:
   for p in adj[stack.pop()]:
    if p not in visited:visited.add(p);members.add(p);stack.append(p)
  if len(members)!=28 or any(len(adj[k])!=2 for k in members):continue
  order=[start];prev=-1;cur=start
  while len(order)<28:
   options=[p for p in sorted(adj[cur]) if p!=prev and p not in order]
   if not options:break
   nxt=options[0];order.append(nxt);prev,cur=cur,nxt
  if len(order)==28:loops.append(np.asarray(order,int))
 return loops
def encode_accessor(doc,blob,arr):
 original=arr.dtype;arr=np.ascontiguousarray(arr)
 if original.kind=='f':arr=arr.astype('<f4');ctype=5126
 elif original.itemsize==2:arr=arr.astype('<u2');ctype=5123
 elif original.itemsize==4:arr=arr.astype('<u4');ctype=5125
 else:arr=arr.astype('u1');ctype=5121
 blob+=b'\x00'*((-len(blob))%4);start=len(blob);data=arr.tobytes();blob+=data
 view=len(doc['bufferViews']);doc['bufferViews'].append(dict(buffer=0,byteOffset=start,byteLength=len(data),target=34963 if arr.shape[1]==1 and original.kind in 'ui' else 34962))
 accessor=dict(bufferView=view,componentType=ctype,count=len(arr),type={1:'SCALAR',2:'VEC2',3:'VEC3',4:'VEC4'}[arr.shape[1]])
 if arr.shape[1]==3 and original.kind=='f':accessor.update(min=arr.min(0).tolist(),max=arr.max(0).tolist())
 index=len(doc['accessors']);doc['accessors'].append(accessor);return blob,index
def build(source):
 sha=hashlib.sha256(source).hexdigest()
 if sha!=SOURCE:raise ValueError('v5 source SHA mismatch')
 raw=bytearray(source);doc,prim,off=parse(raw)
 if doc['meshes'][0]['name']!='base' or len(doc['skins'][0]['joints'])!=53 or len(doc['animations'])!=4:raise ValueError('Unexpected hero')
 fields=['POSITION','NORMAL','TEXCOORD_0','JOINTS_0','WEIGHTS_0']
 original={k:attr(raw,doc,off,prim['attributes'][k]).copy() for k in fields}
 pos=original['POSITION'];uv=original['TEXCOORD_0'];normal=original['NORMAL']
 ind=attr(raw,doc,off,prim['indices']).reshape(-1,3).copy()
 if len(pos)!=V5_V or len(ind)!=V5_T:raise ValueError('Unexpected v5 topology')
 sets=eye_loops(pos,ind);extra={k:[] for k in fields};faces=[];measure=[]
 for side,sign in ((0,-1),(1,1)):
  group=[loop for loop in sets if np.sign(pos[loop,0].mean())==sign and 1.77<pos[loop,1].mean()<1.87]
  outer=[loop for loop in group if uv[loop,0].mean()<.2]
  inner=[loop for loop in group if .75<uv[loop,0].mean()<.9]
  if len(outer)!=1 or len(inner)!=1:raise ValueError('28-point face/socket contours not found')
  outer,inner=outer[0],inner[0]
  ring=np.arange(8456+side*56+28,8456+side*56+56)
  known=np.asarray([ind[ORIG_T+side*112+2*j,0] for j in range(28)],int)
  if not np.array_equal(np.sort(known),np.sort(outer)):raise ValueError('Wrong outer loop identity')
  candidates=[]
  for direction in (1,-1):
   for shift in range(28):
    ids=inner[(shift+direction*np.arange(28))%28];delta=pos[ids]-pos[known]
    candidates.append((float(np.sum(delta[:,:2]**2)+.2*np.sum(delta[:,2]**2)),ids))
  _,matched=min(candidates,key=lambda item:item[0])
  gap=np.linalg.norm(pos[matched]-pos[known],axis=1)
  if gap.max()>.008:raise ValueError('Socket boundary pairing too far')
  mid=pos[ring]*.56+pos[matched]*.44;mid[:,2]+=.00023
  mid_start=V5_V+len(extra['POSITION']);end_start=mid_start+28
  center=uv[known].mean(0);last=uv[ring].astype(float)
  for xyz,tex,original_ids in ((mid,center+(last-center)*.82,ring),(pos[matched],center+(last-center)*.64,matched)):
   if np.any((tex<.001)|(tex>.999)):raise ValueError('Out-of-atlas skin UV')
   for key,values in (('POSITION',xyz),('TEXCOORD_0',tex),('JOINTS_0',original['JOINTS_0'][original_ids]),('WEIGHTS_0',original['WEIGHTS_0'][original_ids]),('NORMAL',normal[ring])):
    extra[key].extend(values.tolist())
  for A,B in ((ring,np.arange(mid_start,mid_start+28)),(np.arange(mid_start,mid_start+28),np.arange(end_start,end_start+28))):
   for j in range(28):
    a,b,c,d=int(A[j]),int(A[(j+1)%28]),int(B[j]),int(B[(j+1)%28])
    for tri in ([a,b,c],[b,d,c]):
     points=[pos[k] if k<V5_V else np.asarray(extra['POSITION'][k-V5_V]) for k in tri]
     cross=np.cross(points[1]-points[0],points[2]-points[0])
     if np.linalg.norm(cross)<1e-11:raise ValueError('Degenerate 3D bridge')
     if np.dot(cross,normal[ring[j]]+normal[ring[(j+1)%28]])<0:tri[1],tri[2]=tri[2],tri[1]
     faces.append(tri)
  measure.append({'eye':'left' if side==0 else 'right','source_vertices_per_contour':28,'mean_gap_mm':round(float(gap.mean()*1000),3),'maximum_gap_mm':round(float(gap.max()*1000),3)})
 if len(faces)!=224 or len(extra['POSITION'])!=112:raise ValueError('Wrong candidate sizes')
 out={k:np.concatenate((original[k],np.asarray(extra[k],dtype=original[k].dtype))) for k in fields}
 inds=np.concatenate((ind,np.asarray(faces,dtype=np.uint16)))
 new=inds[V5_T:];xyz=out['POSITION'][new]
 cross=np.cross(xyz[:,1]-xyz[:,0],xyz[:,2]-xyz[:,0]);size=np.linalg.norm(cross,axis=1)
 tex=out['TEXCOORD_0'][new];a=tex[:,1]-tex[:,0];b=tex[:,2]-tex[:,0];uarea=np.abs(a[:,0]*b[:,1]-a[:,1]*b[:,0])/2
 if np.any(size<1e-11) or np.any(uarea<1e-12):raise ValueError('Bad geometry or collapsed UV')
 acc=np.zeros((len(out['NORMAL']),3))
 for axis in range(3):np.add.at(acc,new[:,axis],cross)
 acc/=np.maximum(np.linalg.norm(acc,axis=1,keepdims=True),1e-30)
 for k in range(V5_V,len(out['NORMAL'])):
  normal_3d=.16*out['NORMAL'][k]+.84*acc[k]
  out['NORMAL'][k]=normal_3d/max(np.linalg.norm(normal_3d),1e-30)
 mesh_norm=out['NORMAL'][new].mean(1);mesh_norm/=np.maximum(np.linalg.norm(mesh_norm,axis=1,keepdims=True),1e-30)
 if np.any(np.einsum('ij,ij->i',cross,mesh_norm)<=0):raise ValueError('Inverted normals')
 if not np.array_equal(out['POSITION'][:V5_V],pos) or not np.array_equal(out['TEXCOORD_0'][:V5_V],uv) or not np.array_equal(inds[:V5_T],ind):raise ValueError('Existing original face modified')
 blob=bytes(raw[off:]);blob_len=doc['buffers'][0]['byteLength'];blob=blob[:blob_len]
 for name in fields:
  blob,idx=encode_accessor(doc,blob,out[name]);prim['attributes'][name]=idx
 blob,idx=encode_accessor(doc,blob,inds.reshape(-1,1));prim['indices']=idx
 doc['buffers'][0]['byteLength']=len(blob);json_bytes=json.dumps(doc,separators=(',',':')).encode()
 json_bytes+=b' '*((-len(json_bytes))%4);blob+=b'\x00'*((-len(blob))%4)
 result=struct.pack('<III',0x46546c67,2,28+len(json_bytes)+len(blob))+struct.pack('<II',len(json_bytes),0x4e4f534a)+json_bytes+struct.pack('<II',len(blob),0x004e4942)+blob
 return result,{'schema':'blank.geometry.eye-v6-transition-experiment','source_sha256':sha,'output_sha256':hashlib.sha256(result).hexdigest(),'added_vertices':112,'added_triangles':224,'degenerate_3d':0,'collapsed_uv':0,'inverted_faces':0,'eye_measurements':measure,'human_visual_approval':'BLOCKED','unchanged_source_face_vertices':V5_V,'limitations':['Original source socket UV island is unchanged','Procedural eyeball and motion remain','Human close-up required']}
def main():
 p=argparse.ArgumentParser();p.add_argument('source');p.add_argument('output');p.add_argument('report');a=p.parse_args()
 output,report=build(Path(a.source).read_bytes())
 dest=Path(a.output);dest.parent.mkdir(exist_ok=True,parents=True);dest.write_bytes(output)
 dest=Path(a.report);dest.parent.mkdir(exist_ok=True,parents=True);dest.write_text(json.dumps(report,indent=2)+'\n')
 print('V6_TRANSITION_GEOMETRY_PASS',json.dumps(report))
if __name__=='__main__':main()
