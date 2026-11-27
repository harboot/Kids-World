// Original short interaction effects for the gallery. The shared engine owns
// playback, spatial attenuation, mute, volume and cancellation on area exit.
const note = (pitch, duration, level, offset = 0, extra = {}) =>
  [pitch, { duration, level, ...extra }, offset];
const chime = (pitches, gap=.12, level=.085) =>
  pitches.map((p,i)=>note(p,.36,level,i*gap));
const noise = (pitch,endPitch,duration,level,offset=0) =>
  note(pitch,duration,level,offset,{endPitch,wave:'noise',attack:.016});
export const galleryCues = {
  rapunzel: chime([76,81,84],.12,.075),
  snow: [note(72,.18,.07,0,{wave:'triangle'}),note(76,.20,.07,.11),note(79,.26,.07,.22)],
  aurora: chime([65,69,72,77],.16,.075),
  cinderella: chime([84,88,91],.09,.075),
  ariel: [noise(63,80,.30,.07),note(70,.22,.075,.10,{endPitch:77}),note(82,.32,.065,.24)],
  chestOpen: [noise(51,39,.17,.10),...chime([79,83,86],.10,.07).map(([p,n,t])=>[p,n,t+.12])],
  chestClose: [noise(47,30,.15,.09),note(43,.12,.075,.09,{wave:'triangle'})],
  belle: [note(79,.14,.075),note(84,.12,.07,.15),note(76,.12,.07,.28),note(81,.29,.075,.40)],
  tiana: [note(46,.15,.10,0,{endPitch:39,wave:'triangle'}),note(52,.15,.07,.12,{endPitch:43,wave:'triangle'}),...chime([72,76,81],.12,.075).map(([p,n,t])=>[p,n,t+.24])],
  moanaDepart: [noise(53,64,.65,.09),note(60,.23,.075,0,{wave:'triangle'}),note(67,.25,.07,.20,{wave:'triangle'})],
  moanaWave: [noise(58,43,.65,.065),noise(62,49,.45,.045,.24)],
  moanaArrive: [noise(52,41,.46,.07),...chime([67,72],.15,.07)],
  liftStart: [note(62,.13,.09),noise(42,32,.40,.08,.08),note(39,.42,.055,.18,{wave:'triangle',endPitch:45})],
  liftMotor: [note(34,.65,.042,0,{wave:'triangle',endPitch:35}),noise(35,32,.65,.035)],
  liftArrive: [noise(41,32,.27,.055),...chime([76,81],.12,.075)],
  popcorn: [noise(81,64,.08,.13),noise(76,57,.07,.10,.085),noise(83,68,.06,.075,.16)],
  cotton: [noise(64,45,.19,.065),note(54,.10,.035,.12)],
  hotDog: [noise(62,44,.12,.10),noise(53,39,.13,.075,.13)],
  drink: [noise(65,83,.24,.065),note(64,.18,.07,0,{endPitch:77}),note(49,.10,.05,.23,{endPitch:42})],
};
export function cueSource(x,z,eyeY,range=9) {
  return { x,z,eyeY,range,near:2.5,floorTolerance:2.4 };
}
// Play once per entry. A short rearm interval suppresses chatter at trigger edges.
export function entryCue(playCue, notes, source, rearm=.65) {
  let inside=false, away=rearm;
  return {
    update(active, dt) {
      if(active) {
        if(!inside && away>=rearm) playCue(notes,source);
        inside=true; away=0;
      } else { inside=false; away=Math.min(rearm,away+Math.max(0,dt)); }
    },
    reset() { inside=false;away=rearm; },
  };
}
