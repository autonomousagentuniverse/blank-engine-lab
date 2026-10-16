#!/usr/bin/env python3
"""Eye v10 COPY-ONLY texture experiment, never a production eye repair.
The target UV bins were independently exported from the source-pinned v9
Chrome actual pixel ID / UV / unlit atlas screenshots, run 38907152402.
"""
import argparse,base64,hashlib,io,json,math,struct,zlib
from pathlib import Path
import numpy as np
from PIL import Image

SOURCE_SHA="2f3b63421defe8077e14727964e05e3c159db448bbfe6b64a7adab7e23a68c05"
EXPECTED_IMAGE="young_lightskinned_male_diffuse"
# zlib(base64) of JSON dict {left_original:[[u8,v8],..],left_lip:...,
# left_bridge:...,right_original:...,right_lip:...,right_bridge:...}
# v9 threshold: unlit R>125, R>1.55*G, R>1.45*B, valid face ID
# within screen boxes L(316,342,446,403), R(515,342,644,403).
TARGETS_ZLIB_B64="""eNpVlcGOFDEMRP+Fcx/GdpyO+ZXVCIFYlpFWgFbcEP/OxK7yLKcqTZftziR5/efD6/O3359+vt1ebj8+v374+PQUh1zG9XiSy3vjd6Oih9iiG5bO7r+d7Va7oBvarivGSDe6YnTF6IrRFeN9xah38a71rvV8ej1qVa+3X3tB93GX3cawHsNytk7oCV3Q3e4+6nKBClShBh1Qh07oCV1Q9BP0E/ST3c+PWCWRUlMdUx1THVMdUx3THNMc0xxTHFMcU+YRZ8kqiZQaNhGeHRbZw84jvGSWnCkVOjskst9oVXhVeFV4IbQQigpFhQJPA0/vRy0fb504ehlIw8MoGRFEBVFhVBgVRhVRZUQZUUYMEUM3wyLTGE3WjCOoDp2l9ScKNzZN1jpKHCWOEq8/Sbhpwl0Tblua7DFRO1GLDRXsqEwciDQnTT8KmJrDDRfuuGCPBZu8dUGjtI5KGqeZNCfNomGVsKoG4lxsXdAoRf+Fg59GaYxm0DjNpMm+gX7BfsF+wX7Bfo26yDbkxpe329eX540OGXxwB+T3/zlpQp4IgaL4JfGoTtjppZ20ayhqQ1FHu0ftJPakQSkNSnQe3Xl07eha71rvWu9a77netZ61vWpwVK3+WjX8tWmERmmMZtDke4za+K0LGqXoRs4qQaskrRK1StbqeLStjVfiVnHJFJdLwVd11hKdSnaqP2rr4CpvpPJGKu6f4v4p7p/yuimvm/K6Ka+bzkeTum5KwupZaFCgVnEPlRdGiVslb3WhBMBVEFcXk4SugrYK3GowEY9EUS1NHmIg2IheI3qN6DWg14BeI3qN6DWi14DerRNXpKJEsBHBBgQbEGwkr5G8BuIaiGs4UkbgGoGbJktwGAzENRwKw6EwfHWNn10jeI3gTZO9sOMG4ho+osavaBqhURqDEWaEGWGmBgG5BuQakZtGaJTGaAaN00yakwaN8RI8XMbDZcSvEb9G/Brxa8SvEb9G/Brxm2bRBIywcw0NVgXDkeEGzgPAytXoem/O6/XvP/2RhbM="""

def read(src):
    if len(src)<100 or struct.unpack_from('<III',src,0)!=(0x46546c67,2,len(src)):
        raise ValueError("Invalid GLB2")
    n,t=struct.unpack_from('<II',src,12)
    if t!=0x4e4f534a:raise ValueError("GLB JSON missing")
    doc=json.loads(src[20:20+n]);size,tag=struct.unpack_from('<II',src,20+n)
    if tag!=0x004e4942:raise ValueError("GLB BIN missing")
    return doc,src[28+n:28+n+size]

def build(source):
    sha=hashlib.sha256(source).hexdigest()
    if sha!=SOURCE_SHA:raise ValueError("Pinned v7 GLB SHA mismatch: "+sha)
    doc,blob=read(source)
    if (doc['materials'][0]['name']!='Human.body' or
        doc['meshes'][0]['primitives'][0]['material']!=0 or
        len(doc['skins'][0]['joints'])!=53 or len(doc['animations'])!=4):
        raise ValueError("Unexpected base material or character rig")
    pic=doc['images'][0]
    if pic['name']!=EXPECTED_IMAGE or pic['mimeType']!='image/png':
        raise ValueError("Not the pinned skin texture")
    view=doc['bufferViews'][pic['bufferView']]
    oldpng=blob[view['byteOffset']:view['byteOffset']+view['byteLength']]
    rgb=np.asarray(Image.open(io.BytesIO(oldpng)).convert('RGBA')).copy()
    if rgb.shape!=(1024,1024,4):raise ValueError("Unexpected atlas size")
    orig=rgb.copy();height,width=rgb.shape[:2]
    targets=json.loads(zlib.decompress(base64.b64decode(TARGETS_ZLIB_B64)))
    if set(targets)!={'left_original','right_original','left_lip','right_lip','left_bridge','right_bridge'}:
        raise ValueError("Target selection no longer matches source")
    mask=np.zeros((height,width),np.float32)
    ncenters=0
    for values in targets.values():
        for u8,v8 in values:
            u,v=u8/255.0,v8/255.0
            x=round(u*(width-1));y=round((1-v)*(height-1))
            if min(x,y)<4 or x>width-5 or y>height-5:raise ValueError("UV outside bounds")
            for dy in range(-3,4):
                for dx in range(-3,4):
                    rad=math.hypot(dx,dy)
                    if rad<=3:
                        strength=(1+math.cos(math.pi*rad/3))/2
                        mask[y+dy,x+dx]=max(mask[y+dy,x+dx],strength)
            ncenters+=1
    r,g,b=[rgb[:,:,k].astype(np.float32) for k in range(3)]
    red=(r>125)&(r>1.45*g)&(r>1.36*b)&(r-g>43)
    amount=mask*red.astype(np.float32)*.92
    rgb[:,:,1]=np.rint(g+(np.maximum(g,r*.76)-g)*amount).clip(0,255).astype('uint8')
    rgb[:,:,2]=np.rint(b+(np.maximum(b,r*.64)-b)*amount).clip(0,255).astype('uint8')
    changed=np.any(rgb[:,:,:3]!=orig[:,:,:3],axis=2)
    total=int(changed.sum())
    if not 120<total<6000:raise ValueError("Correction escaped intended bounds: "+str(total))
    if np.any(changed & ~(mask>0)):raise ValueError("Out-of-mask skin pixel changed")
    if not (np.array_equal(rgb[:,:,0],orig[:,:,0]) and np.array_equal(rgb[:,:,3],orig[:,:,3])):
        raise ValueError("R/alpha changed")
    dest=io.BytesIO();Image.fromarray(rgb,'RGBA').save(dest,'PNG',optimize=True);newpng=dest.getvalue()
    binout=blob+b'\0'*(-len(blob)%4)
    offset=len(binout);binout+=newpng;binout+=b'\0'*(-len(binout)%4)
    newview=len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(newpng)})
    pic['bufferView']=newview;pic['name']=EXPECTED_IMAGE+'_eye_v10_copy_only'
    doc['buffers'][0]['byteLength']=len(binout)
    jb=json.dumps(doc,separators=(',',':')).encode();jb+=b' '*(-len(jb)%4)
    output=struct.pack('<III',0x46546c67,2,28+len(jb)+len(binout))+struct.pack('<II',len(jb),0x4e4f534a)+jb+struct.pack('<II',len(binout),0x004e4942)+binout
    data={'schema':'blank.eye.v10.local-texture.v1','approval':'experimental_only',
      'source_sha256':sha,'candidate_sha256':hashlib.sha256(output).hexdigest(),
      'input_skin_image_sha256':hashlib.sha256(oldpng).hexdigest(),
      'output_skin_image_sha256':hashlib.sha256(newpng).hexdigest(),
      'original_bin_prefix_unchanged':True,'original_mesh_indices_weights_rig_clips_unchanged':True,
      'target_uv_bins':ncenters,'atlas_changed_texels':total,
      'atlas_total_texels':width*height,'atlas_fraction_modified':round(total/(width*height),8),
      'red_and_alpha_channels_unchanged':True,
      'limitations':['Screenshot UV is 8-bit quantized: +/-2 texel localization error',
       'Atlas areas may be shared by adjacent face skin: compare out-of-eye screen pixels',
       'Local desaturation is not anatomical eyelid/iris/cornea reconstruction',
       'Requires matched Chrome and human visual review'] }
    return output,data,Image.fromarray(rgb,'RGBA'),Image.fromarray((mask*255).astype('uint8'),'L')

def main():
    a=argparse.ArgumentParser()
    a.add_argument('source');a.add_argument('output');a.add_argument('report');a.add_argument('debug_dir')
    x=a.parse_args();out,report,atlas,mask=build(Path(x.source).read_bytes())
    Path(x.output).parent.mkdir(parents=True,exist_ok=True);Path(x.output).write_bytes(out)
    Path(x.report).parent.mkdir(parents=True,exist_ok=True);Path(x.report).write_text(json.dumps(report,indent=2)+'\n')
    p=Path(x.debug_dir);p.mkdir(parents=True,exist_ok=True)
    atlas.save(p/'v10-skin-atlas.png');mask.save(p/'v10-atlas-target-mask.png')
    print('EYE_V10_BOUNDED_ATLAS_PASS',json.dumps(report))

if __name__=='__main__':main()
