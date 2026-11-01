import { state } from '../core/state.js';
import { apiGet } from '../core/api.js';
import { escapeHtml, formatNumber, pageHeader, badge, refresh, showToast, navigate } from '../core/ui.js';

let matches = [];
let selectedGene = null;
let transcriptRecords = [];

function geneSummary(gene) {
  if (!gene) return `<div class="empty-state"><span class="empty-symbol">⌕</span><h3>Search for a gene</h3><p>Try a gene symbol such as BRCA1, CFTR, TP53, or HBB. Results are retrieved from NCBI Gene.</p></div>`;
  return `<div class="gene-summary-head"><div class="gene-monogram">${escapeHtml((gene.symbol || 'G').slice(0,2))}</div><div><div class="eyebrow">NCBI GENE RECORD · ${escapeHtml(gene.uid)}</div><h3>${escapeHtml(gene.symbol)}</h3><p>${escapeHtml(gene.name)}</p></div></div>
    <div class="gene-facts"><div><span>Organism</span><b>${escapeHtml(gene.organism)}</b></div><div><span>Chromosome</span><b>${escapeHtml(gene.chromosome || 'Not listed')}</b></div><div><span>Location</span><b>${escapeHtml(gene.location || '—')} ${gene.strand ? `(${escapeHtml(gene.strand)} strand)` : ''}</b></div></div>
    <div class="gene-summary-text"><div class="eyebrow">ABOUT THIS GENE</div><p>${escapeHtml(gene.summary || gene.description || 'NCBI has no summary text for this record.')}</p></div>
    <a class="source-link" href="${escapeHtml(gene.sourceUrl)}" target="_blank" rel="noreferrer">View NCBI Gene record <span>↗</span></a>`;
}
function renderTranscriptOptions() {
  const box = document.getElementById('transcriptBox');
  if (!box) return;
  if (!transcriptRecords.length) { box.innerHTML = '<p class="inline-error">No RefSeq mRNA transcripts were found for this record. It may be non-coding or require another transcript source.</p>'; return; }
  box.innerHTML = `<label class="field-label" for="transcriptChoice">Choose an mRNA transcript</label><select id="transcriptChoice" class="input-control">${transcriptRecords.map((t,i) => `<option value="${escapeHtml(t.uid)}" ${i===0?'selected':''}>${escapeHtml(t.accession)} · ${escapeHtml(t.title)} · ${formatNumber(t.length)} nt</option>`).join('')}</select><button id="loadTranscript" class="button button-primary full-button">Load coding sequence <span>→</span></button><p class="micro-note">The selected transcript is fetched as a RefSeq coding sequence (CDS), when available.</p>`;
  document.getElementById('loadTranscript')?.addEventListener('click', loadTranscript);
}
async function loadTranscript() {
  const selected = transcriptRecords.find(item => item.uid === document.getElementById('transcriptChoice')?.value);
  if (!selected) return;
  const button = document.getElementById('loadTranscript');
  button.disabled = true; button.innerHTML = '<span class="spinner"></span> Fetching RefSeq CDS…';
  try {
    const data = await apiGet(`/api/transcripts/${encodeURIComponent(selected.uid)}`);
    state.activeGene = selectedGene;
    state.activeTranscript = { ...selected, accession: data.accession || selected.accession, proteinAccession: data.proteinAccession, sourceUrl: data.sourceUrl };
    state.sequence = data.cds;
    state.sequenceLabel = `${selectedGene.symbol} · ${state.activeTranscript.accession} CDS`;
    state.sequenceIsReference = true;
    state.lastMutation = null;
    showToast(`Loaded ${selectedGene.symbol} coding sequence into the learning labs.`);
    refresh();
  } catch (error) {
    button.disabled = false; button.innerHTML = 'Load coding sequence <span>→</span>';
    const output = document.getElementById('geneError');
    if (output) { output.hidden = false; output.textContent = error.message; }
  }
}

export function render() {
  const active = state.activeGene;
  return `${pageHeader('MODULE 01 / BIOLOGICAL INFORMATION', 'Gene Explorer', 'Search NCBI Gene, review a record, and load a RefSeq coding sequence into the expression and mutation labs.', badge('NCBI + RefSeq','teal'))}
    <div class="gene-workspace"><section class="content-card gene-search-card"><div class="section-heading"><div><div class="eyebrow">NCBI GENE SEARCH</div><h3>Find a gene to explore</h3></div><span class="source-mark">NCBI</span></div><form id="geneSearchForm" class="search-form"><div class="search-input-wrap"><span>⌕</span><input id="geneQuery" class="input-control" placeholder="Gene symbol, e.g. BRCA1" value="" maxlength="40" autocomplete="off"/><button class="button button-primary" type="submit">Search genes <span>→</span></button></div></form><div class="search-shortcuts"><span>Try:</span><button data-query="BRCA1">BRCA1</button><button data-query="CFTR">CFTR</button><button data-query="TP53">TP53</button><button data-query="HBB">HBB</button></div><div id="geneSearchStatus" class="status-line" aria-live="polite"></div><div id="geneResults" class="gene-results"></div>
      <div class="transcript-area" id="transcriptArea" hidden><div class="section-heading"><div><div class="eyebrow">REFERENCE TRANSCRIPTS</div><h3 id="selectedGeneHeading">Select a transcript</h3></div><span class="badge badge-violet">RefSeq</span></div><div id="transcriptBox"></div><div id="geneError" class="inline-error" hidden></div></div></section>
      <aside class="content-card gene-detail-card"><div class="section-heading"><div><div class="eyebrow">SELECTED RECORD</div><h3>${active ? 'Current gene' : 'Gene details'}</h3></div>${badge(active ? 'Loaded' : 'Ready', active ? 'green' : 'blue')}</div><div id="activeGeneSummary">${geneSummary(active)}</div>${active ? `<div class="loaded-sequence-note"><span class="status-check">✓</span><div><b>Sequence ready for labs</b><small>${escapeHtml(state.activeTranscript?.accession || '')} · ${formatNumber(state.sequence.length)} coding bases</small></div></div><div class="quick-actions"><button class="button button-quiet" data-nav="expression">Open Expression Lab →</button><button class="button button-quiet" data-nav="mutation">Open Mutation Lab →</button></div>` : ''}</aside></div>
    <div class="info-banner"><span class="info-glyph">i</span><p>Sequences are retrieved from NCBI RefSeq. Transcript choice matters: different transcripts may produce different coding sequences. This learning tool is not for medical interpretation.</p></div>`;
}
export function mount(root) {
  const form = root.querySelector('#geneSearchForm');
  const queryInput = root.querySelector('#geneQuery');
  const status = root.querySelector('#geneSearchStatus');
  const results = root.querySelector('#geneResults');
  const transcriptArea = root.querySelector('#transcriptArea');
  const search = async query => {
    const q = String(query || '').trim(); if (!q) { status.textContent = 'Enter a gene symbol to search.'; return; }
    status.innerHTML = '<span class="spinner"></span> Searching NCBI Gene…'; results.innerHTML = ''; transcriptArea.hidden = true;
    try {
      const data = await apiGet(`/api/genes/search?query=${encodeURIComponent(q)}`);
      matches = data.results || [];
      status.textContent = matches.length ? `${matches.length} matching human gene record${matches.length === 1 ? '' : 's'} · Source: ${data.source}` : `No human gene records found for “${q}”. Try a recognized gene symbol.`;
      results.innerHTML = matches.map((gene,i) => `<button class="gene-result" data-gene-index="${i}"><span class="gene-result-mark">${escapeHtml(gene.symbol.slice(0,1))}</span><span class="gene-result-text"><b>${escapeHtml(gene.symbol)}</b><small>${escapeHtml(gene.name)}${gene.chromosome ? ` · chr ${escapeHtml(gene.chromosome)}` : ''}</small></span><span class="gene-result-arrow">↗</span></button>`).join('');
    } catch (error) { status.innerHTML = `<span class="inline-error">${escapeHtml(error.message)}</span>`; }
  };
  form?.addEventListener('submit', event => { event.preventDefault(); search(queryInput.value); });
  root.querySelectorAll('[data-query]').forEach(button => button.addEventListener('click', () => { queryInput.value = button.dataset.query; search(button.dataset.query); }));
  results?.addEventListener('click', async event => {
    const button = event.target.closest('[data-gene-index]'); if (!button) return;
    selectedGene = matches[Number(button.dataset.geneIndex)]; if (!selectedGene) return;
    root.querySelector('#activeGeneSummary').innerHTML = geneSummary(selectedGene);
    root.querySelector('#selectedGeneHeading').textContent = `${selectedGene.symbol} transcripts`;
    transcriptArea.hidden = false;
    const transcriptBox = root.querySelector('#transcriptBox'); transcriptBox.innerHTML = '<div class="loading-line"><span class="spinner"></span> Finding RefSeq mRNA transcripts…</div>';
    try {
      const data = await apiGet(`/api/genes/${encodeURIComponent(selectedGene.uid)}/transcripts?symbol=${encodeURIComponent(selectedGene.symbol)}`);
      transcriptRecords = data.transcripts || []; renderTranscriptOptions();
    } catch (error) { transcriptBox.innerHTML = `<p class="inline-error">${escapeHtml(error.message)}</p>`; }
  });
  root.addEventListener('click', event => { const button = event.target.closest('[data-nav]'); if (button) navigate(button.dataset.nav); });
}
