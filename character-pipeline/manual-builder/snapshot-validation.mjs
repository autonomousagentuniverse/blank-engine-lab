// Fail-closed contract for exporting the exact WebGL anatomy into Blender.
// A geometry snapshot is a trusted reconstruction target only after validation
// against the pinned source mesh topology and bounded metric coordinates.
import {readFileSync} from 'node:fs';
const source=JSON.parse(readFileSync(new URL('./basemesh.json',import.meta.url),'utf8'));
const SRC='makehumancommunity/mpfb2:3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf';
const eq=(a,b)=>a?.length===b.length&&a.every((v,i)=>v===b[i]);
export function validateSnapshot(snapshot){
 if(!snapshot||snapshot.schema!=='blank.anatomy.snapshot.v1'||snapshot.source!==SRC)
  throw Error('Canonical MakeHuman snapshot required; old procedural Blender builder disabled');
 if(snapshot.geometry_space!=='Y_UP_METERS'||snapshot.precision_m!==.000001)
  throw Error('Unsupported Blender geometry coordinate contract');
 const positions=snapshot.position_xyz;
 if(snapshot.vertex_count!==13524||!Array.isArray(positions)||positions.length!==40572)
  throw Error('Incorrect anatomical mesh vertex count');
 if(!eq(snapshot.body_indices,source.body_indices)||
    !eq(snapshot.eye_left_indices,source.eye_left_indices)||
    !eq(snapshot.eye_right_indices,source.eye_right_indices))
  throw Error('Snapshot topology differs from pinned MakeHuman source');
 if(!positions.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<5))
  throw Error('Non-finite or out-of-scale anatomical vertices');
 if(typeof snapshot.height_m!=='number'||snapshot.height_m<1.45||snapshot.height_m>2.05)
  throw Error('Invalid target stature');
 let ymin=Infinity,ymax=-Infinity;
 for(let i=1;i<positions.length;i+=3){ymin=Math.min(ymin,positions[i]);ymax=Math.max(ymax,positions[i]);}
 if(Math.abs((ymax-ymin)-snapshot.height_m)>.045||ymin<-.06)
  throw Error('Snapshot stature differs from selected height');
 const material=snapshot.resolved_materials;
 if(!material||!['skin_color','sclera_color','iris_color','hair_color','world_color']
    .every(k=>/^#[a-f0-9]{6}$/i.test(material[k]||''))||
    !Number.isFinite(material.skin_roughness)||material.skin_roughness<.1||material.skin_roughness>1)
  throw Error('Missing browser-resolved material snapshot');
 const ornaments=snapshot.eye_ornaments;
 if(!ornaments||!['irises','pupils'].every(k=>Array.isArray(ornaments[k])&&ornaments[k].length===2))
   throw Error('Missing exact eye-ornament positions for Blender');
 for(const eye of [...ornaments.irises,...ornaments.pupils]){
   if(!Array.isArray(eye.position_xyz)||eye.position_xyz.length!==3||
      !Array.isArray(eye.scale_xyz)||eye.scale_xyz.length!==3||
      !eye.position_xyz.every(n=>Number.isFinite(n)&&Math.abs(n)<=2.2)||
      !eye.scale_xyz.every(n=>Number.isFinite(n)&&n>0&&n<.03))
     throw Error('Invalid eye ornament transform');
 }
 const template=snapshot.hair_template;
 if(!template||!Array.isArray(template.position_xyz)||!Array.isArray(template.indices)||
    template.position_xyz.length<500||template.position_xyz.length>5000||
    template.position_xyz.length%3!==0||template.indices.length<300||
    template.indices.length%3!==0||
    !template.position_xyz.every(n=>Number.isFinite(n)&&Math.abs(n)<2)||
    !template.indices.every(i=>Number.isInteger(i)&&i>=0&&i<template.position_xyz.length/3))
   throw Error('Invalid shared curved-hair topology');
 const count=snapshot.hair_count;
 if(!Number.isInteger(count)||count<0||count>420||
    !Array.isArray(snapshot.hair_matrices)||snapshot.hair_matrices.length!==16*count||
    !snapshot.hair_matrices.every(n=>Number.isFinite(n)&&Math.abs(n)<10))
  throw Error('Invalid follicle transform data');
 return snapshot;
}

