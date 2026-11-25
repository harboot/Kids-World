import { EYE_HEIGHT } from '../../core/player.js';
import { masonryKit } from './masonry.js';

export const lipstickPosition = Object.freeze({x:-23.27,y:0,z:-1.25});
export function buildLipstickGirl(THREE,scene,layout,onEncounter=()=>{}) {
  function group(parent,name,x=0,y=0,z=0){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}
  function batch(parent,fn){const k=masonryKit(THREE,parent);fn(k);k.finish();}
  const skin=0xc99470,blue=0x394eb0,ruffle=0x5366c6,hair=0x272324;
  const root=group(scene,'Lipstick Girl',lipstickPosition.x,lipstickPosition.y,lipstickPosition.z);
  root.rotation.y=Math.PI/2;
  const upper=group(root,'Crouching torso',0,.47,-.12);
  // One connected skirt follows the crouch instead of overlapping hip/thigh balls.
  const skirtRings=[ // height, half width, half depth, center Z
    [.15,.155,.18,-.045],[.205,.223,.255,-.005],[.29,.253,.31,.026],
    [.375,.247,.285,.035],[.44,.202,.206,-.012],[.49,.16,.118,-.095],
    [.51,.155,.112,-.12],
  ];
  const skirtPos=[],skirtIdx=[],segments=20;
  for(const [y,w,d,z] of skirtRings)for(let j=0;j<segments;j++){
    const a=j*Math.PI*2/segments,fold=1+.025*Math.cos(6*a);
    skirtPos.push(w*Math.sin(a)*fold,y+.018*Math.cos(a),z+d*Math.cos(a)*fold);
  }
  for(let i=0;i<skirtRings.length-1;i++)for(let j=0;j<segments;j++){
    const a=i*segments+j,b=i*segments+(j+1)%segments,c=b+segments,d=a+segments;
    skirtIdx.push(a,b,c,a,c,d);
  }
  for(let j=1;j<segments-1;j++)skirtIdx.push(0,j+1,j,(skirtRings.length-1)*segments,(skirtRings.length-1)*segments+j,(skirtRings.length-1)*segments+j+1);
  const skirtGeo=new THREE.BufferGeometry();skirtGeo.setAttribute('position',new THREE.Float32BufferAttribute(skirtPos,3));skirtGeo.setIndex(skirtIdx);skirtGeo.computeVertexNormals();
  const skirtMesh=new THREE.Mesh(skirtGeo,new THREE.MeshStandardMaterial({color:blue,roughness:.94,flatShading:true}));skirtMesh.name='Continuous crouching skirt';skirtMesh.castShadow=true;root.add(skirtMesh);
  batch(root,({oval})=>{
    for(const s of [-1,1]){
      oval(skin,s*.14,.215,.24,.132,.21,.15,0,0,s*.12);
      oval(skin,s*.12,.12,.13,.12,.15,.25,0,.35,s*.1);
      oval(0x40323a,s*.12,.055,.085,.17,.10,.29);
    }
  });
  batch(upper,({oval,drum})=>{
    oval(blue,0,.19,0,.36,.45,.23);oval(blue,0,.035,0,.32,.15,.24);
    oval(skin,0,.365,.024,.27,.17,.20);drum(skin,0,.444,0,.105,.13,.105);
    for(const s of [-1,1])for(let j=0;j<5;j++)oval(ruffle,s*(.116+j*.009),.32+j*.023,.09-.026*j,.092,.085,.10,0,0,s*.25);
  });
  // Tapered connected arm sections, palms and individually shaped fingers.
  const limbMat=new THREE.MeshStandardMaterial({color:skin,roughness:.9,flatShading:true});
  function limb(parent,name,sections){
    const p=[],ix=[],n=8;
    for(let i=0;i<sections.length;i++){
      const [x,y,z,rx,rz]=sections[i],before=sections[Math.max(0,i-1)],after=sections[Math.min(sections.length-1,i+1)];
      const axis=new THREE.Vector3(after[0]-before[0],after[1]-before[1],after[2]-before[2]).normalize();
      const u=new THREE.Vector3(1,0,0).addScaledVector(axis,-axis.x).normalize(),v=new THREE.Vector3().crossVectors(axis,u);
      for(let j=0;j<n;j++){const a=j*2*Math.PI/n;p.push(x+u.x*rx*Math.cos(a)+v.x*rz*Math.sin(a),y+u.y*rx*Math.cos(a)+v.y*rz*Math.sin(a),z+u.z*rx*Math.cos(a)+v.z*rz*Math.sin(a));}
    }
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=b+n,d=a+n;ix.push(a,b,c,a,c,d);}
    for(let j=1;j<n-1;j++)ix.push(0,j+1,j,(sections.length-1)*n,(sections.length-1)*n+j,(sections.length-1)*n+j+1);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();const m=new THREE.Mesh(g,limbMat);m.name=name;m.castShadow=true;parent.add(m);
  }
  for(const s of [-1,1]){
    const arm=group(upper,'Crouching arm '+s);
    limb(arm,'Tapered arm',[[s*.172,.325,.012,.050,.048],[s*.203,.245,.046,.046,.041],[s*.222,.14,.105,.037,.037],[s*.205,.101,.175,.041,.034],[s*.164,.048,.274,.028,.026]]);
    const hand=group(arm,'Hand '+s,s*.164,.048,.274);
    limb(hand,'Palm',[[0,0,0,.028,.022],[-s*.009,-.009,.032,.039,.020],[-s*.011,-.014,.057,.034,.016]]);
    for(let j=0;j<4;j++){
      const x=s*(j-1.5)*.016-.010*s,l=[.044,.052,.048,.038][j];
      limb(hand,'Finger '+(j+1),[[x,-.013,.048,.009,.010],[x+s*(j-1.5)*.003,-.020,.048+l*.60,.008,.008],[x+s*(j-1.5)*.004,-.031,.048+l,.005,.005]]);
    }
    limb(hand,'Thumb',[[-s*.031,-.004,.014,.012,.012],[-s*.045,-.011,.036,.010,.009],[-s*.044,-.021,.058,.007,.007]]);
  }
  const head=group(upper,'Lipstick Girl head',0,.49,0);
  // A continuous facial profile with a soft tapered jaw.
  const rings=[[-.012,.022,.028,.018],[.012,.062,.059,.022],[.047,.091,.083,.015],[.09,.112,.101,.008],[.14,.12,.112,0],[.19,.118,.105,-.003],[.24,.105,.092,-.008],[.285,.075,.067,-.012],[.31,.015,.018,-.012]];
  function profile(y){let i=1;while(i<rings.length-1&&y>rings[i][0])i++;const a=rings[i-1],b=rings[i],t=Math.max(0,Math.min(1,(y-a[0])/(b[0]-a[0])));return a.slice(1).map((v,j)=>v+(b[j+1]-v)*t);}
  function shell(name,paint,levels,point){const p=[],idx=[],n=24;for(let i=0;i<levels;i++)for(let j=0;j<n;j++)p.push(...point(i,j*2*Math.PI/n));for(let i=0;i<levels-1;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=b+n,d=a+n;idx.push(a,b,c,a,c,d);}for(let j=1;j<n-1;j++)idx.push(0,j+1,j,(levels-1)*n,(levels-1)*n+j,(levels-1)*n+j+1);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:paint,roughness:.9}));mesh.name=name;mesh.castShadow=true;head.add(mesh);}
  shell('Oval face',skin,rings.length,(i,a)=>{const [y,w,d,z]=rings[i];return [w*Math.sin(a),y,z+d*Math.cos(a)];});
  shell('Side-parted dark hair',hair,7,(i,a)=>{const f=(1+Math.cos(a))/2,y0=.047+.184*f**3+.028*Math.sin(a)*f**2,y=y0+(.31-y0)*i/6,[w,d,z]=profile(y);return [(w+.009)*Math.sin(a),y+.007,z+(d+.009)*Math.cos(a)];});
  batch(head,({oval})=>{for(const s of [-1,1])oval(skin,s*.119,.135,-.003,.037,.070,.04);oval(hair,0,.092,-.128,.11,.12,.095);oval(hair,0,-.043,-.15,.12,.29,.12);});
  const surface=(x,y)=>{const [w,d,z]=profile(y);return z+d*Math.sqrt(Math.max(0,1-(x/w)**2));};
  function patch(parent,name,paint,outline,cx,cy,raise=.007,edge=.004){const p=[cx,cy,surface(cx,cy)+raise],ix=[];for(const [x,y] of outline)p.push(x,y,surface(x,y)+edge);for(let i=0;i<outline.length;i++)ix.push(0,i+1,(i+1)%outline.length+1);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();const m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:paint,roughness:.88,side:THREE.DoubleSide}));m.name=name;parent.add(m);}
  function eye(x,y,w,h){return [[x-w,y],[x-w*.55,y+h*.7],[x,y+h],[x+w*.55,y+h*.7],[x+w,y],[x+w*.55,y-h*.65],[x,y-h],[x-w*.55,y-h*.65]];}
  const calm=group(head,'Sad resting expression'),cry=group(head,'Crying expression');
  for(const [face,open] of [[calm,false],[cry,true]]){
    for(const s of [-1,1]){const x=s*.054,y=.167,h=open?.017:.010;patch(face,'Eye outline',0x563b31,eye(x,y,.033,h+.003),x,y);patch(face,'Eye white',0xf4e4d3,eye(x,y,.029,h),x,y,.010,.007);patch(face,'Brown pupil',0x35271e,eye(x,y+.002,.011,.011),x,y+.002,.013,.010);const inner=open?.225:.209;patch(face,'Worried eyebrow',0x4a332a,[[s*.023,inner],[s*.048,.213],[s*.081,.195],[s*.082,.188],[s*.047,.205],[s*.023,inner-.006]],s*.048,.207,.007,.005);}
    // Raised vermilion lip ring: a thick rounded rim around the actual mouth opening.
    const mouthY=.062,outerW=open?.053:.047,outerH=open?.037:.023,innerW=open?.032:.032,innerH=open?.019:.003;
    const lp=[],li=[],n=32;
    for(let i=0;i<4;i++)for(let j=0;j<n;j++){
      const a=j*Math.PI*2/n,t=i/3,x=(innerW+(outerW-innerW)*t)*Math.cos(a);
      const y=mouthY+(innerH+(outerH-innerH)*t)*Math.sin(a)+(Math.sin(a)>0?.004*Math.cos(2*a)*t:0);
      const raise=[.012,.032,.029,.004][i]*(open?1:.88);
      lp.push(x,y,surface(x,y)+raise);
    }
    for(let i=0;i<3;i++)for(let j=0;j<n;j++){const a=i*n+j,b=i*n+(j+1)%n,c=b+n,d=a+n;li.push(a,b,c,a,c,d);}
    const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));lg.setIndex(li);lg.computeVertexNormals();
    const lips=new THREE.Mesh(lg,new THREE.MeshStandardMaterial({color:0xe32236,roughness:.46,side:THREE.DoubleSide}));lips.name='Full swollen red lips';face.add(lips);
    patch(face,open?'Open crying mouth':'Closed mouth line',0x4c2026,eye(0,mouthY,innerW+.002,innerH+.002),0,mouthY,.009,.008);
    if(open)patch(face,'Visible upper teeth',0xf4e5d4,[[-.023,.070],[0,.077],[.023,.070],[.020,.064],[-.020,.064]],0,.070,.015,.012);
  }
  patch(head,'Small sculpted nose',skin,[[0,.155],[.012,.12],[.015,.099],[0,.093],[-.015,.099],[-.012,.12]],0,.112,.023,.003);
  const tears=group(head,'Falling tears');const tearMat=new THREE.MeshStandardMaterial({color:0xa8d9f4,roughness:.28});const tearGeo=new THREE.SphereGeometry(1,8,5);
  for(let i=0;i<4;i++){const drop=new THREE.Mesh(tearGeo,tearMat);drop.scale.set(.009,.017,.006);tears.add(drop);}
  layout.solid(lipstickPosition.x,lipstickPosition.z,.59,.64,1.25);
  let time=0,blend=0,yaw=0,elapsed=0;const target=new THREE.Vector3();
  function reset(){time=blend=yaw=elapsed=0;head.rotation.set(.30,0,0);upper.rotation.set(.12,0,0);calm.visible=true;cry.visible=tears.visible=false;}
  function update(dt,player){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.1);time+=dt;
    const near=!!player&&Math.abs(player.y-EYE_HEIGHT)<.8&&Math.hypot(player.x-root.position.x,player.z-root.position.z)<3.0;
    if(near){target.set(player.x,player.y,player.z);root.worldToLocal(target);const angle=Math.atan2(target.x,target.z);yaw+=(Math.max(-1.25,Math.min(1.25,angle))-yaw)*(1-Math.exp(-8*dt));elapsed+=dt;if(elapsed>=.65)onEncounter('lipstick');}
    else{yaw*=Math.exp(-6*dt);elapsed=0;}
    blend+=((near?1:0)-blend)*(1-Math.exp(-7*dt));
    head.rotation.set(.30-.83*blend+.035*blend*Math.sin(time*12),yaw,.045*blend*Math.sin(time*8));upper.rotation.x=.12+.035*blend*Math.sin(time*12);
    cry.visible=tears.visible=blend>.42;calm.visible=!cry.visible;
    for(let i=0;i<tears.children.length;i++){const s=i%2?1:-1,t=(time*1.25+Math.floor(i/2)*.5)%1,x=s*(.055+.025*t),y=.148-.095*t;tears.children[i].position.set(x,y,surface(x,y)+.011);}
  }
  reset();return {root,reset,update,get crying(){return cry.visible;}};
}
