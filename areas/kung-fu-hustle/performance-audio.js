// Original music and sound design; no sampled film audio.
const tone=(pitch,endPitch,duration,level,wave='triangle',attack=.009,offset=0)=>[pitch,{endPitch,duration,level,wave,attack},offset];
const noise=(pitch,endPitch,duration,level,attack=.015,q=.8,offset=0)=>[pitch,{wave:'noise',endPitch,duration,level,attack,q},offset];
const melody=[67,70,72,75,74,72,70,67,65,69,72,69,67,70,74,67];
const bass=[43,43,43,43,48,48,48,48,41,41,41,41,43,43,43,43];
export const danceMusic=Object.freeze(melody.map((p,i)=>[
  tone(bass[i],bass[i],.27,.13),tone(p,p,.19,.12),
  tone(p+12,p+12,.12,.025,'sine'),
  tone(p+(i%4===3?-3:2),p+(i%4===3?-3:2),.16,.075,'triangle',.012,.28),
  tone(i%2?45:35,29,.12,.12,'sine',.005),
  noise(i%2?86:66,51,.105,.065,.004,1.2),noise(96,82,.06,.035,.003,.7,.28),
]));
export function harpistPluck(p){
  return [tone(p,p,.48,.16,'triangle',.004),tone(p+12,p+12,.24,.065,'sine',.003),
    tone(p+19,p+19,.11,.035,'sine',.002),tone(p+.55,p,.16,.035,'triangle',.003),
    noise(91,62,.035,.027,.002,1.7),noise(64,86,.27,.045,.045,.8,.085),
    tone(p,p,.19,.025,'sine',.012,.18)];
}
export const cinematicCues=Object.freeze({
  'book-rise': [tone(74,74,.40,.10,'sine'),tone(81,81,.55,.095,'triangle',.015,.18),tone(86,86,.65,.08,'sine',.02,.40)],
  lift: [noise(58,80,1,.11,.12),tone(43,55,.95,.07,'sine',.08)],
  wind: [noise(64,82,.98,.10,.12),tone(50,57,.83,.045,'sine',.08)],
  aim: [tone(45,65,.76,.15,'triangle',.07),tone(57,81,.72,.07,'sine',.06),noise(63,91,.65,.075,.09)],
  dive: [noise(55,99,1.22,.21,.045),tone(42,76,1.1,.12,'triangle',.025)],
  impact: [tone(37,19,.80,.22,'sine',.006),noise(58,35,.90,.18,.008),noise(93,48,.62,.12,.006),tone(27,19,.95,.10,'triangle',.008,.10)],
  rubble: [noise(63,40,.33,.10,.009,1.1),tone(36,24,.35,.065,'triangle',.01),noise(81,55,.16,.055,.009,1.4,.15)],
  rumble: [tone(29,23,.90,.075,'sine',.09),noise(48,36,.90,.055,.10)],
});
