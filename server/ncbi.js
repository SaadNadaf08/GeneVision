const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
const cache = new Map();
let lastCall = 0;

function fromCache(key) {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) return entry.value;
  if (entry) cache.delete(key);
  return null;
}
function saveCache(key, value, ttl = 30 * 60 * 1000) { cache.set(key, { value, expires: Date.now() + ttl }); return value; }
async function throttle() {
  const wait = Math.max(0, 380 - (Date.now() - lastCall));
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  lastCall = Date.now();
}
async function eutils(endpoint, params) {
  await throttle();
  const url = new URL(endpoint, EUTILS);
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  if (process.env.NCBI_EMAIL) url.searchParams.set('email', process.env.NCBI_EMAIL);
  if (process.env.NCBI_API_KEY) url.searchParams.set('api_key', process.env.NCBI_API_KEY);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'GeneVisionEducation/1.0 (student learning prototype)' } });
    if (!response.ok) throw new Error(`NCBI request returned ${response.status}.`);
    const content = await response.text();
    if (endpoint.endsWith('.fcgi') && params.retmode === 'json') return JSON.parse(content);
    return content;
  } finally { clearTimeout(timer); }
}

function summaryEntries(data) {
  const result = data?.result || {};
  return (result.uids || []).map(uid => result[uid]).filter(Boolean);
}

export async function searchGenes(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (!/^[A-Za-z0-9._ -]{1,40}$/.test(query)) throw new Error('Enter a gene symbol or short gene name using letters and numbers.');
  const key = `gene-search:${query.toLowerCase()}`;
  const cached = fromCache(key); if (cached) return cached;
  const term = `${query}[Gene Name] AND Homo sapiens[Organism]`;
  const search = await eutils('esearch.fcgi', { db:'gene', term, retmode:'json', retmax:8 });
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return saveCache(key, { query, results: [], source: 'NCBI Gene' }, 10 * 60 * 1000);
  const summary = await eutils('esummary.fcgi', { db:'gene', id:ids.join(','), retmode:'json' });
  const results = summaryEntries(summary).map(item => {
    const location = item.genomicinfo?.[0] || {};
    const start = Number(location.chrstart), stop = Number(location.chrstop);
    return {
      uid: String(item.uid), symbol: item.name || query,
      name: item.nomenclaturename || item.description || item.name || query,
      description: item.description || item.nomenclaturename || '',
      summary: item.summary || '', organism: item.organism?.scientificname || 'Homo sapiens',
      chromosome: location.chrloc || item.chromosome || '',
      location: Number.isFinite(start) && Number.isFinite(stop) ? `${Math.min(start, stop).toLocaleString()}–${Math.max(start, stop).toLocaleString()}` : '',
      strand: Number.isFinite(start) && Number.isFinite(stop) ? (start <= stop ? '+' : '−') : '',
      aliases: item.otheraliases || '',
      source: 'NCBI Gene', sourceUrl: `https://www.ncbi.nlm.nih.gov/gene/${encodeURIComponent(item.uid)}`
    };
  });
  return saveCache(key, { query, results, source: 'NCBI Gene' });
}

export async function getTranscripts(geneId, symbol) {
  const id = String(geneId || '');
  const geneSymbol = String(symbol || '').trim();
  if (!/^\d+$/.test(id) || !/^[A-Za-z0-9._-]{1,30}$/.test(geneSymbol)) throw new Error('Gene record is missing a valid identifier or symbol.');
  const key = `transcripts:${id}:${geneSymbol.toLowerCase()}`;
  const cached = fromCache(key); if (cached) return cached;
  const term = `${geneSymbol}[Gene] AND Homo sapiens[Organism] AND RefSeq[filter] AND mRNA[filter]`;
  const search = await eutils('esearch.fcgi', { db:'nuccore', term, retmode:'json', retmax:12 });
  const ids = search?.esearchresult?.idlist || [];
  if (!ids.length) return saveCache(key, { geneId:id, symbol:geneSymbol, transcripts:[], source:'NCBI RefSeq' }, 10 * 60 * 1000);
  const summary = await eutils('esummary.fcgi', { db:'nuccore', id:ids.join(','), retmode:'json' });
  const transcripts = summaryEntries(summary).map(item => ({
    uid: String(item.uid), accession: item.accessionversion || item.caption,
    title: item.title || item.caption || 'RefSeq transcript', length: Number(item.slen) || 0,
    isLikelyCanonical: /transcript variant 1\b/i.test(item.title || ''),
    sourceUrl: `https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(item.accessionversion || item.uid)}`
  })).sort((a,b) => Number(b.isLikelyCanonical) - Number(a.isLikelyCanonical) || a.title.localeCompare(b.title));
  return saveCache(key, { geneId:id, symbol:geneSymbol, transcripts, source:'NCBI RefSeq' });
}

function parseFasta(text) {
  const lines = String(text || '').trim().split(/\r?\n/);
  const header = lines[0]?.startsWith('>') ? lines.shift().slice(1) : '';
  return { header, sequence: lines.join('').replace(/[^A-Za-z*]/g, '').toUpperCase() };
}

export async function getTranscriptSequences(uid) {
  const id = String(uid || '');
  if (!/^\d+$/.test(id)) throw new Error('Invalid NCBI transcript record identifier.');
  const key = `transcript-sequence:${id}`;
  const cached = fromCache(key); if (cached) return cached;
  const cdsFasta = await eutils('efetch.fcgi', { db:'nuccore', id, rettype:'fasta_cds_na', retmode:'text' });
  const cds = parseFasta(cdsFasta);
  if (!cds.sequence) throw new Error('NCBI did not return a coding sequence for this transcript. Try another transcript or a protein-coding gene.');
  let protein = { header:'', sequence:'' };
  try { protein = parseFasta(await eutils('efetch.fcgi', { db:'nuccore', id, rettype:'fasta_cds_aa', retmode:'text' })); } catch { /* some records lack a translated CDS */ }
  const accession = cds.header.match(/(?:^|\|)([A-Z]{1,4}_\d+(?:\.\d+)?)(?:_|\s|$)/)?.[1] || '';
  const proteinAccession = cds.header.match(/\[protein_id=([^\]]+)\]/)?.[1] || '';
  const record = { uid:id, accession, proteinAccession, title:cds.header, cds:cds.sequence, protein:protein.sequence, source:'NCBI RefSeq', sourceUrl:`https://www.ncbi.nlm.nih.gov/nuccore/${encodeURIComponent(accession || id)}` };
  return saveCache(key, record);
}
