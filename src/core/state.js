export const PRACTICE_SEQUENCE = 'ATGGCTTTTGAACCCAAGGGCCAATGGGATTACCGTGAACCTGGCTAA';

export const state = {
  activeModule: 'overview',
  activeGene: null,
  activeTranscript: null,
  sequence: PRACTICE_SEQUENCE,
  sequenceLabel: 'Synthetic practice sequence',
  sequenceIsReference: false,
  lastMutation: null,
  explorerLevel: 'cell',
  aiConfigured: false,
  aiModel: '',
  notice: null
};

export function setNotice(message, kind = 'info') {
  state.notice = { message, kind, at: Date.now() };
  window.dispatchEvent(new CustomEvent('gv:notice'));
}

export function refresh() { window.dispatchEvent(new CustomEvent('gv:refresh')); }
export function navigate(moduleId) { window.dispatchEvent(new CustomEvent('gv:navigate', { detail: moduleId })); }
export function currentContext() {
  return {
    gene: state.activeGene ? { symbol: state.activeGene.symbol, name: state.activeGene.name, description: state.activeGene.description, source: 'NCBI Gene' } : null,
    transcript: state.activeTranscript ? { accession: state.activeTranscript.accession, title: state.activeTranscript.title, cdsLength: state.sequence.length } : null,
    sequenceLabel: state.sequenceLabel,
    sequenceLength: state.sequence.length,
    mutation: state.lastMutation ? {
      type: state.lastMutation.kind,
      position: state.lastMutation.position,
      reference: state.lastMutation.reference,
      alternate: state.lastMutation.alternate,
      effect: state.lastMutation.effect,
      note: state.lastMutation.note
    } : null
  };
}
