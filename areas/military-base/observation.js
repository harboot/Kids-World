import { EYE_HEIGHT } from '../../core/player.js';
import { headquarters, lookout } from './layout.js';
import { cctvLensClearance } from './observation-props.js';

export function createObservation({ THREE, camera, observation, onNight, onCamera, onCctvExit }) {
  const view = new THREE.PerspectiveCamera(26,camera?.aspect ?? 1,.07,115);
  const target=new THREE.Vector3();
  const forward=new THREE.Vector3();
  let release,mode,index=0,yaw=0,pitch=0;
  const clamp=THREE.MathUtils.clamp;
  function pointNight() {
    target.set(view.position.x+Math.sin(yaw)*Math.cos(pitch),view.position.y+Math.sin(pitch),view.position.z+Math.cos(yaw)*Math.cos(pitch));
    view.lookAt(target);view.updateMatrixWorld(true);
  }
  function look(dx,dy) {
    if(mode!=='night-vision')return;
    yaw-=dx;pitch=clamp(pitch-dy,-1.15,.95);pointNight();
  }
  function showCamera(i) {
    const data=observation.cameras[i];
    index=i;
    view.position.set(...data.eye);
    target.set(...data.target);
    // The static scenery is instanced: hiding the housing group cannot hide its baked geometry.
    // Move the optical origin beyond the front of the housing instead.
    forward.subVectors(target,view.position).normalize();
    view.position.addScaledVector(forward,cctvLensClearance);
    view.lookAt(target);
    view.updateMatrixWorld(true);
    onCamera(i);
  }
  function stop(complete=false) {
    if(!release)return;
    const end=release; const was=mode;
    release=undefined;mode=undefined;index=0;
    end();
    if(complete&&was==='cctv')onCctvExit();
  }
  const prompt={silent:true,get label(){
    if(mode==='night-vision')return 'Exit Binoculars';
    return 'CCTV '+(index+1)+'/'+observation.cameras.length+' · '+(index===observation.cameras.length-1?'Exit':'Next');
  },act(){
    if(!release)return;
    if(mode==='night-vision'||index===observation.cameras.length-1)stop(true);
    else showCamera(index+1);
  }};
  function startNight({guideCamera}={}) {
    if(release||!guideCamera||!camera)return;
    const p=observation.binocular;
    view.position.set(p.x,p.y+1.40,p.z);
    yaw=Math.atan2(headquarters.x-p.x,headquarters.z-p.z);
    pitch=-.13;view.fov=26;view.updateProjectionMatrix();pointNight();
    mode='night-vision';
    release=guideCamera(look,{camera:view,prompt,fov:26,viewMode:mode});
    if(!release){mode=undefined;return;}
    onNight();
  }
  function startCctv({guideCamera}={}) {
    if(release||!guideCamera||!camera)return;
    mode='cctv';view.fov=58;view.updateProjectionMatrix();
    release=guideCamera(()=>{},{camera:view,prompt,fov:58,viewMode:mode});
    if(!release){mode=undefined;return;}
    showCamera(0);
  }
  function interaction(point,label,act,radius) {
    return {x:point.x,z:point.z,anchorY:point.y+1.25,label,radius,
      get active(){return !release;},reachable(p){return Math.abs(p.y-EYE_HEIGHT-point.y)<.85;},act};
  }
  return { interactions:[
    interaction(observation.binocular,'Use Binoculars',startNight,1.65),
    interaction(observation.console,'View CCTV',startCctv,1.45),
  ],cancel(){stop(false);},get mode(){return mode;},get viewPosition(){return release?view.position:undefined;} };
}
