import { seededRandom } from '../../core/random.js';
import { PLAYER_ONLY_LAYER } from '../../core/render-layers.js';
import { approach } from './ride.js';
import { mix, smooth } from './landform.js';

const transitionSeconds = 2.45;

export function createCampfire({ THREE, scene, hearth, sky, sun, reducedMotion, touch }) {
  const random = seededRandom(4153);
  const daytime = {
    background: scene.background.clone(), fog: scene.fog.color.clone(),
    fogNear: scene.fog.near, fogFar: scene.fog.far,
    sun: sun.intensity, sky: sky.intensity, zenith: sky.color.clone(), ground: sky.groundColor.clone(),
  };
  const nighttime = {
    background: new THREE.Color(0x081630), fog: new THREE.Color(0x253657),
    zenith: new THREE.Color(0x8ba8e8), ground: new THREE.Color(0x4b536e),
  };
  const caveFog = new THREE.Color(0x293941);
  const clouds = scene.getObjectByName('Faceted clouds')?.material;
  const cloudDay = clouds?.color.clone();
  const cloudNight = new THREE.Color(0x223250);
  const waterTints = [
    ['Lake and downstream water',0x6882ac], ['Clear water over trout shoals',0x7793bc],
    ['Animated waterfall ribbons',0x859dca], ['Whitewater, splash and lake ripples',0x8195b9],
    ['Waterfall spray',0x65769e],
  ].map(([name,color])=>{
    const material=scene.getObjectByName(name).material;
    return {material,day:material.color.clone(),night:new THREE.Color(color)};
  });
  const moonlight = new THREE.DirectionalLight(0x8eafff, 0);
  moonlight.name = 'Valley moonlight';
  moonlight.position.set(26, 50, -43);
  const glow = new THREE.PointLight(0xffa659, 0, 11, 2);
  glow.name = 'Campfire warm light';
  glow.position.copy(hearth.position);
  glow.position.y += 0.65;
  scene.add(moonlight, glow);

  const celestial = new THREE.Group();
  celestial.name = 'Valley night sky';
  const skyPoints = [];
  for (let i = 0; i < (touch ? 66 : 118); i++) {
    const angle = random() * Math.PI * 2, y = 0.08 + random() * 0.91;
    const r = Math.sqrt(1-y*y)*100;
    skyPoints.push(Math.cos(angle)*r,y*100,Math.sin(angle)*r);
  }
  const dots = new THREE.BufferGeometry();
  dots.setAttribute('position', new THREE.Float32BufferAttribute(skyPoints,3));
  const starMaterial = new THREE.PointsMaterial({
    color:0xd3deff, size:1.65, sizeAttenuation:false, transparent:true, depthWrite:false, fog:false, toneMapped:false,
  });
  const stars = new THREE.Points(dots,starMaterial);
  stars.name = 'Valley stars';
  const moonMaterial = new THREE.MeshBasicMaterial({
    color:0xe2e7ee, fog:false, toneMapped:false, transparent:true, depthWrite:false,
  });
  const moon = new THREE.Mesh(new THREE.IcosahedronGeometry(3.15,1), moonMaterial);
  moon.name = 'Valley moon';
  moon.position.set(11,38,-75);
  celestial.add(stars,moon);
  celestial.traverse(node=>node.layers.set(PLAYER_ONLY_LAYER));
  scene.add(celestial);

  const fire = new THREE.Group();
  fire.name = 'Campfire flames and smoke';
  fire.position.copy(hearth.position);
  scene.add(fire);
  const flameGeometry = new THREE.ConeGeometry(1, 1, 6, 1, true);
  flameGeometry.translate(0,0.5,0);
  const flames = new THREE.InstancedMesh(flameGeometry, new THREE.MeshBasicMaterial({
    color:0xffffff, side:THREE.DoubleSide, toneMapped:false,
  }), 7);
  const ember = new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),
    new THREE.MeshBasicMaterial({color:0xffa248,toneMapped:false}),touch?8:14);
  const smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
    new THREE.MeshBasicMaterial({color:0x787c8a,transparent:true,opacity:0.17,depthWrite:false}),touch?4:7);
  for(const mesh of [flames,ember,smoke]){
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled=false;
    fire.add(mesh);
  }
  const palette = [0xff651f,0xff8e2a,0xffbf42,0xff7c29,0xffcc5b,0xff9e32,0xffe28a];
  palette.forEach((color,i)=>flames.setColorAt(i,new THREE.Color(color)));
  const motion = Array.from({length:ember.count},()=>({
    x:random()-0.5,z:random()-0.5,phase:random(),speed:0.55+random()*0.51,
  }));
  const dummy = new THREE.Object3D();
  let lit = false, amount = 0, age = 0;

  function animate() {
    const still = reducedMotion();
    const t = still ? 0.51 : age;
    for(let i=0;i<flames.count;i++){
      const phase=t*(3.7+i*.31)+i*2.59, spread=i===6?0:0.2;
      dummy.position.set(Math.cos(i*2.39)*spread,0.16,Math.sin(i*2.39)*spread);
      dummy.rotation.set(0.16*Math.sin(phase),phase,0.14*Math.cos(phase));
      dummy.scale.set(0.13+0.035*Math.cos(phase),0.25+(i%3)*0.09+0.09*Math.sin(phase),0.13);
      dummy.updateMatrix();flames.setMatrixAt(i,dummy.matrix);
    }
    flames.instanceMatrix.needsUpdate=true;
    ember.visible=smoke.visible=!still;
    if(!still){
      for(let i=0;i<ember.count;i++){
        const p=motion[i], u=(age*p.speed+p.phase)%1;
        dummy.position.set(p.x*(0.32+u),0.27+u*1.61,p.z*(0.34+u));
        dummy.rotation.set(u*6,u*5,u*4);
        dummy.scale.setScalar(0.038*(1-u));
        dummy.updateMatrix();ember.setMatrixAt(i,dummy.matrix);
      }
      for(let i=0;i<smoke.count;i++){
        const u=(age*0.51+i/smoke.count)%1;
        dummy.position.set(0.17*u+0.13*Math.sin(u*5+i),0.79+u*1.94,-0.51*u);
        dummy.rotation.set(u*2,u+i,u*1.7);
        const size=0.19+0.32*u;
        dummy.scale.set(size,size*0.66,size);
        dummy.updateMatrix();smoke.setMatrixAt(i,dummy.matrix);
      }
      ember.instanceMatrix.needsUpdate=smoke.instanceMatrix.needsUpdate=true;
    }
    glow.intensity=19+Math.sin(t*10.6)*2.1+Math.cos(t*14.1)*1.3;
  }

  function apply(inside, player) {
    const blend = smooth(0,1,amount);
    const outdoorLight=blend*(1-inside);
    scene.background.copy(daytime.background).lerp(nighttime.background,blend);
    sky.intensity=mix(daytime.sky,0.96,outdoorLight);
    sky.color.copy(daytime.zenith).lerp(nighttime.zenith,outdoorLight);
    sky.groundColor.copy(daytime.ground).lerp(nighttime.ground,outdoorLight);
    sun.intensity=mix(daytime.sun,0.15,outdoorLight);
    moonlight.intensity=outdoorLight*0.65;
    scene.fog.color.copy(daytime.fog).lerp(nighttime.fog,blend).lerp(caveFog,inside);
    scene.fog.near=mix(mix(daytime.fogNear,43,blend),15,inside);
    scene.fog.far=mix(mix(daytime.fogFar,118,blend),50,inside);
    if(clouds)clouds.color.copy(cloudDay).lerp(cloudNight,blend);
    for(const {material,day,night} of waterTints)material.color.copy(day).lerp(night,blend);
    celestial.visible=blend>0.005 && inside<0.92;
    starMaterial.opacity=blend*0.86;
    moonMaterial.opacity=blend;
    if(player)celestial.position.copy(player);
  }

  function toggle() {
    lit=!lit;
    fire.visible=lit;
    if(lit){ age=0;animate(); }
    else glow.intensity=0;
  }
  function reset() {
    lit=false;amount=age=0;
    fire.visible=false;
    glow.intensity=0;
    apply(0);
  }
  reset();
  return {
    toggle, reset,
    get lit(){return lit;},
    get nighttime(){return lit && amount===1;},
    update(dt, inside, player) {
      amount=reducedMotion()?Number(lit):approach(amount,Number(lit),dt/transitionSeconds);
      if(lit){ age=(age+dt)%600;animate(); }
      apply(inside,player);
    },
  };
}
