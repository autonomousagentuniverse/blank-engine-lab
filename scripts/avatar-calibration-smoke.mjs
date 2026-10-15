#!/usr/bin/env node
/** Exercise two differently proportioned, exported & reloaded GLBs with real IK. */
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {makeCalibrationGlb} from './generate-avatar-fixtures.mjs';
import {loadGlbAvatar} from '../character/gltf.mjs';
import {createPoseController} from '../character/ik.mjs';
import {calibrateHandContact} from '../character/motion.mjs';
const diagnostics=[];
for(const variant of ['tall','compact']){
 const asset=await makeCalibrationGlb(variant);
 const avatar=await loadGlbAvatar(THREE,GLTFLoader,asset);
 const scene=new THREE.Scene();scene.add(avatar.root);
 const controller=createPoseController(THREE,avatar);
 assert.equal(controller.chains.length,4,`${variant}: four IK chains`);
 const offset=avatar.soleOffsets.left;
 assert(offset>.03&&offset<.4,`${variant}: calibrated nonzero ankle/sole offset ${offset}`);
 const actor={x:0,y:0,z:0,vx:0,vz:0,grounded:true,motion:'idle'};
 for(let i=0;i<60;i++){
  avatar.update(actor,1/60);
  controller.update({actor,dt:1/60,groundProbe:()=>({y:0,normal:{x:0,y:1,z:0}})});
 }
 const planted=controller.footState;
 assert(planted.left.planted&&planted.right.planted,`${variant}: planted foot`);
 assert(Math.abs(planted.left.position.y-offset-.035)<1e-3,`${variant}: sole floor correction`);
 avatar.root.updateWorldMatrix(true,true);
 const arm=avatar.poseChains.rightArm;
 const shoulder=arm.upper.getWorldPosition(new THREE.Vector3());
 const elbow=arm.lower.getWorldPosition(new THREE.Vector3());
 const hand=arm.end.getWorldPosition(new THREE.Vector3());
 const armLength=shoulder.distanceTo(elbow)+elbow.distanceTo(hand);
 const reach=calibrateHandContact(shoulder,{x:shoulder.x+armLength*2,y:shoulder.y,z:shoulder.z},{armLength,surfaceRadius:.1});
 assert(!reach.contact&&reach.shortfall>0,`${variant}: far target remains unreachable`);
 actor.grounded=false;actor.motion='jump';actor.y=.4;
 avatar.update(actor,1/60);controller.update({actor,dt:1/60,groundProbe:()=>({y:0,normal:{x:0,y:1,z:0}})});
 assert(controller.footState.left.weight<planted.left.weight,`${variant}: release on jump`);
 diagnostics.push({variant,offset:Number(offset.toFixed(3)),bytes:asset.byteLength,chains:controller.chains.length});
 avatar.dispose();
}
assert.notEqual(diagnostics[0].offset,diagnostics[1].offset,'distinct rigs need different foot calibrations');
console.log('REAL IMPORTED AVATAR CALIBRATION PASS: '+JSON.stringify(diagnostics));
