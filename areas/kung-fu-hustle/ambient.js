import { EYE_HEIGHT } from '../../core/player.js';
import { seededRandom } from '../../core/random.js';
import { spatialMix } from '../../core/spatial-audio.js';
import { floorRise, gallery, stories } from './layout.js';
import { wellPosition } from './sauce.js';
import { donutCounter } from './donut.js';
import { beastPosition } from './the-beast.js';

const tone=(pitch,endPitch,duration,level,offset=0,attack=.015,wave='sine')=>[pitch,{endPitch,duration,level,attack,wave},offset];
const noise=(pitch,endPitch,duration,level,offset=0,attack=.05,q=.8)=>[pitch,{wave:'noise',endPitch,duration,level,attack,q},offset];
export const ambientSounds=Object.freeze({
  birds:[tone(94,101,.13,.042),tone(99,95,.11,.032,.17),tone(92,99,.18,.037,.41)],
  breeze:[noise(53,66,1.65,.055,0,.30,.65),noise(69,52,1.18,.028,.36,.25,.7)],
  cooking:[noise(99,89,.58,.048,0,.045,1.1),noise(92,101,.09,.035,.22,.004,1.5),noise(103,86,.08,.031,.42,.005,1.3)],
  market:[noise(62,70,.63,.035,0,.14,1.8),tone(49,52,.23,.016,.12,.05,'triangle'),tone(55,47,.31,.015,.41,.05,'triangle'),noise(77,64,.41,.026,.42,.09,1.1)],
  drip:[tone(91,74,.11,.044,0,.004),tone(86,72,.08,.028,.24,.003),noise(88,70,.07,.016,.01,.005,1.5)],
  fabric:[noise(78,60,.32,.041,0,.06,.8),noise(66,78,.28,.026,.37,.04,.8)],
  frog:[tone(42,34,.17,.035,0,.03,'triangle'),tone(39,31,.19,.028,.23,.03,'triangle')],
});
const zone=(kind,x,z,range,interval,first,floor=0,maxFloors=1)=>({kind,source:{x,z,eyeY:EYE_HEIGHT+floor*floorRise,range,maxFloors,floorHeight:floorRise},interval,first});
// Sources correspond to actual courtyard props, market row, food counter,
// well, upper galleries and Beast area. A floor may hear a faint adjacent cue.
export const ambientZones=Object.freeze([
  zone('birds',-9,7.85,15,[7,13],2),
  zone('birds',15.65,11.68,15,[9,16],5),
  zone('breeze',0,7,28,[9,15],4),
  zone('cooking',donutCounter.x,donutCounter.z,9,[4,8],1.5,0,0),
  zone('market',0,gallery.rear+2,18,[6,11],3),
  zone('drip',wellPosition.x,wellPosition.z,7,[3,6],1.4,0,0),
  zone('frog',beastPosition.x+2,beastPosition.z+2,9,[9,17],6,0,0),
  ...Array.from({length:stories-1},(_,i)=>zone('fabric',-8,gallery.court+.7,12,[6,12],2.5+i*1.7,i+1)),
]);
export function createAmbientSounds(playCue=()=>{}){
  let random,remaining;
  function reset(){random=seededRandom(8317);remaining=ambientZones.map(z=>z.first);}
  reset();
  return {
    reset,
    update(dt,listener,audible=true){
      if(!Number.isFinite(dt)||dt<=0||!audible||!listener)return;
      // At most one event per update, no catch-up burst after pause or a slow frame.
      dt=Math.min(dt,.1);
      let played=false;
      for(let i=0;i<ambientZones.length;i++){
        const z=ambientZones[i];remaining[i]-=dt;
        if(remaining[i]>0)continue;
        remaining[i]=z.interval[0]+random()*(z.interval[1]-z.interval[0]);
        if(!played&&spatialMix(listener,z.source).gain>.015){
          playCue(ambientSounds[z.kind],z.source);played=true;
        }
      }
    },
  };
}
