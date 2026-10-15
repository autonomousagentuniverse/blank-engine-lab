/** Rapier WASM physics adapter. Renderer-independent: tracks feet position and rigid bodies. */
import {clearPosition} from '../quest.mjs';
import {buildTerrainFeatures} from './terrain.mjs';
export const RAPIER_CDN='https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.18.0/rapier.mjs';
let modulePromise;
export async function loadRapier(importer=()=>import(RAPIER_CDN)) {
  // Import and initialization happen once. Rejecting a broken load allows later retry.
  if(importer!==defaultImporter) {
    const module=await importer(); const rapier=module.default??module;
    await rapier.init();return rapier;
  }
  if(!modulePromise){modulePromise=(async()=>{const module=await importer();const rapier=module.default??module;await rapier.init();return rapier;})().catch(e=>{modulePromise=null;throw e;});}
  return modulePromise;
}
function defaultImporter(){return import(RAPIER_CDN);}
export async function initializeRapier(){return loadRapier(defaultImporter);}

/** Layout buildings are static, crates are dynamic and the player is a kinematic capsule. */
export function makePhysicsWorld(RAPIER,layout,{gateOpen=false}={}) {
  if(!layout?.buildings||!layout?.spawn||!layout?.gate)throw new Error('Playable layout required');
  const world=new RAPIER.World({x:0,y:-9.81,z:0});
  const floor=RAPIER.ColliderDesc.cuboid(75,.2,75).setTranslation(0,-.2,0);
  world.createCollider(floor);
  layout.buildings.forEach((b,i)=>{
    const depth=b.width*(.7+(i%3)*.14);
    world.createCollider(RAPIER.ColliderDesc.cuboid(b.width/2,b.height/2,depth/2).setTranslation(b.x,b.height/2,b.z));
  });
  const terrain=buildTerrainFeatures(layout);
  terrain.forEach(s=>world.createCollider(RAPIER.ColliderDesc.cuboid(s.size.x/2,s.size.y/2,s.size.z/2)
    .setTranslation(s.position.x,s.position.y,s.position.z).setRotation(s.rotation)));
  let gateCollider=world.createCollider(RAPIER.ColliderDesc.cuboid(2.4,2.25,.4).setTranslation(layout.gate.x,2.25,layout.gate.z));
  const heightOffset=.83;
  const playerCollider=world.createCollider(RAPIER.ColliderDesc.capsule(.46,.37).setTranslation(layout.spawn.x,heightOffset,layout.spawn.z));
  const controller=world.createCharacterController(.025);
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.enableAutostep(.35,.1,true);
  controller.enableSnapToGround(.15);
  const crates=[];
  for(const [i,p] of [{x:layout.spawn.x+5,z:layout.spawn.z+2},{x:layout.spawn.x-4,z:layout.spawn.z-4}].entries()) {
    const at=clearPosition(layout,p,1.25,[layout.spawn,layout.gate,layout.lantern]);
    const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(at.x,.58,at.z).setLinearDamping(.65).setAngularDamping(.8));
    world.createCollider(RAPIER.ColliderDesc.cuboid(.55,.55,.55).setRestitution(.1).setFriction(.85),body);
    crates.push({id:i,body});
  }
  world.step();
  let disposed=false;
  return {
    get position(){const p=playerCollider.translation();return {x:p.x,y:Math.max(0,p.y-heightOffset),z:p.z};},
    step(delta){
      if(disposed)throw new Error('Physics world disposed');
      controller.computeColliderMovement(playerCollider,delta);
      const moved=controller.computedMovement();
      const cur=playerCollider.translation();
      playerCollider.setTranslation({x:cur.x+moved.x,y:cur.y+moved.y,z:cur.z+moved.z});
      world.step();
      return {delta:{x:moved.x,y:moved.y,z:moved.z},grounded:controller.computedGrounded()};
    },
    /** Downward physics probe for animation only. Never changes rigid bodies. */
    probeGround(x,z,originY=2){
      if(disposed||![x,z,originY].every(Number.isFinite))return null;
      const ray=new RAPIER.Ray({x,y:originY,z},{x:0,y:-1,z:0});
      // Exclude the controlled capsule, otherwise the ray can detect the player.
      const hit=world.castRayAndGetNormal(ray,4,true,undefined,undefined,playerCollider);
      if(!hit||!Number.isFinite(hit.timeOfImpact))return null;
      return {y:originY-hit.timeOfImpact,normal:{x:hit.normal.x,y:hit.normal.y,z:hit.normal.z}};
    },
    getTerrain(){return terrain.map(s=>({...s,position:{...s.position},size:{...s.size},rotation:{...s.rotation}}));},
    getCrates(){return crates.map(({id,body})=>({id,position:body.translation(),rotation:body.rotation()}));},
    setGateOpen(open){if(open&&gateCollider){world.removeCollider(gateCollider,true);gateCollider=null;}},
    teleport(x,y,z){playerCollider.setTranslation({x,y:y+heightOffset,z});world.step();},
    dispose(){if(disposed)return;disposed=true;controller.free();world.free();}
  };
}
