// Debug Warpstep scoring in broadSearch
const M = require('../server/index.js');
const world = require('../server/data/world.json');

const q = 'how long ago was the broken crown rebellion and how far can an angel teleport with warpstep';
const keywords = M.extractKeywords(q);
console.log('keywords:', keywords);

const warp = world.find((e) => e.name === 'Warpstep');
console.log('Warpstep entry found:', !!warp);
if (warp) {
  console.log('category:', warp.category);
  console.log('tags:', warp.tags);
  const name = warp.name.toLowerCase();
  let score = 0;
  const tags = (warp.tags || []).map((t) => String(t).toLowerCase());
  const desc = (warp.description || '').toLowerCase();
  for (const kw of keywords) {
    if (name.includes(kw)) score += 5;
    if ((warp.category || '').toLowerCase().includes(kw)) score += 2;
    if ((warp.subtitle || '').toLowerCase().includes(kw)) score += 3;
    if (tags.some((t) => t === kw)) score += 6;
    else if (tags.some((t) => t.includes(kw))) score += 3;
    if (desc.includes(kw)) score += 3;
  }
  console.log('expected score:', score);

  // is Warpstep in the scored list at all?
  const res = M.broadSearch(q);
  console.log('in results:', res.entries.some((e) => e.name === 'Warpstep'));

  // which entries outrank ~9?
  const scored = world
    .map((e) => {
      const n = e.name.toLowerCase();
      let s = 0;
      const tg = (e.tags || []).map((t) => String(t).toLowerCase());
      const de = (e.description || '').toLowerCase();
      for (const kw of keywords) {
        if (n.includes(kw)) s += 5;
        if (tg.some((t) => t === kw)) s += 6;
        if (de.includes(kw)) s += 3;
      }
      return { name: e.name, s };
    })
    .filter((x) => x.s >= 9)
    .sort((a, b) => b.s - a.s);
  console.log('entries with score >= 9:', scored.length);
  console.log(scored.slice(0, 30).map((x) => x.name + '=' + x.s).join('\n'));
}
