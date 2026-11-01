import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BASE_COLORS } from '../core/bio.js';

const LEVEL_CAMERA = {
  cell: new THREE.Vector3(0, 2.5, 9.5), nucleus: new THREE.Vector3(0, 1.6, 7.4),
  chromosome: new THREE.Vector3(0, 1.0, 6.8), dna: new THREE.Vector3(0, 0.7, 10.4), gene: new THREE.Vector3(0, 0.5, 11.5)
};
const TITLES = { cell:'Cell', nucleus:'Nucleus', chromosome:'Chromosome', dna:'DNA', gene:'Gene region' };
const COLORS = { cyan:0x53d7c6, blue:0x69a9ff, violet:0xa88bff, pink:0xff87ad, gold:0xffc96e };
function material(color, opts={}) { return new THREE.MeshStandardMaterial({color, roughness:.48, metalness:.04, ...opts}); }

export class BiologicalScene {
  constructor(container, sequence) {
    this.container=container; this.sequence=sequence; this.level='cell'; this.autoRotate=true;
    this.scene=new THREE.Scene(); this.scene.background=new THREE.Color('#0b1220');
    this.camera=new THREE.PerspectiveCamera(42,1,.1,200); this.camera.position.copy(LEVEL_CAMERA.cell);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7)); this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.08;
    this.renderer.domElement.setAttribute('aria-label','Interactive schematic biological structure. Drag to rotate and scroll to zoom.'); container.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xaac5e8,0x172037,2.0));
    const key=new THREE.DirectionalLight(0xd7efff,2.2);key.position.set(5,7,6);this.scene.add(key);
    const rim=new THREE.PointLight(0x4cd6c8,28,24);rim.position.set(-5,2,-3);this.scene.add(rim);
    this.group=new THREE.Group();this.scene.add(this.group);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.06;this.controls.minDistance=2.8;this.controls.maxDistance=22;this.controls.target.set(0,0,0);
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.setLevel('cell');this.animate();
  }
  resize(){if(!this.renderer)return;const w=Math.max(1,this.container.clientWidth),h=Math.max(1,this.container.clientHeight);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  clearGroup(){for(const child of [...this.group.children]){this.group.remove(child);child.traverse?.(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>m.dispose());}});}}
  addMesh(geometry,mat,position=[0,0,0],scale=[1,1,1]){const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(...position);mesh.scale.set(...scale);this.group.add(mesh);return mesh;}
  setLevel(level){if(!LEVEL_CAMERA[level])return;this.level=level;this.clearGroup();
    if(level==='cell')this.buildCell();else if(level==='nucleus')this.buildNucleus();else if(level==='chromosome')this.buildChromosome();else this.buildDna(level==='gene');
    this.camera.position.copy(LEVEL_CAMERA[level]);this.controls.target.set(0,0,0);this.controls.update();
  }
  buildCell(){
    this.addMesh(new THREE.SphereGeometry(2.65,48,32),material(0x2b6482,{transparent:true,opacity:.24,roughness:.28,side:THREE.DoubleSide}),[0,0,0],[1.18,.82,1]);
    this.addMesh(new THREE.SphereGeometry(2.56,40,30),material(0x42aab5,{transparent:true,opacity:.23,wireframe:true}),[0,0,0],[1.18,.82,1]);
    this.addMesh(new THREE.SphereGeometry(.95,36,28),material(COLORS.violet,{transparent:true,opacity:.68}),[.25,.05,0]);
    this.addMesh(new THREE.SphereGeometry(.35,24,18),material(0xe8b2ff,{roughness:.26}),[.25,.05,0]);
    const positions=[[-1.6,.8,.4],[1.45,.7,-.4],[-1.25,-.65,.8],[1.5,-.7,.7],[-.5,.3,-1.7],[.8,-.4,1.45]];
    positions.forEach((p,i)=>this.addMesh(new THREE.TorusGeometry(.4,.09,8,30),material(i%2?COLORS.cyan:COLORS.pink,{transparent:true,opacity:.8}),p,[1.15,.7,1]));
    for(let i=0;i<18;i++){const a=i*2.4;this.addMesh(new THREE.SphereGeometry(.07,10,8),material(i%2?COLORS.gold:COLORS.blue),[Math.cos(a)*2.05,Math.sin(a*.7)*1.45,Math.sin(a)*1.6]);}
  }
  buildNucleus(){
    this.addMesh(new THREE.SphereGeometry(2.25,48,36),material(0x695cb7,{transparent:true,opacity:.20,side:THREE.DoubleSide}),[0,0,0],[1,1,.86]);
    this.addMesh(new THREE.SphereGeometry(2.25,36,28),material(0xa38bff,{transparent:true,opacity:.28,wireframe:true}),[0,0,0],[1,1,.86]);
    this.addMesh(new THREE.SphereGeometry(.55,28,22),material(0xf4a8d0,{roughness:.32}),[0,0,0]);
    for(let i=0;i<5;i++){const x=-1.3+i*.64;this.addChromosomeGlyph([x,Math.sin(i*1.6)*.6,-.42],.56+i%2*.12,i%2?COLORS.cyan:COLORS.gold);}
    for(let i=0;i<14;i++){const a=i*Math.PI*2/14;this.addMesh(new THREE.SphereGeometry(.065,8,8),material(COLORS.cyan),[Math.cos(a)*2.2,Math.sin(a)*1.8,0]);}
  }
  addChromosomeGlyph(position,scale,color){
    const group=new THREE.Group();group.position.set(...position);group.scale.setScalar(scale);
    const mat=material(color,{roughness:.3});
    for(const angle of [-.48,.48]){const rod=new THREE.Mesh(new THREE.CapsuleGeometry(.15,1.1,5,10),mat);rod.rotation.z=angle;group.add(rod);}
    const center=new THREE.Mesh(new THREE.SphereGeometry(.24,16,12),material(COLORS.pink));group.add(center);this.group.add(group);return group;
  }
  buildChromosome(){
    for(let i=0;i<3;i++)this.addChromosomeGlyph([(i-1)*2.0,(i%2)*.35,0],1.15,i===1?COLORS.violet:(i===0?COLORS.cyan:COLORS.gold));
    this.addMesh(new THREE.TorusGeometry(3.8,.012,4,80),material(0x38516f,{transparent:true,opacity:.5}),[0,0,-1]);
  }
  buildDna(isGene){
    const seq=(this.sequence||'ATGGCTTTTGAACCCAAGGGCCAATGGGATTACCGTGAACCTGGCTAA').replace(/[^ACGT]/gi,'').toUpperCase()||'ATGC';
    const max=isGene?30:34;const start=seq.length>max?Math.max(0,Math.floor((seq.length-max)/2)):0;const portion=seq.slice(start,start+max);const count=portion.length;
    const sphere=new THREE.SphereGeometry(isGene?.14:.12,16,12);const beadMat=material(0xffffff,{roughness:.3});
    const beads=new THREE.InstancedMesh(sphere,beadMat,count*2);beads.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(count*2*3),3);const obj=new THREE.Object3D();
    const railsA=[],railsB=[],turn=2*Math.PI/10.5,radius=isGene?1.02:.95,pitch=isGene?.28:.22,center=(count-1)*pitch/2;
    const complement={A:'T',T:'A',C:'G',G:'C'};
    for(let i=0;i<count;i++){
      const a=i*turn,y=i*pitch-center,pa=new THREE.Vector3(radius*Math.cos(a),y,radius*Math.sin(a)),pb=new THREE.Vector3(-radius*Math.cos(a),y,-radius*Math.sin(a));railsA.push(pa);railsB.push(pb);
      [pa,pb].forEach((p,strand)=>{obj.position.copy(p);obj.updateMatrix();beads.setMatrixAt(i*2+strand,obj.matrix);const letter=strand===0?portion[i]:complement[portion[i]];beads.setColorAt(i*2+strand,new THREE.Color(BASE_COLORS[letter]||'#9ca9b9'));});
      const bridge=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,1,7),material(0x8296aa,{transparent:true,opacity:.75}));
      bridge.position.copy(pa).add(pb).multiplyScalar(.5);const dir=pb.clone().sub(pa);bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir.clone().normalize());bridge.scale.y=dir.length();this.group.add(bridge);
    }
    beads.instanceMatrix.needsUpdate=true;beads.instanceColor.needsUpdate=true;this.group.add(beads);
    if(count>1){for(const pts of [railsA,railsB])this.group.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),count*4,.035,6,false),material(0x9eb1c6,{transparent:true,opacity:.6})));}
    if(isGene){for(let i=0;i<Math.min(5,count);i++){const j=Math.floor(count*.42)+i;if(j<count)this.addMesh(new THREE.SphereGeometry(.21,12,10),material(COLORS.gold,{emissive:0x563b12,emissiveIntensity:.45}),railsA[j].toArray());}}
    this.addMesh(new THREE.TorusGeometry(radius+0.35,.012,4,80),material(0x304761,{transparent:true,opacity:.7}),[0,0,0],[1,Math.max(1,count*pitch/3),1]);
  }
  animate(){this.frame=requestAnimationFrame(()=>this.animate());if(this.autoRotate)this.group.rotation.y+=.0018;this.controls.update();this.renderer.render(this.scene,this.camera);}
  setSequence(sequence){this.sequence=sequence;if(this.level==='dna'||this.level==='gene')this.setLevel(this.level);}
  dispose(){cancelAnimationFrame(this.frame);this.resizeObserver?.disconnect();this.controls?.dispose();this.clearGroup();this.renderer?.dispose();this.renderer?.domElement.remove();this.renderer=null;}
}
