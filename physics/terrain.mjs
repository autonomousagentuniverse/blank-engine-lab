/** Renderer-independent incline for genuine physics-contact IK tests. */
import {clearPosition,isWalkable} from '../quest.mjs';
export const TERRAIN_SLOPE_RAD=.14;
export function buildTerrainFeatures(layout){
 if(!layout?.spawn||!Array.isArray(layout.buildings)||!Array.isArray(layout.robots))throw Error('Playable layout required');
 const avoid=[layout.spawn,layout.gate,layout.lantern,...layout.robots];
 const at=clearPosition(layout,{x:layout.spawn.x+13,z:layout.spawn.z+13},5,avoid);
 if(!isWalkable(layout,at.x,at.z,5))throw Error('Unable to place test ramp');
 const a=TERRAIN_SLOPE_RAD;
 return [{id:'calibration-ramp-1',position:{x:at.x,y:.54,z:at.z},
   size:{x:6,y:.24,z:7},rotation:{x:Math.sin(a/2),y:0,z:0,w:Math.cos(a/2)},
   slopeRadians:a,type:'static-ramp'}];
}
