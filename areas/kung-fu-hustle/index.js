import { metadata } from './metadata.js';
import { music } from './music.js';
import { courtyardLayout } from './layout.js';
import { buildHandOfGod } from './hand-of-god.js';
import { buildCourtyard } from './scene.js';
import { createKungFuMissions } from './missions.js';

export default {
  ...metadata,
  music,
  load({ THREE, scene, touch, camera, viewmodel, playCue, completeLevel, isLevelComplete, notify }) {
    const layout = courtyardLayout();
    const progress = createKungFuMissions({completeLevel,isLevelComplete,notify,playCue});
    let cinematic;
    const courtyard = buildCourtyard(THREE, scene, layout, touch, viewmodel, camera, playCue, id=>{
      if(cinematic?.state==='idle')progress.complete(id);
    });
    cinematic = buildHandOfGod({ THREE, scene, camera, viewmodel, beast: courtyard.beast, setCraterOpen: courtyard.setCraterOpen });
    const activities = [
      ['book',()=>cinematic.state!=='idle'],
      ['sauce',()=>courtyard.sauce.state!=='idle'],
      ['donut',()=>courtyard.donut.eating],
      ['dance',()=>courtyard.axeGang.dancing],
      ['harpists',()=>courtyard.harpists.playing],
      ['fong',()=>courtyard.fong.kissing],
    ];
    function reset(){
      cinematic.reset();courtyard.coolie.reset();courtyard.sauce.reset();courtyard.donut.reset();
      courtyard.axeGang.reset();courtyard.harpists.reset();courtyard.fong.reset();progress.reset();
    }
    return {
      obstacles: layout.obstacles,
      jumpSpeed: 7.65,
      fallGravity: 36,
      interactions: [cinematic.trigger, courtyard.sauce.trigger, courtyard.donut.trigger, courtyard.axeGang.trigger, courtyard.harpists.trigger, courtyard.fong.trigger],
      reset,
      unload: reset,
      update(dt, player) {
        const running=activities.map(([,busy])=>busy());
        courtyard.update(dt, player);cinematic.update(dt, player);
        for(let i=0;i<activities.length;i++)if(running[i]&&!activities[i][1]())progress.complete(activities[i][0]);
      },
      getGroundHeight: layout.getGroundHeight,
      getCeilingHeight: layout.getCeilingHeight,
      blocksGround: layout.blocksGround,
      canDropFrom: layout.canDropFrom,
      missionStatus: progress.status,
    };
  },
};
