import { fence, lookout, repairTank } from './layout.js';
import { ink } from './scenery.js';

const uniforms = {
  guard: { jacket: 0x5c8e67, trousers: 0x516950, helmet: 0xa5aa65, vest: 0x41655b, patch: 0xe0b554 },
  crew: { jacket: 0x679ba1, trousers: 0x43657a, helmet: 0xf1bc58, vest: 0x5e6e57, patch: 0xebc777 },
  medic: { jacket: 0xe1e4cb, trousers: 0x607e7f, helmet: 0x8ca998, vest: 0x679a91, patch: 0xbc5448 },
};
const skinTones = [0xd3a173, 0xae7956, 0xe0b38b, 0x885b44, 0xc89270, 0x996949];

export function buildSoldiers(kit, moving) {
  const { group, groundShadow } = kit;
  const { add } = moving;
  const poses = [];
  const gestures = new Map();
  // The model faces +Z, so its right shoulder is on local -X.
  const { THREE } = kit;
  const down = new THREE.Vector3(0,-1,0);
  const upperLength=.25, lowerLength=.30;
  const upperSalute=new THREE.Quaternion().setFromUnitVectors(down,new THREE.Vector3(-.19,.155,.055).normalize());
  const lowerSaluteWorld=new THREE.Quaternion().setFromUnitVectors(down,new THREE.Vector3(.245,.20,.12).normalize());
  const lowerSalute=upperSalute.clone().invert().multiply(lowerSaluteWorld);
  function salutePose(arms, amount) {
    const t=THREE.MathUtils.clamp(amount,0,1);
    const right=arms[0];
    right.rotation.set(0,0,-.08);
    right.quaternion.slerp(upperSalute,t);
    right.getObjectByName('Elbow').quaternion.identity().slerp(lowerSalute,t);
  }

  function person(name, role, x, z, yaw, action = 'idle', route = null, elevation = 0, parent = kit.scene) {
    const index = poses.length;
    const skin = skinTones[index % skinTones.length];
    const colors = uniforms[role];
    const npc = group(name, x, elevation, z, yaw, parent);
    const core = group('Uniform and head', 0, .79, 0, 0, npc);
    add(core, 'box', colors.trousers, 0, .011, 0, .41, .15, .28);
    add(core, 'box', colors.jacket, 0, .31, 0, .48, .49, .34);
    add(core, 'box', colors.vest, 0, .324, .157, .43, .34, .12);
    add(core, 'box', ink.dark, 0, .107, 0, .45, .09, .35);
    add(core, 'box', ink.yellow, 0, .11, .187, .11, .07, .03);
    add(core, 'box', colors.patch, .13, .453, .226, .126, .055, .021);
    add(core, 'box', colors.vest, 0, .28, -.183, .34, .33, .14);
    add(core, 'drum', skin, 0, .58, 0, .094, .129, .098);
    const head = group('Head', 0, .718, .014, 0, core);
    add(head, 'cap', skin, 0, .026, 0, .181, .196, .156);
    add(head, 'box', skin, 0, .012, .152, .072, .055, .051);
    for (const side of [-1, 1]) add(head, 'box', 0x40392d, side * .068, .058, .147, .035, .031, .018);
    add(head, 'cap', colors.helmet, 0, .143, -.014, .207, .112, .185);
    add(head, 'box', colors.helmet, 0, .096, .09, .324, .051, .235);
    if (role === 'medic') {
      add(core, 'box', colors.patch, -.132, .41, .224, .032, .104, .025);
      for (const side of [-1, 1]) add(core, 'box', colors.patch, -.132 + side * .033, .41, .224, .035, .031, .025);
    }
    const arms = [];
    const legs = [];
    for (const side of [-1, 1]) {
      const arm = group('Arm', side * .28, .44, 0, 0, core);
      add(arm, 'box', colors.jacket, 0, -upperLength/2, 0, .141, upperLength+.03, .178);
      const elbow=group('Elbow',0,-upperLength,0,0,arm);
      add(elbow,'box',colors.jacket,0,-lowerLength/2,0,.127,lowerLength+.025,.145);
      const hand=group('Hand',0,-lowerLength-.045,0,0,elbow);
      add(hand,'box',skin,0,0,0,.112,.115,.075);
      arms.push(arm);
      const leg = group('Leg', side * .109, .78, 0, 0, npc);
      add(leg, 'box', colors.trousers, 0, -.321, 0, .174, .67, .189);
      add(leg, 'box', ink.dark, 0, -.706, .043, .184, .151, .279);
      legs.push(leg);
    }
    if (!route && action !== 'sleep') groundShadow(npc, .143, -.11, .84, .68, .048);
    poses.push(time => {
      const phase = time * (action === 'march' ? 7.1 : 5.8) + index * (action === 'march' ? .055 : .48);
      let gait = action === 'march' ? .53 : 0;
      if (route) {
        const [endX, endZ] = route;
        const progress = .5 - .5 * Math.cos(time * .31);
        npc.position.x = x + (endX - x) * progress;
        npc.position.z = z + (endZ - z) * progress;
        const direction = Math.sin(time * .31);
        const turn = direction < 0 ? Math.PI : 0;
        npc.rotation.y = Math.atan2(endX - x, endZ - z) + turn;
        gait = Math.abs(direction) * .43;
      }
      core.position.y = .79 + (action === 'idle' ? Math.sin(time * 2.1 + index) * .012 : Math.abs(Math.sin(phase)) * gait * .14);
      head.rotation.y = Math.sin(time * .9 + index * .72) * (action === 'idle' ? .16 : .04);
      for (const [i, arm] of arms.entries()) {
        const swing = Math.sin(phase + i * Math.PI);
        arm.rotation.x = (action === 'idle' ? Math.sin(time * 1.8 + index + i) * .065 : swing * gait);
        arm.rotation.z = i === 0 ? -.08 : .08;
        arm.getObjectByName('Elbow').quaternion.identity();
        legs[i].rotation.x = -swing * gait * .77;
      }
      const gesture = gestures.get(name);
      if (gesture) {
        const envelope = Math.min(1, gesture.time / .24, (gesture.duration - gesture.time) / .33);
        if (gesture.type === 'salute') {
          core.position.y=.79;
          head.rotation.set(0,0,0);
          arms[1].rotation.set(0,0,.08);
          for(const leg of legs) leg.rotation.x=0;
          salutePose(arms,Math.min(1,gesture.time/.30));
        } else {
          for (const arm of arms) arm.rotation.x = -1.27 * envelope;
          head.rotation.x = .18 * envelope;
        }
      } else head.rotation.x = 0;
    });
    return {npc,core,head,arms,legs};
  }

  person('South Gate guard west', 'guard', -3.08, fence.south - 3.1, .23);
  person('South Gate guard east', 'guard', 3.12, fence.south - 3.3, -.23);
  person('West checkpoint guard', 'guard', -63.8, 4.4, Math.PI / 2);
  person('North checkpoint guard', 'guard', -6.25, -59.2, 0);
  person('East checkpoint guard', 'guard', 66.8, -4.0, -Math.PI / 2);
  person('Flight line patrol', 'guard', 12.05, -41.6, 0, 'patrol', [12.05, -35.5]);
  person('West road patrol', 'guard', -60.0, -14.7, 0, 'patrol', [-60.0, -1.5]);
  for (const [row, z] of [10.7, 12.65].entries()) {
    for (const [column, x] of [-16.55, -14.8, -13.05].entries()) {
      person('Courtyard formation ' + (row * 3 + column + 1), 'guard', x, z, Math.PI, row ? 'march' : 'idle');
    }
  }
  person('Workshop technician', 'crew', -42.0, 33.2, -.81);
  person('Service shed technician', 'crew', -31.6, -27.95, -.61);
  person('Garage checkpoint guard', 'guard', 51.78, 40.3, -.45);
  person('Lookout checkpoint guard', 'guard', lookout.x - 1.24, lookout.z - 1.51, .18, 'idle', null, lookout.height);
  person('Tank mechanic', 'crew', repairTank.x + 3.03, repairTank.z + .35, -Math.PI / 2);
  person('Flight line ground crew', 'crew', 41.0, -22.05, -1.75);
  person('Field medic', 'medic', 23.1, 4.64, .28);
  person('Ambulance medic', 'medic', 33.9, 8.15, -.63);
  person('Logistics crew', 'crew', 48.05, 11.71, .44);

  const hall=kit.scene.getObjectByName('Barracks 01');
  const sleeperModel=person('Barracks sleeping soldier','guard',-4.06,4.53,0,'sleep',null,.915,hall);
  const {npc,core,head,arms,legs}=sleeperModel;
  const localPoint=new kit.THREE.Vector3(-2.65,.135,3.75);
  hall.updateWorldMatrix(true,false);hall.localToWorld(localPoint);
  let wakeTime=-1;
  function poseSleeper(dt) {
    if(wakeTime>=0)wakeTime=Math.min(1.3,wakeTime+dt);
    const a=Math.max(0,Math.min(1,wakeTime/.55));
    const b=Math.max(0,Math.min(1,(wakeTime-.55)/.45));
    npc.position.set(-4.06+1.31*a,.135+.78*(1-a),4.53-.78*a);
    npc.rotation.set(-Math.PI/2*(1-a),Math.PI/2*a,0,'YXZ');
    core.position.y=.79;head.rotation.set(0,0,0);
    for(const leg of legs)leg.rotation.x=-Math.PI/2*a*(1-b);
    for(const [i,arm] of arms.entries()){
      arm.rotation.set(0,0,i===0?-.08:.08);
      arm.getObjectByName('Elbow').quaternion.identity();
    }
    if(wakeTime>=1) salutePose(arms,Math.min(1,(wakeTime-1)/.22));
  }
  poseSleeper(0);
  const sleeper={point:{x:localPoint.x,y:localPoint.y,z:localPoint.z},wake(){if(wakeTime<0)wakeTime=0;},get ready(){return wakeTime>=1.25;}};
  return {
    sleeper,
    cue(name, type) {
      gestures.set(name, { type, time: 0, duration: type === 'salute' ? Infinity : 1.12 });
    },
    reset() { gestures.clear(); wakeTime=-1; poseSleeper(0); },
    update(time, dt) {
      for (const [name, gesture] of gestures) {
        gesture.time = gesture.type === 'salute' ? Math.min(.30,gesture.time+dt) : gesture.time+dt;
        if (gesture.time >= gesture.duration) gestures.delete(name);
      }
      for (const pose of poses) pose(time);
      poseSleeper(dt);
    },
  };
}
