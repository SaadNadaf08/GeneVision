import { state } from '../core/state.js';
import { pageHeader, badge, escapeHtml, navigate } from '../core/ui.js';
import { BiologicalScene } from '../three/biological-scene.js';

const levels = [
  {id:'cell',num:'01',name:'Cell',short:'The whole unit',text:'A cell is the basic unit of life. This simplified view shows a cell boundary, nucleus, and illustrative organelles.'},
  {id:'nucleus',num:'02',name:'Nucleus',short:'DNA compartment',text:'The nucleus contains most of a human cell’s DNA. The shapes inside are schematic chromosomes, not to scale.'},
  {id:'chromosome',num:'03',name:'Chromosome',short:'Packaged DNA',text:'A chromosome is a long DNA molecule packaged with proteins. This X-shaped form is a simplified teaching model.'},
  {id:'dna',num:'04',name:'DNA',short:'A paired sequence',text:'DNA is built from paired bases. The 3D helix colors A, C, G and T and uses the active sequence when one is loaded.'},
  {id:'gene',num:'05',name:'Gene region',short:'A selected section',text:'A gene is a region of DNA with biological instructions. The highlighted section below is illustrative and does not mark genomic coordinates.'}
];
let sceneInstance = null;
function renderLevelInfo(id) {
  const item=levels.find(level=>level.id===id)||levels[0];
  const sequence=state.sequence||'';
  return `<div class="level-info"><div class="eyebrow">BIOLOGICAL HIERARCHY / ${item.num}</div><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.text)}</p><div class="level-facts"><span><small>MODEL</small><b>Educational schematic</b></span><span><small>ACTIVE DATA</small><b>${escapeHtml(state.activeGene?.symbol||'Practice sequence')}</b></span></div>${['dna','gene'].includes(id)?`<div class="scene-sequence-chip"><span class="eyebrow">SEQUENCE CONTEXT</span><b>${sequence.length.toLocaleString()} bases</b><small>${escapeHtml(state.activeTranscript?.accession||state.sequenceLabel)}</small></div>`:''}</div>`;
}
export function render() {
  return `${pageHeader('MODULE 02 / INTERACTIVE VISUALIZATION', 'Biological Explorer', 'Move through the biology hierarchy—from the whole cell down to a gene sequence. Models are schematic and not to scale.', badge('Three.js · WebGL','teal'))}
  <section class="explorer-layout"><div class="content-card explorer-hierarchy"><div class="eyebrow">ZOOM THROUGH LIFE</div><h3>Choose a level</h3><div class="hierarchy-list">${levels.map((item,i)=>`<button class="hierarchy-item ${state.explorerLevel===item.id?'active':''}" data-level="${item.id}"><span class="hierarchy-number">${item.num}</span><span><b>${item.name}</b><small>${item.short}</small></span><i>${i<levels.length-1?'↓':'↗'}</i></button>`).join('')}</div><div class="hierarchy-note"><span>i</span><p>These illustrations explain relationships. They are not a physical scale model or a clinical visualization.</p></div></div>
  <div class="explorer-view"><div class="scene-card"><div class="scene-card-top"><div><span class="live-dot"></span><span>LIVE 3D VIEW</span><small>Drag to rotate · scroll to zoom</small></div><button id="resetView" class="icon-button" title="Reset view" aria-label="Reset view">⟳</button></div><div id="biologyScene" class="biology-scene"></div><div class="scene-card-footer"><span id="sceneLevelLabel">${escapeHtml((levels.find(x=>x.id===state.explorerLevel)||levels[0]).name.toUpperCase())}</span><span class="scene-legend"><i class="base-dot base-a"></i>A <i class="base-dot base-c"></i>C <i class="base-dot base-g"></i>G <i class="base-dot base-t"></i>T</span></div></div><div id="levelInfo" class="content-card level-info-card">${renderLevelInfo(state.explorerLevel)}</div></div>
  <aside class="explorer-side"><article class="content-card explorer-active-gene"><div class="eyebrow">ACTIVE GENE</div><h3>${escapeHtml(state.activeGene?.symbol||'No gene selected')}</h3><p>${escapeHtml(state.activeGene?.name||'You can explore the example model now, then load a reference gene.')}</p>${state.activeTranscript?`<div class="gene-tag">${escapeHtml(state.activeTranscript.accession)} · ${state.sequence.length.toLocaleString()} bp</div>`:''}<button class="button button-quiet full-button" data-nav="gene">${state.activeGene?'Change gene':'Find a gene'} →</button></article><article class="content-card legend-card"><div class="eyebrow">DNA BASE COLOR KEY</div><div class="legend-line"><i class="base-dot base-a"></i><b>A</b><span>Adenine</span></div><div class="legend-line"><i class="base-dot base-c"></i><b>C</b><span>Cytosine</span></div><div class="legend-line"><i class="base-dot base-g"></i><b>G</b><span>Guanine</span></div><div class="legend-line"><i class="base-dot base-t"></i><b>T</b><span>Thymine</span></div><p class="micro-note">RNA uses U instead of T.</p></article></aside></section>`;
}
export function mount(root) {
  const mountPoint=root.querySelector('#biologyScene');
  try { sceneInstance=new BiologicalScene(mountPoint,state.sequence); }
  catch(error){ mountPoint.innerHTML=`<div class="scene-error">3D view could not start. Use a browser with WebGL enabled. <small>${escapeHtml(error.message)}</small></div>`; }
  root.querySelectorAll('[data-level]').forEach(button=>button.addEventListener('click',()=>{
    state.explorerLevel=button.dataset.level;sceneInstance?.setLevel(state.explorerLevel);
    root.querySelectorAll('[data-level]').forEach(item=>item.classList.toggle('active',item.dataset.level===state.explorerLevel));
    root.querySelector('#levelInfo').innerHTML=renderLevelInfo(state.explorerLevel);
    root.querySelector('#sceneLevelLabel').textContent=state.explorerLevel==='gene'?'GENE REGION':state.explorerLevel.toUpperCase();
  }));
  root.querySelector('#resetView')?.addEventListener('click',()=>sceneInstance?.setLevel(state.explorerLevel));
  root.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>navigate(button.dataset.nav)));
}
export function unmount(){sceneInstance?.dispose();sceneInstance=null;}
