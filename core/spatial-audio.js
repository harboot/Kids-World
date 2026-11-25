// World-space positional cue mixer. The listener's horizontal right vector
// comes from the camera. All distances use game-world units.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function spatialMix(listener, source) {
  if(!listener||!source)return {gain:0,pan:0};
  const {x,z,eyeY,range=8,near=1.5,floorHeight=3.25,floorTolerance=1.1,maxFloors=0}=source;
  if(![x,z,eyeY,range,near,floorHeight,floorTolerance,maxFloors,listener.x,listener.y,listener.z].every(Number.isFinite)||range<=0||floorHeight<=0)return {gain:0,pan:0};
  const dx=x-listener.x,dz=z-listener.z,dy=Math.abs(eyeY-listener.y);
  const horizontal=Math.hypot(dx,dz),distance=Math.hypot(horizontal,dy);
  const outer=floorTolerance+maxFloors*floorHeight;
  const inner=Math.min(range*.5,Math.max(0,near));
  const t=clamp((distance-inner)/(range-inner),0,1);
  const distanceGain=1-t*t*(3-2*t);
  // Smooth vertical attenuation, with a small fade at the outer floor boundary.
  const verticalGain=Math.pow(.25,Math.max(0,dy-floorTolerance)/floorHeight)*
    clamp((outer-dy)/.25,0,1);
  const rx=Number.isFinite(listener.rightX)?listener.rightX:1,rz=Number.isFinite(listener.rightZ)?listener.rightZ:0;
  const len=Math.hypot(rx,rz);
  const pan=horizontal>1e-6&&len>1e-6?clamp((dx*rx+dz*rz)/(horizontal*len),-1,1)*.85:0;
  return {gain:distanceGain*verticalGain,pan};
}
