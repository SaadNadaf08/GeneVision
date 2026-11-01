import { state, PRACTICE_SEQUENCE } from '../core/state.js';
import { transcribeDNA, translateDNA, getCodons, CODON_TABLE } from '../core/bio.js';
import { escapeHtml, pageHeader, badge, sequenceStrip } from '../core/ui.js';

const steps = [
  { id:'dna', title:'DNA', tag:'01', titleText:'Start with coding DNA', copy:'DNA uses four letters: A, C, G, and T. For this simplified lesson, the selected sequence is treated as the coding strand in the 5′ to 3′ direction.' },
  { id:'transcription', title:'Transcription', tag:'02', titleText:'Make an RNA copy', copy:'In the simplified coding-strand view, RNA matches the DNA letters except U is used where DNA has T. In a cell, RNA is copied from the complementary DNA template strand.' },
  { id:'mrna', title:'mRNA', tag:'03', titleText:'Read the message', copy:'Messenger RNA (mRNA) carries codons—groups of three RNA letters—to the translation machinery.' },
  { id:'translation', title:'Translation', tag:'04', titleText:'Translate codons', copy:'Each three-letter codon corresponds to an amino acid or a stop instruction in the standard genetic code.' },
  { id:'protein', title:'Protein chain', tag:'05', titleText:'See the amino-acid chain', copy:'The amino acids form a chain. This simple view does not predict the final folded 3D protein structure.' }
];
let activeStep = 0;
let playTimer = null;
let playing = false;

function renderSequenceCells(seq, isRNA = false) {
  const units = [];
  for (let i = 0; i < Math.min(seq.length, 180); i += 3) {
    const group = seq.slice(i, i + 3);
    units.push(`<span class="triplet-group"><small>${i + 1}</small>${[...group].map(letter => `<i class="nucleotide n-${letter === 'U' ? 'U' : letter}">${escapeHtml(letter)}</i>`).join('')}</span>`);
  }
  if (seq.length > 180) units.push('<span class="sequence-ellipsis">…</span>');
  return `<div class="triplet-sequence ${isRNA ? 'rna-sequence' : ''}">${units.join('')}</div>`;
}
function renderCodonMap(codons) {
  if (!codons.length) return '<div class="empty-state compact-empty">No complete codons are available yet.</div>';
  return `<div class="codon-map">${codons.slice(0,60).map((item,i) => `<div class="codon-card ${item.isStop ? 'stop-codon' : ''}"><span class="codon-number">${String(i+1).padStart(2,'0')}</span><b>${escapeHtml(item.codon.replaceAll('T','U'))}</b><span>${escapeHtml(item.aminoAcid)}</span></div>`).join('')}${codons.length > 60 ? '<span class="sequence-ellipsis">…</span>' : ''}</div>`;
}
function stageContent(step, dna, rna, codons) {
  if (step.id === 'dna') return `<div class="sequence-stage-label"><span class="stage-dot dot-teal"></span> CODING DNA · ${dna.length.toLocaleString()} BASES</div>${renderSequenceCells(dna)}`;
  if (step.id === 'transcription') return `<div class="transcription-compare"><div><span class="sequence-stage-label">DNA</span>${renderSequenceCells(dna.slice(0,  ninety(dna.length)))}</div><div class="flow-down">↓ <small>copy into RNA</small></div><div><span class="sequence-stage-label">mRNA</span>${renderSequenceCells(rna.slice(0, ninety(rna.length)), true)}</div></div>`;
  if (step.id === 'mrna') return `<div class="sequence-stage-label"><span class="stage-dot dot-pink"></span> MESSENGER RNA · ${rna.length.toLocaleString()} BASES</div>${renderSequenceCells(rna, true)}<p class="micro-note">The display uses U in place of T because this input is treated as a coding-strand sequence.</p>`;
  if (step.id === 'translation') return `<div class="sequence-stage-label"><span class="stage-dot dot-violet"></span> CODON → AMINO ACID</div>${renderCodonMap(codons)}<p class="micro-note">A stop codon ends translation. Codon labels are displayed with RNA U.</p>`;
  const peptide = codons.filter(item => !item.isStop).map(item => item.oneLetter).join('');
  return `<div class="sequence-stage-label"><span class="stage-dot dot-gold"></span> POLYPEPTIDE · ${peptide.length} AMINO ACIDS</div><div class="peptide-chain">${[...peptide].slice(0,80).map((letter,i) => `<span class="peptide-bead ${i === 0 ? 'first' : ''}" title="${escapeHtml(codons[i]?.aminoAcid || '')}">${escapeHtml(letter)}</span>`).join('')}${peptide.length > 80 ? '<span class="sequence-ellipsis">…</span>' : ''}</div><div class="protein-caption"><span>AMINO-ACID CHAIN</span><span>Folded structure not modeled</span></div>`;
}
function ninety(length) { return Math.min(length, 90); }

export function render() {
  const dna = state.sequence || PRACTICE_SEQUENCE;
  const rna = transcribeDNA(dna);
  const codons = translateDNA(dna);
  const step = steps[activeStep] || steps[0];
  const peptideLength = codons.filter(item => !item.isStop).length;
  return `${pageHeader('MODULE 03 / GENE EXPRESSION', 'Expression Lab', 'Follow the information in a coding DNA sequence as it becomes mRNA and an amino-acid chain.', badge(escapeHtml(state.sequenceLabel),'teal'))}
    <section class="content-card expression-source"><div><span class="eyebrow">CURRENT SEQUENCE</span><b>${escapeHtml(state.activeGene?.symbol || 'Practice sequence')}</b><small>${escapeHtml(state.activeTranscript?.accession || state.sequenceLabel)} · ${dna.length.toLocaleString()} bases</small></div><button class="button button-quiet" data-nav="gene">Choose a gene ↗</button></section>
    <section class="expression-layout"><article class="content-card expression-main"><div class="expression-stepper" role="tablist">${steps.map((item,i) => `<button class="step-tab ${i===activeStep?'active':''} ${i<activeStep?'complete':''}" data-step="${i}" role="tab" aria-selected="${i===activeStep}"><span>${item.tag}</span>${item.title}</button>`).join('')}</div><div class="expression-stage"><div class="stage-copy"><div class="eyebrow">${step.tag} / ${step.title.toUpperCase()}</div><h2>${escapeHtml(step.titleText)}</h2><p>${escapeHtml(step.copy)}</p></div><div class="stage-visual" id="expressionVisual">${stageContent(step,dna,rna,codons)}</div></div><div class="expression-controls"><button class="button button-quiet" id="prevStep" ${activeStep===0?'disabled':''}>← Previous</button><div class="step-dots">${steps.map((_,i)=>`<i class="${i===activeStep?'active':''}"></i>`).join('')}</div><button class="button button-primary" id="nextStep">${activeStep===steps.length-1?'Start again':'Next step'} →</button><button class="button button-play ${playing?'is-playing':''}" id="playExpression">${playing?'Ⅱ Pause':'▶ Play lesson'}</button></div></article>
      <aside class="expression-side"><article class="content-card"><div class="eyebrow">SEQUENCE SNAPSHOT</div><h3>From DNA to amino acids</h3><div class="metric-line"><span>DNA bases</span><b>${dna.length.toLocaleString()}</b></div><div class="metric-line"><span>Complete codons</span><b>${Math.floor(dna.length/3).toLocaleString()}</b></div><div class="metric-line"><span>Translated amino acids*</span><b>${peptideLength.toLocaleString()}</b></div><div class="bar-track"><i style="width:${Math.min(100,(peptideLength/Math.max(1,Math.floor(dna.length/3)))*100)}%"></i></div><p class="micro-note">*Translation shown until the first stop codon, if present.</p></article><article class="content-card concept-card"><span class="concept-symbol">i</span><div class="eyebrow">BIOLOGY NOTE</div><h3>DNA bases are not amino acids</h3><p>DNA is read in triplets called codons. The codon map shows the amino acid each triplet represents. The amino-acid chain is a simplified output—not a 3D protein prediction.</p></article><article class="content-card expression-action"><div class="eyebrow">NEXT IDEA</div><p>Try changing a DNA letter and see whether its codon changes.</p><button class="button button-quiet" data-nav="mutation">Open Mutation Lab →</button></article></aside></section>`;
}
export function mount(root) {
  const setStep = value => { activeStep = (value + steps.length) % steps.length; window.dispatchEvent(new CustomEvent('gv:refresh')); };
  root.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => setStep(Number(button.dataset.step))));
  root.querySelector('#nextStep')?.addEventListener('click', () => setStep(activeStep + 1));
  root.querySelector('#prevStep')?.addEventListener('click', () => setStep(activeStep - 1));
  root.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => window.dispatchEvent(new CustomEvent('gv:navigate',{detail:button.dataset.nav}))));
  root.querySelector('#playExpression')?.addEventListener('click', () => {
    if (playing) { clearInterval(playTimer); playTimer=null; playing=false; window.dispatchEvent(new CustomEvent('gv:refresh')); return; }
    playing=true; window.dispatchEvent(new CustomEvent('gv:refresh'));
    playTimer=setInterval(()=>{ if(activeStep>=steps.length-1){clearInterval(playTimer);playTimer=null;playing=false;} else activeStep++; window.dispatchEvent(new CustomEvent('gv:refresh')); },1450);
  });
}
export function unmount() { if (playTimer) clearInterval(playTimer); playTimer=null; playing=false; }
