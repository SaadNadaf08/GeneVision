import { state, PRACTICE_SEQUENCE } from '../core/state.js';
import { applyEdit, compareSequences, cleanDNA, isValidDNA, getCodons, translateDNA, sequenceExcerpt } from '../core/bio.js';
import { escapeHtml, pageHeader, badge, navigate } from '../core/ui.js';

let lastResult = null;
function getInitialVariant() { return state.lastMutation?.alternateSequence || state.sequence || PRACTICE_SEQUENCE; }
function renderOutcome(result, reference, alternate) {
  if (!result) return `<div class="empty-state compact-empty"><span class="empty-symbol">↗</span><p>Make a change or compare sequences to see the result.</p></div>`;
  const center = Math.max(0, (result.position || 1) - 1);
  const refPart = sequenceExcerpt(reference, center, 24);
  const altPart = sequenceExcerpt(alternate, center, 24);
  const changes = result.changedCodons || [];
  const codonCards = changes.slice(0,8).map(item => `<div class="effect-codon-row"><span>Base ${item.position}</span><b>${escapeHtml(item.referenceCodon || '—')}</b><i>→</i><b class="changed-text">${escapeHtml(item.alternateCodon || '—')}</b><small>${escapeHtml(item.label)}</small></div>`).join('');
  return `<div class="outcome-head"><div><span class="result-icon">${result.kind==='unchanged'?'=':'Δ'}</span><div><span class="eyebrow">COMPARISON RESULT</span><h3>${escapeHtml(result.label)}</h3></div></div>${badge(`${Math.abs(reference.length-alternate.length)} length difference`, 'blue')}</div><p class="outcome-note">${escapeHtml(result.note)}</p><div class="compare-lengths"><span>Reference <b>${reference.length.toLocaleString()}</b> bases</span><span>Changed <b>${alternate.length.toLocaleString()}</b> bases</span></div><div class="compare-sequence-block"><div class="compare-title"><b>Reference DNA</b><small>${refPart.truncated?'near change · ':''}${refPart.start+1}–${refPart.end}</small></div><div class="mono-sequence">${escapeHtml(refPart.text)}</div><div class="compare-title changed-title"><b>Changed DNA</b><small>${altPart.truncated?'near change · ':''}${altPart.start+1}–${altPart.end}</small></div><div class="mono-sequence changed-sequence">${escapeHtml(altPart.text)}</div></div>${codonCards ? `<div class="changed-codons"><div class="eyebrow">CODON VIEW</div>${codonCards}</div>` : ''}<div class="outcome-warning">Sequence-level learning result only. This is not a medical or clinical interpretation.</div>`;
}

export function render() {
  const reference = state.sequence || PRACTICE_SEQUENCE;
  const initialVariant = getInitialVariant();
  const defaultPosition = Math.min(5, reference.length);
  const defaultAlternate = ['A','C','G','T'].find(base => base !== reference[defaultPosition - 1]) || 'A';
  const savedResult = state.lastMutation && state.lastMutation.referenceSequence === reference ? state.lastMutation : null;
  const resultMarkup = savedResult ? renderOutcome(savedResult, reference, savedResult.alternateSequence || initialVariant) : renderOutcome(null, reference, initialVariant);
  return `${pageHeader('MODULE 04 / SEQUENCE ANALYSIS', 'Mutation Lab', 'Edit or compare coding DNA sequences, find changed positions, and inspect codon-level effects where applicable.', badge('Substitution · insertion · deletion','violet'))}
    <section class="content-card mutation-source"><div><span class="eyebrow">REFERENCE SEQUENCE</span><b>${escapeHtml(state.activeGene?.symbol || 'Synthetic practice sequence')}</b><small>${escapeHtml(state.activeTranscript?.accession || state.sequenceLabel)} · ${reference.length.toLocaleString()} bp</small></div><button class="button button-quiet" data-nav="gene">Load a gene from NCBI ↗</button></section>
    <div class="mutation-layout"><div class="mutation-workspace"><section class="content-card"><div class="section-heading"><div><div class="eyebrow">A / ORIGINAL DNA</div><h3>Reference coding sequence</h3></div><span class="micro-label">A, C, G, T</span></div><textarea id="referenceSequence" class="sequence-editor" spellcheck="false">${escapeHtml(reference)}</textarea><div class="editor-footer"><span>Spaces and line breaks ignored</span><span>${reference.length.toLocaleString()} bp</span></div></section>
      <section class="content-card mutation-builder"><div class="section-heading"><div><div class="eyebrow">B / CONTROLLED EDIT</div><h3>Build a mutation</h3></div>${badge('Local calculation','teal')}</div><div class="builder-grid"><div><label class="field-label" for="mutationKind">Change type</label><select id="mutationKind" class="input-control"><option value="substitution">Substitution · replace one base</option><option value="insertion">Insertion · add base(s)</option><option value="deletion">Deletion · remove base(s)</option></select></div><div><label class="field-label" for="mutationPosition">Position</label><input id="mutationPosition" class="input-control" type="number" value="${defaultPosition}" min="0" max="${reference.length}"/><small id="positionHelp" class="micro-note">Base position, counting from 1</small></div><div id="alternateField"><label class="field-label" for="mutationAlternate">New base(s)</label><input id="mutationAlternate" class="input-control" value="${defaultAlternate}" maxlength="60"/><small class="micro-note">Use A, C, G, or T</small></div><div id="deletionField" hidden><label class="field-label" for="deletionLength">Bases to remove</label><input id="deletionLength" class="input-control" type="number" value="1" min="1"/><small class="micro-note">Starts at the selected position</small></div></div><div class="builder-actions"><button class="button button-primary" id="buildMutation">Apply change to sequence <span>→</span></button><button class="button button-quiet" id="resetVariant">Reset to reference</button></div><div id="mutationError" class="inline-error" hidden></div></section>
      <section class="content-card"><div class="section-heading"><div><div class="eyebrow">C / CHANGED DNA</div><h3>Variant sequence</h3></div><span class="micro-label">You can edit this too</span></div><textarea id="variantSequence" class="sequence-editor" spellcheck="false">${escapeHtml(initialVariant)}</textarea><div class="editor-footer"><span>Compare this with the reference sequence</span><span id="variantLength">${initialVariant.length.toLocaleString()} bp</span></div><button class="button button-quiet full-button" id="analyzeSequences">Analyze differences →</button></section></div>
      <aside class="content-card mutation-results"><div class="section-heading"><div><div class="eyebrow">D / COMPUTATIONAL RESULT</div><h3>What changed?</h3></div><span class="result-badge">Δ</span></div><div id="mutationOutcome">${resultMarkup}</div><button class="button button-primary full-button" id="explainMutation">Ask AI to explain this result <span>✦</span></button><p class="micro-note">The tutor explains the calculation; it does not determine whether a variant is harmful.</p></aside></div>
    <div class="info-banner"><span class="info-glyph">i</span><p>For a real gene, the sequence must be a correctly oriented coding sequence with a known transcript and reading frame. This module does not interpret regulatory, splicing, or clinical effects.</p></div>`;
}
export function mount(root) {
  const referenceInput = root.querySelector('#referenceSequence');
  const variantInput = root.querySelector('#variantSequence');
  const kind = root.querySelector('#mutationKind');
  const position = root.querySelector('#mutationPosition');
  const alternate = root.querySelector('#mutationAlternate');
  const deletionLength = root.querySelector('#deletionLength');
  const alternateField = root.querySelector('#alternateField');
  const deletionField = root.querySelector('#deletionField');
  const error = root.querySelector('#mutationError');
  const outcome = root.querySelector('#mutationOutcome');
  const updateFields = () => {
    const insertion = kind.value === 'insertion';
    const deletion = kind.value === 'deletion';
    alternateField.hidden = deletion; deletionField.hidden = !deletion;
    root.querySelector('#positionHelp').textContent = insertion ? 'Insert after this base; 0 = before the first' : 'Base position, counting from 1';
    position.min = insertion ? '0' : '1'; position.max = String(cleanDNA(referenceInput.value).length);
    if (insertion && Number(position.value) === 5 && referenceInput.value.length < 5) position.value = String(cleanDNA(referenceInput.value).length);
  };
  const showError = message => { error.hidden = !message; error.textContent = message || ''; };
  const analyze = () => {
    try {
      const ref = cleanDNA(referenceInput.value), alt = cleanDNA(variantInput.value);
      if (!isValidDNA(ref) || !isValidDNA(alt)) throw new Error('Use DNA letters A, C, G, and T (ambiguous N is allowed).');
      const result = compareSequences(ref, alt);
      lastResult = result;
      state.lastMutation = { ...result, referenceSequence: ref, alternateSequence: alt, effect: result.label, note: result.note };
      outcome.innerHTML = renderOutcome(result, ref, alt);
      root.querySelector('#variantLength').textContent = `${alt.length.toLocaleString()} bp`;
      showError('');
    } catch (err) { showError(err.message); }
  };
  kind.addEventListener('change', updateFields); updateFields();
  root.querySelector('#buildMutation').addEventListener('click', () => {
    try {
      const ref = cleanDNA(referenceInput.value);
      if (!isValidDNA(ref, false)) throw new Error('Use only A, C, G, and T in this coding-sequence editor.');
      const edit = applyEdit(ref, { kind:kind.value, position:Number(position.value), alternate:alternate.value, length:Number(deletionLength.value) });
      variantInput.value = edit.sequence; root.querySelector('#variantLength').textContent = `${edit.sequence.length.toLocaleString()} bp`;
      analyze();
    } catch (err) { showError(err.message); }
  });
  root.querySelector('#analyzeSequences').addEventListener('click', analyze);
  root.querySelector('#resetVariant').addEventListener('click', () => { variantInput.value = referenceInput.value; analyze(); });
  variantInput.addEventListener('input', () => root.querySelector('#variantLength').textContent = `${cleanDNA(variantInput.value).length.toLocaleString()} bp`);
  root.querySelector('#explainMutation').addEventListener('click', () => {
    if (!state.lastMutation) analyze();
    navigate('tutor');
  });
  root.querySelectorAll('[data-nav]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.nav)));
}
