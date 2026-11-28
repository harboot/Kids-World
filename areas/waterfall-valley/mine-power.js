import { detailKit } from './detail-kit.js';
import { smooth } from './landform.js';

export function createMinePower({ THREE, scene, mine, generator, rockSurfaces, reducedMotion }) {
  const sites = [
    [[-19.3,-28.1],[-20.9,-34.3],[20.7,-31.5],[24.9,-33.5]],
    [[-28.2,-82.3],[-23.1,-82.8],[1,-70]],
    [[-33.9,-48.1],[-19.2,-55.2],[22.7,-62.8],[38.7,-54.3]],
  ];
  const tint = new THREE.Color(0xffcd83);
  const stages = sites.map((points,index) => {
    const material = new THREE.MeshBasicMaterial({ color:0x6b6254,toneMapped:false });
    const geometry = new THREE.CylinderGeometry(0.14,0.14,0.19,8);
    const cluster = new THREE.InstancedMesh(geometry,material,points.length);
    cluster.name=['Mine station industrial lamps','Mine workshop industrial lamps','Mine tunnel industrial lamps'][index];
    const kit = detailKit(THREE,scene,true);
    const dummy = new THREE.Object3D();
    const records=points.map(([x,z],i)=>{
      const y=mine.ceiling.sample(x,z)-0.49;
      dummy.position.set(x,y,z);
      dummy.updateMatrix();cluster.setMatrixAt(i,dummy.matrix);
      kit.part('cylinder',0x514c49,x,y+0.126,z,.43,.08,.43);
      kit.beam(0x54504c,[x,y+.19,z],[x,y+.52,z],.054);
      return {x,y,z};
    });
    scene.add(cluster);
    kit.finish();
    return {material,records};
  });

  const buffers = rockSurfaces.map(mesh => {
    const p = mesh.geometry.getAttribute('position'), colors = mesh.geometry.getAttribute('color');
    const initial = colors.array.slice();
    const night = stages.map(({records})=>{
      const points=[];
      for(let i=0;i<p.count;i++){
        const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
        let light=0;
        for(const lamp of records){
          if(Math.abs(x-lamp.x)>7 || Math.abs(z-lamp.z)>7)continue;
          const gap=Math.hypot(x-lamp.x,(y-lamp.y)*0.84,z-lamp.z);
          light=Math.max(light,(1-smooth(.65,6.8,gap))*.53);
        }
        if(light>.015)points.push([i*3,light]);
      }
      return points;
    });
    return {colors,initial,night};
  });

  const rotor = new THREE.Group();
  rotor.name='Generator spinning pulley';
  rotor.position.set(.62,.717,.57);
  const machinery=detailKit(THREE,rotor,true);
  machinery.part('ring',0x8f8874,0,0,0,.73,.73,.52);
  machinery.part('cylinder',0x837867,0,0,.08,.23,.15,.23,0,Math.PI/2);
  for(let i=0;i<4;i++)machinery.box(0xa18e62,0,0,0,.09,.57,.065,0,0,i*Math.PI/4);
  machinery.finish(true);
  const base=detailKit(THREE,generator,true);
  base.box(0x3f4441,.62,.714,.535,.82,.82,.025);
  base.finish();
  generator.add(rotor);

  let elapsed = 0, active = false, stage = 0;
  function lighting(count) {
    stage=count;
    stages.forEach(({material},i)=>{material.color.setHex(i<count?0xffe7ad:0x6b6254);});
    for(const {colors,initial,night} of buffers) {
      const array=colors.array;
      array.set(initial);
      for(let i=0;i<count;i++)for(const [offset,strength] of night[i]){
        array[offset]+=(tint.r-array[offset])*strength;
        array[offset+1]+=(tint.g-array[offset+1])*strength;
        array[offset+2]+=(tint.b-array[offset+2])*strength;
      }
      colors.needsUpdate=true;
    }
  }
  return {
    get started(){return active;},
    get ready(){return stage===stages.length;},
    start(){if(!active){active=true;elapsed=0;}},
    update(dt) {
      if(!active)return;
      elapsed+=dt;
      const count=Number(elapsed>=0.52)+Number(elapsed>=1.03)+Number(elapsed>=1.58);
      if(count!==stage)lighting(count);
      const speed=smooth(0,0.83,elapsed)*15;
      if(!reducedMotion())rotor.rotation.z=(rotor.rotation.z+speed*dt)%(Math.PI*2);
    },
    reset(){elapsed=0;active=false;rotor.rotation.z=0;lighting(0);},
  };
}
