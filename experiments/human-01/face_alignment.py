#!/usr/bin/env python3
"""Source-locked HUMAN-01 geometry diagnostic and reversible eye-seat candidate.

Only adjusts the existing skinned eye mesh POSITION in the Blender-exported GLB.
No topology/material/weight alteration and no automatic photorealism acceptance.
The original source is immutable; this is a provisional experiment, not a head fix.
"""
import argparse,hashlib,json,math,struct
from pathlib import Path

MAGIC=0x46546c67; JSON_CHUNK=0x4e4f534a; BIN_CHUNK=0x004e4942

def read_glb(path):
    raw=Path(path).read_bytes()
    if len(raw)<28 or struct.unpack_from('<III',raw,0)!=(MAGIC,2,len(raw)):
        raise ValueError('Expected binary glTF 2.0')
    cur=12;chunks=[]
    while cur<len(raw):
        size,typ=struct.unpack_from('<II',raw,cur);cur+=8
        if size%4 or cur+size>len(raw):raise ValueError('Invalid GLB chunk')
        chunks.append((typ,raw[cur:cur+size]));cur+=size
    if cur!=len(raw) or len(chunks)!=2 or chunks[0][0]!=JSON_CHUNK or chunks[1][0]!=BIN_CHUNK:
        raise ValueError('Expected JSON+BIN GLB')
    doc=json.loads(chunks[0][1])
    if len(doc.get('buffers',[]))!=1:raise ValueError('Not a self-contained GLB')
    return raw,doc,bytearray(chunks[1][1])

def pick_mesh(doc,marker):
    matches=[(i,m) for i,m in enumerate(doc.get('meshes',[]))
             if (m.get('name','').lower().startswith(marker) if marker=='base.'
                 else marker in m.get('name','').lower())]
    if len(matches)!=1:raise ValueError('Expected exactly one '+marker+' mesh, got '+str(len(matches)))
    return matches[0]

def position_accessor(doc,data,mesh):
    pp=mesh.get('primitives',[])
    if len(pp)!=1:raise ValueError('Unexpected primitive layout')
    acc=doc['accessors'][pp[0]['attributes']['POSITION']]
    if acc.get('componentType')!=5126 or acc.get('type')!='VEC3' or acc.get('sparse'):
        raise ValueError('Only dense float32 VEC3 positions supported')
    view=doc['bufferViews'][acc['bufferView']]
    stride=view.get('byteStride',12)
    if stride<12 or stride%4:raise ValueError('Invalid stride')
    first=view.get('byteOffset',0)+acc.get('byteOffset',0);count=acc['count']
    if count<1 or first<0 or first+(count-1)*stride+12>len(data):
        raise ValueError('Accessor overflow')
    return first,stride,count

def positions(doc,data,mesh):
    start,stride,count=position_accessor(doc,data,mesh)
    out=[struct.unpack_from('<fff',data,start+i*stride) for i in range(count)]
    if not all(math.isfinite(v) for p in out for v in p):raise ValueError('Bad vertex position')
    return out

def verify_transform(doc,index):
    matches=[n for n in doc.get('nodes',[]) if n.get('mesh')==index]
    if len(matches)!=1:raise ValueError('Ambiguous eye node')
    n=matches[0]
    for prop,expected in [('translation',(0,0,0)),('rotation',(0,0,0,1)),('scale',(1,1,1))]:
        if any(abs(a-b)>1e-5 for a,b in zip(n.get(prop,expected),expected)):
            raise ValueError('Unexpected eye transform '+prop)
    identity=(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)
    if 'matrix' in n and any(abs(a-b)>1e-5 for a,b in zip(n['matrix'],identity)):
        raise ValueError('Unexpected eye matrix')

def measure(doc,data):
    _,body=pick_mesh(doc,'base.');eye_index,eyes=pick_mesh(doc,'high-poly')
    _,teeth=pick_mesh(doc,'teeth_base');_,hair=pick_mesh(doc,'bob01')
    verify_transform(doc,eye_index)
    b=positions(doc,data,body);e=positions(doc,data,eyes)
    t=positions(doc,data,teeth);h=positions(doc,data,hair)
    if not .035<max(abs(p[0]) for p in e)<.07:
        raise ValueError('Unrecognized eye footprint: wrong source or pose')
    y0=min(p[1] for p in e)
    # Measure lower-lid/infraorbital skin (glTF Y-up, +Z toward face front).
    # Don't use the empty aperture directly behind the protruding eye.
    skin=[p[2] for p in b if .022<=abs(p[0])<=.05 and y0-.020<=p[1]<=y0+.002 and p[2]>0]
    if len(skin)<4:raise ValueError('No measurable lower orbital skin geometry')
    skin_front=max(skin);eye_front=max(p[2] for p in e)
    inset=eye_front-(skin_front+.002)
    if not .002<=inset<=.035:raise ValueError('Out-of-envelope eye correction '+str(inset))
    lips=[p[2] for p in b if abs(p[0])<.022 and 1.57<=p[1]<=1.60 and p[2]>0]
    visible_teeth=[p[2] for p in t if abs(p[0])<.022 and 1.57<=p[1]<=1.60]
    if not lips or not visible_teeth:raise ValueError('Mouth diagnostic has insufficient geometry')
    # If teeth lie behind outer lip depth but show in images, investigate holes/masks,
    # instead of assuming the entire teeth mesh should be shifted backward.
    return {'eye_mesh_index':eye_index,'eye_vertex_count':len(e),
            'eye_front_m':round(eye_front,6),'lower_socket_front_m':round(skin_front,6),
            'lower_socket_samples':len(skin),'eye_inset_m':round(inset,6),
            'eye_front_after_m':round(eye_front-inset,6),
            'lip_front_m':round(max(lips),6),'teeth_front_m':round(max(visible_teeth),6),
            'teeth_front_relative_lip_m':round(max(visible_teeth)-max(lips),6),
            'hair_front_m':round(max(p[2] for p in h),6),
            'hair_repaired':False,'teeth_repaired':False,
            'eyelids_retopologized':False,'visual_approval':False}

def write_glb(doc,data,path):
    js=json.dumps(doc,separators=(',',':')).encode()
    js+=b' '*((-len(js))%4)
    bin_=bytes(data);bin_+=b'\0'*((-len(bin_))%4)
    payload=struct.pack('<II',len(js),JSON_CHUNK)+js+struct.pack('<II',len(bin_),BIN_CHUNK)+bin_
    Path(path).write_bytes(struct.pack('<III',MAGIC,2,12+len(payload))+payload)

def candidate(source,output,report):
    original,doc,data=read_glb(source);metrics=measure(doc,data)
    if 'human01' not in str(doc.get('nodes',[])).lower():raise ValueError('Not HUMAN-01')
    source_sha=hashlib.sha256(original).hexdigest()
    _,eye=pick_mesh(doc,'high-poly')
    start,stride,count=position_accessor(doc,data,eye)
    for i in range(count):
        at=start+i*stride
        x,y,z=struct.unpack_from('<fff',data,at)
        struct.pack_into('<fff',data,at,x,y,z-metrics['eye_inset_m'])
    doc.setdefault('extras',{})['blank_eye_fit_candidate']={
      'schema':'blank.human01.eye-seating.v1','original_sha256':source_sha,
      'stage':'measured_non_destructive_candidate_only',
      'eye_inset_m':metrics['eye_inset_m'],'visual_acceptance':'BLOCKED'}
    write_glb(doc,data,output)
    _,verify_doc,verify_bin=read_glb(output)
    if verify_doc.get('meshes')!=doc.get('meshes'):raise RuntimeError('Topology changed')
    for key in ('skins','materials','textures','images','animations','nodes'):
        if verify_doc.get(key,[])!=doc.get(key,[]):raise RuntimeError('Unexpected change to '+key)
    _,verified_eye=pick_mesh(verify_doc,'high-poly')
    actual_front=max(p[2] for p in positions(verify_doc,verify_bin,verified_eye))
    if abs(actual_front-metrics['eye_front_after_m'])>1e-5:
        raise RuntimeError('Incorrect eye inset')
    record={'schema':'blank.human01.eye-seating.review.v1',
      'source_sha256':source_sha,
      'candidate_sha256':hashlib.sha256(Path(output).read_bytes()).hexdigest(),
      'source_remains_immutable':hashlib.sha256(Path(source).read_bytes()).hexdigest()==source_sha,
      'measured':metrics,'candidate_eye_front_m':round(actual_front,6),
      'technical_review':'Eye POSITION translation verified; no topology/skin/material change',
      'visual_review':'BLOCKED — matched Blender/Blank Engine head closeups required',
      'next':'Rebuild eyelid geometry, lip occlusion and hair fitting in source Blender scene'}
    Path(report).write_text(json.dumps(record,indent=2)+'\n')
    return record

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--source',default='artifacts/human-01/human-01.glb')
    p.add_argument('--output',default='artifacts/human-01/human-01-eye-seat-candidate.glb')
    p.add_argument('--report',default='artifacts/human-01/face-fit-report.json')
    a=p.parse_args()
    print(json.dumps(candidate(a.source,a.output,a.report),indent=2))
