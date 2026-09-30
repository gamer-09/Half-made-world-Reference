// Definitive check: what regex does the LOADED module actually run?
const M = require('../server/index.js');
const f = M.extractKeywords;
const src = f.toString();

// Find the char codes around the first \b in the source
const i = src.indexOf('b(who');
const around = src.slice(Math.max(0, i - 4), i + 8);
console.log('around first b(who):', JSON.stringify(around));
console.log('charCodes:', [...around].map((c) => c.charCodeAt(0)).join(','));

// Behavior probe: stopword-only input. If the regex works, result is [].
console.log('stopword-only probe:', JSON.stringify(f('who what when why is are the and')));
console.log('mixed probe:', JSON.stringify(f('the crown and how was warpstep')));

// Rebuild the same regex from the source text and test it separately
const line = src.split('\n').find((l) => l.includes('who|what'));
const start = line.indexOf('/' ) + 1;
const end = line.lastIndexOf('/g');
const body = line.slice(start, end);
console.log('regex body first 12 chars:', JSON.stringify(body.slice(0, 12)));
console.log('body charCodes:', [...body.slice(0, 6)].map((c) => c.charCodeAt(0)).join(','));
try {
  const re = new RegExp(body, 'g');
  console.log('rebuilt regex on "how was the crown":', JSON.stringify('how was the crown'.replace(re, ' ')));
} catch (e) {
  console.log('rebuilt regex error:', e.message);
}
