import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {validateSnapshot} from '../character-pipeline/manual-builder/snapshot-validation.mjs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {CONTROLS,DEFAULTS,SCHEMA,PRESET_ID,PRESET_NAME,PRESET_DESCRIPTION,defaultRequest,validateRequest} from '../character-pipeline/manual-builder/controls.mjs';
import {createBuilderServer} from '../character-pipeline/manual-builder/server.mjs';
const base=dirname(fileURLToPath(import.meta.url));
const SOURCE='makehumancommunity/mpfb2:3af0cd5a2ffba072e93a34e5f6f494fdc4813ddf';
const baseMesh=JSON.parse(readFileSync(join(base,'../character-pipeline/manual-builder/basemesh.json'),'utf8'));
function canonicalFixture(){
 const height=1.72;
 return {schema:'blank.anatomy.snapshot.v1',source:SOURCE,geometry_space:'Y_UP_METERS',
  precision_m:.000001,vertex_count:13524,height_m:height,
  position_xyz:baseMesh.position_xyz.map((n,i)=>+(i%3===1?(n+8.1676)*height/16.6589:n*height/16.6589).toFixed(6)),
  body_indices:baseMesh.body_indices,eye_left_indices:baseMesh.eye_left_indices,
  eye_right_indices:baseMesh.eye_right_indices,
  hair_count:0,hair_matrices:[],
  hair_template:{position_xyz:Array(540).fill(0),indices:Array.from({length:306},(_,i)=>i%180)},
  eye_ornaments:{
    irises:[{position_xyz:[-.03,1.5,.14],scale_xyz:[.006,.006,.0013]},{position_xyz:[.03,1¶»§q«^