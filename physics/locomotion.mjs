/** Fixed-step, renderer-independent locomotion contract for both Rapier and test adapters.
 * Positions are world-space, Y is feet height; no mesh coordinates or UI involved.
 */
export const PHYSICS_STEP = 1 / 60;
export const GRAVITY = -19.6;
export const JUMP_SPEED = 7.2;
export const WALK_SPEED = 6.8;
export const RUN_SPEED = 10.2;
export const FOOT_LIMIT = 0;

/** RAF timestamps can briefly precede performance.now() (shared frame timestamps).
 * Never allow negative/nonfinite elapsed time to reach gait/IK solvers. */
export function frameDelta(now,last){
 if(!Number.isFinite(now)||!Number.isFinite(last))return 0;
 return Math.max(0,Math.min(.05,(now-last)/1000));
}

export function createActor(x=0,z=0) {
  if (![x,z].every(Number.isFinite)) throw new Error('Actor spawn must be finite');
  return {x,z,y:0,vx:0,vz:0,vy:0,grounded:true,jumpHeld:false,motion:'idle'};
}

/** move(delta) returns {delta:{x,y,z},grounded:boolean}. Collision authority lives in adapter. */
export function stepActor(actor, input, dt, move) {
  if (!(dt > 0 && dt <= PHYSICS_STEP + 1e-8)) throw new Error('Locomotion requires a fixed <= 60 Hz step');
  const x=Number(input?.x)||0,z=Number(input?.z)||0;
  const length=Math.hypot(x,z), nx=length>1?x/length:x, nz=length>1?z/length:z;
  const moving=Math.hypot(nx,nz)>0.001;
  const scale=input?.speedScale??1;
  if(!Number.isFinite(scale)||scale<.2||scale>1.5)throw Error('Invalid character movement speed scale');
  const speed=(input?.run?RUN_SPEED:WALK_SPEED)*scale;
  // Exponential horizontal acceleration, frame-rate invariant on fixed steps.
  const blend=1-Math.exp(-(actor.grounded?19:8)*dt);
  const vx=actor.vx+((moving?nx:0)*speed-actor.vx)*blend;
  const vz=actor.vz+((moving?nz:0)*speed-actor.vz)*blend;
  const jumpEdge=!!input?.jump&&!actor.jumpHeld;
  const jumping=jumpEdge&&actor.grounded;
  const vy=(jumping?JUMP_SPEED:actor.grounded?0:actor.vy)+GRAVITY*dt;
  const desired={x:vx*dt,y:vy*dt,z:vz*dt};
  const result=move(desired);
  if(!result || !result.delta || ![result.delta.x,result.delta.y,result.delta.z].every(Number.isFinite) || typeof result.grounded!=='boolean')throw new Error('Physics adapter returned invalid motion');
  let ground=result.grounded && vy<=0;
  let nextY=actor.y+result.delta.y;
  if(nextY<FOOT_LIMIT){ nextY=FOOT_LIMIT; ground=true; }
  return {
    x:actor.x+result.delta.x,y:nextY,z:actor.z+result.delta.z,
    vx,vz,vy:ground?0:vy,grounded:ground,jumpHeld:!!input?.jump,
    motion:ground?(Math.hypot(vx,vz)<0.3?'idle':input?.run?'run':'walk'):(vy>0?'jump':'fall')
  };
}

/** Local fallback used only while WASM loads/unavailable; preserves historical collision. */
export function createFallbackMover(walkable, actor) {
  return delta=>{
    const x=walkable(actor.x+delta.x,actor.z)?delta.x:0;
    const z=walkable(actor.x+x,actor.z+delta.z)?delta.z:0;
    const dy=Math.max(-actor.y,delta.y);
    return {delta:{x,y:dy,z},grounded:actor.y+dy<=0.001};
  };
}

/** Convert at most 100 ms frame time into fixed ticks; drop excess to prevent spiral of death. */
export function stepAccumulator(accumulator,elapsed,stepFn){
  let rest=accumulator+Math.min(0.1,Math.max(0,elapsed));
  let steps=0;
  while(rest>=PHYSICS_STEP-1e-9&&steps<6){stepFn(PHYSICS_STEP);rest-=PHYSICS_STEP;steps++;}
  return Math.max(0,rest);
}
