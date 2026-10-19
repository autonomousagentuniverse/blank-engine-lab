#!/usr/bin/env node
/** Real Blender -> GLB -> Blank Engine 60Hz physics/IK integration smoke.
 * Usage: node scripts/anatomy-playable-smoke.mjs /absolute/generated/animated_character.glb
 * This measures engineering wiring, not visual gait plausibility.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';
import {inspectAvatarGlb,loadGlbAvatar} from '../character/gltf.mjs';
import {createPoseController} from '../character/ik.mjs';
import {makePhysicsWorld} from '../physics/rapier.mjs';
import {createActor,stepActor,PHYSICS_STEP} from '../physics/locomotion.mjs';
import {playableLayout} from '../quest.mjs';
import {DEFAULT_SPEC} from '../core.mjs';

if(!globalThis.FileReader)globalThis.FileReader=class{
 readAsArrayBuffer(blob){blob.arrayBuffer().then(data=>{this.result=data;this.onloadend?.({target:this})}).catch(e=>this.onerror?.(e))}
 readAsDataURL(blob){blob.arrayBuffer().then(a=>{this.result='data:'+blob.type+';base64,'+Buffer.from(a).toString('base64');this.onloadend?.({target:this})}).catch(e=>this.onerror?.(e))}
};
const filepath=process.argv[2];
if(!filepath)throw Error('Pass generated Blender GLB file path');
const binary=fs.readFileSync(filepath);
const input=binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength);
const manifest=inspectAvatarGlb(input);
assert.equal(manifest.animations.length,9,'actual Blender model should contain nine motions');
const avatar=await loadGlbAvatar(THREE,GLTFLoader,input);
assert.equal(avatar.clipSources.walk,'authored','Walk_InPlace must bind to game walking');
assert.equal(avatar.clipSources.run,'authored','Run_InPlace must bind to game running');
assert.equal(avatar.clipSources.idle,'authored','Idle_Breath must bind to game idle');
console.log('ACTUAL_GAME_MAPPING',avatar.skinnedCount,avatar.boneCount,avatar.clipSources); assert.ok(avatar.skinnedCount>0&&avatar.boneCount>=13);
const ik=createPoseController(THREE,avatar);
assert.ok(ik.chains.includes('leftLeg')&&ik.chains.includes('rightLeg'),
  'Blender human must expose real leg IK chains');
await RAPIER.init();
const layout=playableLayout({...DEFAULT_SPEC,buildings:4,robots:4});
const physics=makePhysicsWorld(RAPIER,layout);
let actor=createActor(layout.spawn.x,layout.spawn.z);
physics.teleport(actor.x,actor.y,actor.z);
const scene=new THREE.Scene();scene.add(avatar.root);
let transitions=[],plantedCount=0,worldSteps=0,phases=[],maxVisualHeight=0;
try{
  for(let frame=0;frame<360;frame++){
    const run=frame>=170&&frame<280;
    const input={x:frame>=80&&frame<170?.7:0,z:frame<280?1:0,run,speedScale:run?.5:.37};
    const previous=actor.motion;
    actor=stepActor(actor,input,PHYSICS_STEP,delta=>physics.step(delta));
    if(previous!==actor.motion)transitions.push(actor.motion);
    avatar.root.position.set(actor.x,0,actor.z);
    avatar.update(actor,PHYSICS_STEP);
    ik.update({actor,dt:PHYSICS_STEP,groundProbe:(x,z,y)=>physics.probeGround(x,z,y)});
    avatar.root.updateMatrixWorld(true);
    const footprints=ik.footState;
    if(footprints.left.planted||footprints.right.planted)plantedCount++;
    assert.ok(Number.isFinite(actor.x)&&Number.isFinite(actor.y)&&Number.isFinite(actor.z));
    assert.ok(Number.isFinite(avatar.root.position.y));
    maxVisualHeight=Math.max(maxVisualHeight,new THREE.Box3().setFromObject(avatar.root).max.y);
    worldSteps++;
    if(frame%60===0)phases.push({frame,actor:actor.motion,speed:Math.hypot(actor.vx,actor.vz).toFixed(2),lockL:footprints.left.planted,lockR:footprints.right.planted});
  }
  assert.ok(worldSteps===360&&transitions.includes('walk')&&transitions.includes('run')&&transitions.includes('idle'), 'walk-run-stop physics state transitions');
  assert.ok(plantedCount>=10,'real Rapier ground contacts and IK lock must become active');
  assert.ok(actor.x>0.5,'actor must be able to turn and move sideways while walking');
  const info={vertexCount:manifest.accessors?.length,animationNames:manifest.animations.map(x=>x.name),bones:avatar.boneCount,ikChains:ik.chains,clipSources:avatar.clipSources,
    transitions,plantedFrames:plantedCount,worldSteps,steps:phases,maxVisualHeight:Number(maxVisualHeight.toFixed(3)),finalPosition:{x:actor.x,y:actor.y,z:actor.z}};
  console.log('REAL_BLENDER_CHARACTER_PLAYABLE_PHYSICS_IK_PASS',JSON.stringify(info));
}finally{avatar.dispose();physics.dispose()}

