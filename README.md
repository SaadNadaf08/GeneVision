# GeneVision — Genetics Learning Studio

A modular web application following the supplied GeneVision paper, with AR/VR intentionally deferred. It connects an interactive biological hierarchy, NCBI gene records, a DNA→mRNA→protein lesson, sequence mutation comparison, and an AI educational tutor.

## Included modules

- **Overview:** guided learning path and current project state.
- **Biological Explorer:** procedural Three.js scenes for cell, nucleus, chromosome, DNA, and a highlighted gene region. Models are educational illustrations, not to scale or atomistic.
- **Gene Explorer:** searches human gene records through NCBI Gene E-utilities, lists RefSeq mRNA transcripts, and retrieves a transcript CDS/protein sequence where present.
- **Expression Lab:** step-by-step coding DNA → mRNA → codons → amino-acid chain. Uses the standard genetic code; protein folding is not predicted.
- **Mutation Lab:** builds substitutions, insertions, and deletions; also lets learners edit a changed sequence directly and compare it with a reference. Shows changed bases, codon-level results, and frame-shift/in-frame notes when the inputs are coding sequences.
- **AI Gene Tutor:** provider-key-backed, server-side chat; receives the current gene/mutation summary as context and has explicit educational / non-clinical instructions.
- **Settings & Sources:** service status, data provenance, and key setup.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open the Vite local URL printed in the terminal, usually `http://127.0.0.1:5173`. The development runner starts the UI and local API server together. The server binds to localhost by default.

```bash
npm test
npm run build
```

Production preview (after building):

```bash
npm start
```

Open `http://127.0.0.1:4173`.

## AI provider setup — user action required

The AI tutor is integrated but needs your own provider key before it can answer live questions.

1. Copy `.env.example` to `.env` in the project root.
2. Fill `AI_API_KEY` with your provider key. Set `AI_MODEL` and `AI_BASE_URL` if needed.
3. Restart `npm run dev`.

The server expects an OpenAI-compatible `POST {AI_BASE_URL}/chat/completions` API by default (`AI_BASE_URL=https://api.openai.com/v1`). The key is read only by the Node server; it is not put in browser code, committed, or returned by the health route. If you use a provider with a different API format, its adapter will need a small server-side change. Never paste the secret key into chat, source code, or a committed file.

## NCBI data and sequences

Gene search is routed through the local Node server to NCBI E-utilities. The server caches responses and spaces requests to avoid unnecessary calls. `NCBI_EMAIL` and `NCBI_API_KEY` are optional environment settings for a project deployment. The demo starts with a **synthetic practice sequence**, not a human reference sequence. When you load an NCBI transcript, the app records the NCBI Gene/RefSeq identifiers in the displayed context. Check source records and current NCBI terms when presenting or redistributing data.

## Biology and safety limits

- Translation assumes the selected sequence is coding DNA in the correct 5′→3′ direction and reading frame. The app does not map a genomic variant across strand orientation, exons, UTRs, splice junctions, or transcript isoforms.
- The expression view transcribes the coding-strand representation by replacing T with U for clarity. It is a simplified educational view, not a full cell process simulation.
- Sequence consequences are deterministic codon-level calculations. The app does not infer pathogenicity, disease risk, protein function, clinical effect, or a real mutant 3D fold.
- Cell/nucleus/chromosome/DNA geometry is procedural and schematic. AR/VR has been intentionally omitted for later implementation.
- AI answers are educational and can be wrong. The tutor is instructed not to provide medical diagnoses or clinical variant interpretation.

## Tests

`node --test` checks sequence cleanup, transcription, translation, substitution classes, insertions/deletions, and edit validation. Live NCBI calls and AI provider responses depend on external services and are not part of the unit-test suite.
