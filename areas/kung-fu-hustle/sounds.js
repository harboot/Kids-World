// Original procedural effects, not sampled dialogue or film audio.
// Each event is dispatched once at an animation landmark. Phase 1 uses a
// simple audible-radius/floor gate, not continuous spatial audio.
const n=(pitch,endPitch,duration,level,attack=.012,q=.8,filter='bandpass')=>[pitch,{wave:'noise',endPitch,duration,level,attack,q,filter}];
const t=(pitch,endPitch,duration,level,wave='triangle',attack=.012)=>[pitch,{wave,endPitch,duration,level,attack}];
const at=(note,offset)=>[...note,offset];
export const sounds=Object.freeze({
  squat:[n(67,54,.21,.055,.035),t(43,38,.17,.035)],
  kickReady:[t(45,50,.15,.08,'triangle'),n(61,72,.13,.045)],
  kick:[n(58,94,.24,.19,.032,.7),t(54,69,.13,.075,'triangle',.009),at(t(69,51,.10,.06),.11)],
  kickLand:[t(40,28,.12,.10),n(65,45,.10,.05)],
  tailorRings:[t(88,85,.27,.07,'sine',.003),t(98,95,.19,.045,'sine',.003),at(t(93,91,.24,.06,'sine',.003),.075),n(79,66,.20,.08)],
  bucketDraw:[n(59,48,.35,.09,.035,2),t(53,45,.23,.045),at(n(62,49,.3,.06,.02,2),.40)],
  bucketSet:[t(48,35,.12,.11),n(80,60,.15,.08)],
  waterPour:[n(90,79,.46,.14,.035,.65),at(n(75,95,.20,.055,.02,.8),.15),at(t(83,71,.07,.035,'sine'),.22)],
  scrub:[n(81,67,.13,.04),at(n(68,82,.12,.04),.14)],
  dough:[t(46,33,.10,.065),n(65,45,.09,.045)],
  bunTake:[t(76,79,.11,.07,'sine'),at(t(81,81,.16,.055,'sine'),.09)],
  bite:[n(91,65,.11,.11,.006,1.3),at(n(75,59,.12,.065,.006,1.2),.14),at(n(72,58,.10,.045),.28)],
  danceStep:[t(43,30,.105,.085),n(70,50,.09,.06,.004)],
  kiss:[t(76,76,.15,.10,'sine'),at(t(81,81,.20,.09),.12),at(n(91,64,.085,.15,.006,2),.40),at(t(79,91,.24,.085,'sine'),.46),at(t(86,86,.25,.06,'sine'),.61)],
  laundry:[n(77,60,.24,.07,.035,.75)],
  landlady:[t(51,57,.17,.06,'triangle',.035),at(t(56,50,.14,.045),.12)],
  croak:[t(40,33,.21,.13,'sawtooth',.035),at(t(38,29,.24,.085,'triangle',.025),.13),n(49,36,.28,.05,.04,1.7)],
  sob:[t(69,62,.22,.065,'triangle',.045),n(78,66,.19,.045,.035,1.5),at(t(67,60,.27,.065,'sine',.045),.29)],
});
export function createCharacterSounds(playCue=()=>{}) {
  let listener=null;
  return {
    setListener(player){listener=player&&Number.isFinite(player.x)&&Number.isFinite(player.y)&&Number.isFinite(player.z)?player:null;},
    reset(){listener=null;},
    play(name, position, range=5, eyeY=1.68){
      const cue=sounds[name];
      if(!listener||!cue||!position||Math.abs(listener.y-eyeY)>1.1||Math.hypot(listener.x-position.x,listener.z-position.z)>range)return false;
      return playCue(cue);
    },
  };
}
