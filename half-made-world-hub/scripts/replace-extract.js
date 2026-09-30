// Replace extractKeywords with a Set-based stopword filter (no regex escaping).
const fs = require('fs');
const p = require('path').join(__dirname, '..', 'server', 'index.js');
const src = fs.readFileSync(p, 'utf8');

const startMarker = 'function extractKeywords(question) {';
const endMarker = 'return [...expanded];';

const start = src.indexOf(startMarker);
const endMarkerIdx = src.indexOf(endMarker, start);
if (start === -1 || endMarkerIdx === -1) {
  console.log('MARKERS NOT FOUND. start:', start, 'endMarker:', endMarkerIdx);
  process.exit(1);
}
// include everything through the closing brace of the function
const closingBrace = src.indexOf('}', endMarkerIdx + endMarker.length);
const oldBlock = src.slice(start, closingBrace + 1);

const nl = oldBlock.includes('\r\n') ? '\r\n' : '\n';
const newBlock = [
  '// Stopword filter as an explicit Set - plain JS, no regex escaping to break.',
  'const STOPWORDS = new Set([',
  "  'who', 'what', 'where', 'when', 'why', 'how', 'is', 'are', 'was', 'were', 'does', 'do', 'did',",
  "  'can', 'could', 'would', 'should', 'may', 'might', 'shall', 'will', 'tell', 'me', 'about',",
  "  'the', 'a', 'an', 'of', 'in', 'on', 'to', 'for', 'with', 'and', 'or', 'that', 'this', 'it',",
  "  'i', 'my', 'we', 'you', 'your', 'he', 'she', 'they', 'its', 'his', 'her', 'their',",
  "  'be', 'been', 'being', 'have', 'has', 'had', 'from', 'by', 'at', 'as', 'if', 'into', 'not', 'please',",
  ']);',
  '',
  'function extractKeywords(question) {',
  "  const words = String(question || '')",
  '    .toLowerCase()',
  "    .replace(/[?!,;:'\"()]/g, ' ')",
  '    .split(/\\s+/)',
  '    .filter(Boolean);',
  '  const kept = words.filter((w) => !STOPWORDS.has(w));',
  '  // Expand shorthand terms ("mc") so curated tags like "main character" match.',
  '  const expanded = new Set(kept);',
  '  for (const w of kept) {',
  '    for (const syn of KEYWORD_SYNONYMS[w] || []) expanded.add(syn);',
  '  }',
  '  return [...expanded];',
  '}',
].join(nl);

fs.writeFileSync(p, src.replace(oldBlock, newBlock), 'utf8');
console.log('Replaced. Old block was', oldBlock.length, 'chars; new block is', newBlock.length, 'chars. Line ending:', JSON.stringify(nl));
