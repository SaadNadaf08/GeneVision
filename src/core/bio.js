export const SAMPLE_DNA = 'ATGGCTTTTGAACCCAAGGGCCAATGGGATTACCGTGAACCTGGCTAA';
export const BASE_COLORS = { A: '#53d7c6', C: '#69a9ff', G: '#ffc96e', T: '#bd8cff', U: '#ff8eaa', N: '#98a7b8' };
export const CODON_TABLE = {
  TTT:['Phe','F'],TTC:['Phe','F'],TTA:['Leu','L'],TTG:['Leu','L'],TCT:['Ser','S'],TCC:['Ser','S'],TCA:['Ser','S'],TCG:['Ser','S'],TAT:['Tyr','Y'],TAC:['Tyr','Y'],TAA:['Stop','*'],TAG:['Stop','*'],TGT:['Cys','C'],TGC:['Cys','C'],TGA:['Stop','*'],TGG:['Trp','W'],
  CTT:['Leu','L'],CTC:['Leu','L'],CTA:['Leu','L'],CTG:['Leu','L'],CCT:['Pro','P'],CCC:['Pro','P'],CCA:['Pro','P'],CCG:['Pro','P'],CAT:['His','H'],CAC:['His','H'],CAA:['Gln','Q'],CAG:['Gln','Q'],CGT:['Arg','R'],CGC:['Arg','R'],CGA:['Arg','R'],CGG:['Arg','R'],
  ATT:['Ile','I'],ATC:['Ile','I'],ATA:['Ile','I'],ATG:['Met','M'],ACT:['Thr','T'],ACC:['Thr','T'],ACA:['Thr','T'],ACG:['Thr','T'],AAT:['Asn','N'],AAC:['Asn','N'],AAA:['Lys','K'],AAG:['Lys','K'],AGT:['Ser','S'],AGC:['Ser','S'],AGA:['Arg','R'],AGG:['Arg','R'],
  GTT:['Val','V'],GTC:['Val','V'],GTA:['Val','V'],GTG:['Val','V'],GCT:['Ala','A'],GCC:['Ala','A'],GCA:['Ala','A'],GCG:['Ala','A'],GAT:['Asp','D'],GAC:['Asp','D'],GAA:['Glu','E'],GAG:['Glu','E'],GGT:['Gly','G'],GGC:['Gly','G'],GGA:['Gly','G'],GGG:['Gly','G']
};

export function cleanDNA(value = '') { return String(value).toUpperCase().replace(/\s+/g, ''); }
export function isValidDNA(sequence, allowAmbiguous = true) {
  return allowAmbiguous ? /^[ACGTRYSWKMBDHVN]*$/.test(sequence) : /^[ACGT]*$/.test(sequence);
}
export function transcribeDNA(sequence) { return cleanDNA(sequence).replaceAll('T', 'U'); }
export function getCodons(sequence, offset = 0) {
  const dna = cleanDNA(sequence);
  const codons = [];
  for (let i = offset; i + 2 < dna.length; i += 3) {
    const triplet = dna.slice(i, i + 3);
    const [name = 'Unknown', one = '?'] = CODON_TABLE[triplet] || [];
    codons.push({ position: i + 1, index: Math.floor(i / 3) + 1, codon: triplet, aminoAcid: name, oneLetter: one, isStop: name === 'Stop' });
    if (name === 'Stop') break;
  }
  return codons;
}
export function translateDNA(sequence, { stopAtStop = true } = {}) {
  const dna = cleanDNA(sequence);
  const output = [];
  for (let i = 0; i + 2 < dna.length; i += 3) {
    const codon = dna.slice(i, i + 3);
    const [name = 'Unknown', one = '?'] = CODON_TABLE[codon] || [];
    output.push({ position: i + 1, codon, aminoAcid: name, oneLetter: one, isStop: name === 'Stop' });
    if (stopAtStop && name === 'Stop') break;
  }
  return output;
}
export function translateRNA(sequence, options) { return translateDNA(cleanDNA(sequence).replaceAll('U', 'T'), options); }

export function applyEdit(sequence, { kind, position, alternate = '', length = 1 }) {
  const dna = cleanDNA(sequence);
  const alt = cleanDNA(alternate);
  if (!isValidDNA(dna, false) || !dna.length) throw new Error('Enter a non-empty DNA sequence using A, C, G, and T.');
  if (!Number.isInteger(Number(position))) throw new Error('Position must be a whole number.');
  const pos = Number(position);
  if (kind === 'substitution') {
    if (pos < 1 || pos > dna.length) throw new Error(`Choose a substitution position from 1 to ${dna.length}.`);
    if (!/^[ACGT]$/.test(alt)) throw new Error('A substitution must use one DNA base: A, C, G, or T.');
    if (dna[pos - 1] === alt) throw new Error('The replacement base is already present at that position.');
    return { sequence: dna.slice(0, pos - 1) + alt + dna.slice(pos), kind, position: pos, reference: dna[pos - 1], alternate: alt, removed: dna[pos - 1], inserted: alt };
  }
  if (kind === 'insertion') {
    if (pos < 0 || pos > dna.length) throw new Error(`For insertion, choose a position from 0 to ${dna.length}; 0 inserts before the first base.`);
    if (!/^[ACGT]+$/.test(alt)) throw new Error('Enter one or more DNA bases to insert.');
    return { sequence: dna.slice(0, pos) + alt + dna.slice(pos), kind, position: pos, reference: '', alternate: alt, removed: '', inserted: alt };
  }
  if (kind === 'deletion') {
    const count = Number(length);
    if (pos < 1 || pos > dna.length) throw new Error(`Choose a deletion start from 1 to ${dna.length}.`);
    if (!Number.isInteger(count) || count < 1 || pos + count - 1 > dna.length) throw new Error('Deletion length must fit inside the reference sequence.');
    const removed = dna.slice(pos - 1, pos - 1 + count);
    return { sequence: dna.slice(0, pos - 1) + dna.slice(pos - 1 + count), kind, position: pos, reference: removed, alternate: '', removed, inserted: '' };
  }
  throw new Error('Choose substitution, insertion, or deletion.');
}

function classifyCodons(referenceCodon, alternateCodon) {
  const ref = CODON_TABLE[referenceCodon];
  const alt = CODON_TABLE[alternateCodon];
  if (!ref || !alt) return { label: 'Codon changed', note: `Codon ${referenceCodon || '—'} → ${alternateCodon || '—'}; one or both codons are incomplete or ambiguous.` };
  if (ref[0] === alt[0]) return { label: 'Synonymous change', note: `The codon changes from ${referenceCodon} to ${alternateCodon}, but both encode ${ref[0]}.` };
  if (alt[0] === 'Stop') return { label: 'Stop codon gained', note: `${referenceCodon} (${ref[0]}) changes to ${alternateCodon} (Stop) in this reading frame.` };
  if (ref[0] === 'Stop') return { label: 'Stop codon lost', note: `${referenceCodon} (Stop) changes to ${alternateCodon} (${alt[0]}) in this reading frame.` };
  return { label: 'Amino acid changed', note: `${referenceCodon} (${ref[0]}) changes to ${alternateCodon} (${alt[0]}) in this reading frame.` };
}

export function compareSequences(reference, alternate) {
  const ref = cleanDNA(reference), alt = cleanDNA(alternate);
  if (!ref || !alt) throw new Error('Enter both the reference and changed DNA sequences.');
  if (!isValidDNA(ref) || !isValidDNA(alt)) throw new Error('Sequences may contain only DNA letters (A, C, G, T; ambiguous N is allowed for comparison).');
  if (ref === alt) return { kind: 'unchanged', position: null, reference: '', alternate: '', substitutions: [], label: 'No sequence changes', note: 'The two DNA sequences are identical.', referenceCodon: null, alternateCodon: null, changedCodons: [] };
  if (ref.length === alt.length) {
    const substitutions = [];
    for (let i = 0; i < ref.length; i++) if (ref[i] !== alt[i]) substitutions.push({ position: i + 1, reference: ref[i], alternate: alt[i] });
    const codonStarts = [...new Set(substitutions.map(item => Math.floor((item.position - 1) / 3) * 3))];
    const changedCodons = codonStarts.map(start => {
      const referenceCodon = ref.slice(start, start + 3), alternateCodon = alt.slice(start, start + 3);
      return { position: start + 1, referenceCodon, alternateCodon, ...classifyCodons(referenceCodon, alternateCodon) };
    });
    const single = substitutions.length === 1;
    const first = substitutions[0];
    const firstCodon = changedCodons[0];
    const label = single ? firstCodon.label : `${substitutions.length} substitutions`;
    const note = single ? `Base ${first.position}: ${first.reference} → ${first.alternate}. ${firstCodon.note}` : `Found ${substitutions.length} changed positions across ${changedCodons.length} codon(s). Review each codon below.`;
    return { kind: single ? 'substitution' : 'multiple substitutions', position: first.position, reference: first.reference, alternate: first.alternate, substitutions, label, note, referenceCodon: firstCodon.referenceCodon, alternateCodon: firstCodon.alternateCodon, changedCodons };
  }
  let prefix = 0;
  while (prefix < ref.length && prefix < alt.length && ref[prefix] === alt[prefix]) prefix++;
  let suffix = 0;
  while (suffix < ref.length - prefix && suffix < alt.length - prefix && ref[ref.length - 1 - suffix] === alt[alt.length - 1 - suffix]) suffix++;
  const removed = ref.slice(prefix, ref.length - suffix);
  const inserted = alt.slice(prefix, alt.length - suffix);
  const size = Math.abs(inserted.length - removed.length);
  const frameShift = size % 3 !== 0;
  const codonStart = Math.floor(prefix / 3) * 3;
  const referenceCodon = ref.slice(codonStart, codonStart + 3);
  const alternateCodon = alt.slice(codonStart, codonStart + 3);
  const kind = removed && inserted ? 'replacement / indel' : inserted ? 'insertion' : 'deletion';
  const label = frameShift ? 'Reading-frame shift' : (inserted ? 'In-frame insertion' : 'In-frame deletion');
  const note = frameShift
    ? `${inserted ? `Inserted ${inserted.length}` : `Deleted ${removed.length}`} base(s). The sequence length changes by ${size}, which is not a multiple of three; downstream codon grouping shifts in this simplified coding-sequence view.`
    : `${inserted ? `Inserted ${inserted.length}` : `Deleted ${removed.length}`} base(s), a multiple of three. The reading frame is preserved in this simplified coding-sequence view.`;
  return { kind, position: prefix + 1, reference: removed, alternate: inserted, removed, inserted, label, note, referenceCodon, alternateCodon, changedCodons: [{ position: codonStart + 1, referenceCodon, alternateCodon, ...classifyCodons(referenceCodon, alternateCodon) }] };
}

export function sequenceExcerpt(sequence, center = 0, radius = 30) {
  const start = Math.max(0, Math.min(sequence.length, center - radius));
  const end = Math.min(sequence.length, start + radius * 2);
  return { text: sequence.slice(start, end), start, end, truncated: start > 0 || end < sequence.length };
}
