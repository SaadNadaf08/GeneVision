import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEdit, compareSequences, getCodons, transcribeDNA, translateDNA } from '../src/core/bio.js';

test('transcription changes T to U', () => assert.equal(transcribeDNA('ATG CTT'), 'AUGCUU'));
test('translation reads codons in groups of three and stops at stop codon', () => {
  assert.deepEqual(translateDNA('ATGGCTTAACCC').map(x => x.oneLetter), ['M','A','*']);
});
test('codon extraction includes base coordinates', () => {
  assert.equal(getCodons('ATGGCT').map(x => x.codon).join(' '), 'ATG GCT');
  assert.equal(getCodons('ATGGCT')[1].position, 4);
});
test('substitution produces an amino-acid consequence', () => {
  const edited = applyEdit('ATGGCTTAA', { kind:'substitution', position:5, alternate:'A' });
  const result = compareSequences('ATGGCTTAA', edited.sequence);
  assert.equal(edited.sequence, 'ATGGATTAA');
  assert.equal(result.label, 'Amino acid changed');
  assert.match(result.note, /Ala.*Asp/);
});
test('synonymous substitution is recognized', () => {
  assert.equal(compareSequences('ATGGCTTAA','ATGGCC TAA'.replaceAll(' ','')).label, 'Synonymous change');
});
test('insertion and deletion report frame behavior', () => {
  const insertion = applyEdit('ATGGCTTAA', { kind:'insertion', position:3, alternate:'A' });
  const deletion = applyEdit('ATGGCTTAA', { kind:'deletion', position:4, length:3 });
  assert.equal(compareSequences('ATGGCTTAA', insertion.sequence).label, 'Reading-frame shift');
  assert.equal(compareSequences('ATGGCTTAA', deletion.sequence).label, 'In-frame deletion');
});
test('invalid edits fail with a learner-facing validation error', () => {
  assert.throws(() => applyEdit('ATG', { kind:'substitution', position:4, alternate:'A' }), /position/i);
});
