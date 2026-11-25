const definitions = [
  ['coolie', 'Watch Coolie’s Kick', 'Approach Coolie and watch his kicking demonstration.'],
  ['tailor', 'Meet the Tailor', 'Approach the tailor at his shop to see his kung fu stance.'],
  ['sauce', 'Help Sauce Wash His Hair', 'Draw water from the courtyard well and let Sauce wash his hair.'],
  ['donut', 'Eat a Steamed Bun', 'Visit Donut at the bakery and take a steamed bun.'],
  ['dance', 'Dance with the Axe Gang', 'Approach Brother Sum and start the group dance.'],
  ['harpists', 'Listen to the Harpists', 'Visit the musicians on the third-floor rear gallery and play music.'],
  ['fong', 'Buy a Lollipop', 'Find Fong at the candy shop and buy a lollipop.'],
  ['landlady', 'Meet the Landlady', 'Walk past the Landlady’s window on the top-floor west gallery.'],
  ['beast', 'Meet the Beast', 'Approach the Beast from the front in the courtyard.'],
  ['lipstick', 'Meet Lipstick Girl', 'Find the crouching woman in a blue dress on the west side of the courtyard.'],
  ['book', 'Discover the Buddha Palm', 'Find and open the book on the third-floor east gallery.'],
];
const victory = [[67,{duration:.24,level:.12}],[72,{duration:.24,level:.12},.14],[79,{duration:.40,level:.13},.29]];

export function createKungFuMissions({completeLevel,isLevelComplete,notify,playCue}={}) {
  const done=new Set();
  const missions=definitions.map(([id,title])=>({id,title,total:1,
    get current(){return Number(done.has(id));},get complete(){return done.has(id);}}));
  const status={missions,get hint(){return definitions.find(([id])=>!done.has(id))?.[2]??'Kung Fu Hustle complete!';}};
  function complete(id){
    const mission=missions.find(m=>m.id===id);
    if(!mission||done.has(id))return false;
    done.add(id);
    if(done.size===missions.length){
      if(!isLevelComplete?.('kung-fu-hustle'))completeLevel?.('kung-fu-hustle');
      playCue?.(victory);
      notify?.('Kung Fu Hustle complete!');
    }else notify?.(`${mission.title} complete!`);
    return true;
  }
  return {status,complete,reset(){done.clear();}};
}
