import './styles.css';
import { state } from './core/state.js';
import { checkHealth } from './core/api.js';
import * as overview from './modules/overview.js';
import * as gene from './modules/gene.js';
import * as expression from './modules/expression.js';
import * as mutation from './modules/mutation.js';
import * as explorer from './modules/explorer.js';
import * as tutor from './modules/tutor.js';
import * as settings from './modules/settings.js';

const modules = { overview, explorer, gene, expression, mutation, tutor, settings };
const labels = { overview:'Overview', explorer:'Biological Explorer', gene:'Gene Explorer', expression:'Expression Lab', mutation:'Mutation Lab', tutor:'AI Gene Tutor', settings:'Settings & sources' };
const icons = { overview:'⌂', explorer:'◉', gene:'⌕', expression:'↗', mutation:'Δ', tutor:'✦', settings:'⚙' };
const app=document.querySelector('#app');
app.innerHTML=`<div class="app-shell"><aside class="sidebar"><a href="#overview" class="app-brand"><span class="brand-mark"><i></i><i></i><i></i></span><span>Gene<span>Vision</span><small>LEARNING STUDIO</small></span></a><div class="sidebar-label">WORKSPACE</div><nav class="main-nav" aria-label="Main navigation">${Object.entries(labels).map(([id,label])=>`<button class="nav-button" data-route="${id}"><span class="nav-icon">${icons[id]}</span><span>${label}</span>${id==='tutor'?'<i class="nav-spark">✦</i>':''}</button>`).join('')}</nav><div class="sidebar-bottom"><article class="side-learning-card"><div class="side-orb">✦</div><div class="eyebrow">YOUR LEARNING PATH</div><b>Visualize. Simulate. Understand.</b><small>Work through genetics one step at a time.</small><button data-route="expression">Continue learning →</button></article><div class="side-user"><div class="user-avatar">GV</div><div><b>GeneVision</b><small>Educational prototype</small></div><span class="side-status-dot"></span></div></div></aside><section class="main-area"><header class="topbar"><div class="breadcrumbs"><span>Workspace</span><i>/</i><b id="breadcrumbCurrent">Overview</b></div><div class="topbar-right"><span id="dataStatus" class="top-status"><i></i> NCBI data</span><span id="aiStatus" class="top-status ai-status"><i></i> AI checking…</span><button class="top-help" data-route="settings" title="Settings and sources">?</button></div></header><main id="moduleView" class="module-view" tabindex="-1"></main><footer class="global-footer"><span>GENEVISION <i>·</i> EDUCATIONAL GENETICS STUDIO</span><span>Not for clinical or diagnostic use</span></footer></section><div id="toastArea" class="toast-area" aria-live="polite"></div></div>`;

const moduleView=app.querySelector('#moduleView');
let activeId=null;
function updateNav(id){
  app.querySelectorAll('[data-route]').forEach(button=>button.classList.toggle('active',button.dataset.route===id));
  app.querySelector('#breadcrumbCurrent').textContent=labels[id]||'Overview';
}
function renderModule(id=state.activeModule, shouldUnmount=true){
  if(!modules[id])id='overview';
  if(shouldUnmount && activeId && modules[activeId]?.unmount)modules[activeId].unmount();
  activeId=id;state.activeModule=id;updateNav(id);
  moduleView.innerHTML=modules[id].render();
  modules[id].mount?.(moduleView);
  moduleView.focus({preventScroll:true});
}
function go(id){if(!modules[id])return;state.activeModule=id;if(location.hash!==`#${id}`)location.hash=id;else renderModule(id,true);}
app.querySelectorAll('[data-route]').forEach(button=>button.addEventListener('click',()=>go(button.dataset.route)));
window.addEventListener('hashchange',()=>renderModule(location.hash.replace(/^#/, '')||'overview',true));
window.addEventListener('gv:navigate',event=>go(event.detail));
window.addEventListener('gv:refresh',()=>renderModule(state.activeModule,false));
window.addEventListener('gv:toast',event=>{
  const area=app.querySelector('#toastArea');const box=document.createElement('div');box.className=`toast toast-${event.detail?.type||'success'}`;box.textContent=event.detail?.message||'';area.appendChild(box);setTimeout(()=>box.remove(),3600);
});
async function loadHealth(){
  const data=app.querySelector('#dataStatus'),ai=app.querySelector('#aiStatus');
  try{const health=await checkHealth();state.aiConfigured=health.aiConfigured;state.aiModel=health.aiModel||'';data.classList.add('connected');data.innerHTML='<i></i> NCBI data ready';ai.classList.toggle('connected',state.aiConfigured);ai.innerHTML=`<i></i> ${state.aiConfigured?'AI connected':'AI key needed'}`;if(activeId==='settings'||activeId==='tutor')window.dispatchEvent(new CustomEvent('gv:refresh'));}
  catch{data.classList.add('unavailable');data.innerHTML='<i></i> Data service offline';ai.innerHTML='<i></i> API offline';}
}
renderModule(location.hash.replace(/^#/, '')||'overview',false);
loadHealth();
