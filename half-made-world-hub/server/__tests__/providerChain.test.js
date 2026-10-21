// The HTTP AI backend walks a chain of providers: when the primary cannot
// answer — rate-limited, down, empty answer — the fallback provider is tried
// before the request fails. Run with: npm run test:server
const test = require('node:test');
const assert = require('node:assert/strict');

const { splitList, providerLabel, makeProvider, buildProviderChain, askHttp } = require('../index.js');

// A fetch stub that answers per endpoint: 'ok' returns a completion, anything
// else returns that HTTP status.
function stubFetch(routes, calls) {
  return async (url) => {
    calls.push(url);
    const host = url.split('/')[2];
    const outcome = routes[host] ?? 'ok';
    if (outcome === 'ok') {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ choices: [{ message: { content: `answer from ${host}` } }] }),
      };
    }
    return {
      ok: false,
      status: outcome,
      text: async () => JSON.stringify({ error: { message: `boom ${outcome}` } }),
    };
  };
}

const groq = () => makeProvider({
  name: 'primary',
  baseUrl: 'https://api.groq.com/openai/v1',
  apiKey: 'gsk-test',
  models: ['openai/gpt-oss-20b'],
});

const openrouter = () => makeProvider({
  name: 'fallback',
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: 'sk-or-test',
  models: ['nvidia/nemotron-3-ultra-550b-a55b:free'],
});

test('splitList trims and drops empty entries', () => {
  assert.deepEqual(splitList(' a , b ,, c '), ['a', 'b', 'c']);
  assert.deepEqual(splitList(''), []);
  assert.deepEqual(splitList(undefined), []);
});

test('providerLabel names the well-known hosts', () => {
  assert.equal(providerLabel('https://api.groq.com/openai/v1'), 'Groq');
  assert.equal(providerLabel('https://openrouter.ai/api/v1'), 'OpenRouter');
  assert.equal(providerLabel('http://localhost:11434/v1'), 'Local model');
  assert.equal(providerLabel('https://ai.example.com/v1'), 'ai.example.com');
});

test('the fallback joins the chain only with its own key', () => {
  const primary = groq();
  const noKey = { ...openrouter(), apiKey: '' };
  assert.equal(buildProviderChain(primary, noKey).length, 1);

  const withKey = openrouter();
  const chain = buildProviderChain(primary, withKey);
  assert.equal(chain.length, 2);
  assert.equal(chain[0].name, 'primary');
  assert.equal(chain[1].name, 'fallback');
});

test('a fallback that is the primary endpoint is skipped', () => {
  const primary = groq();
  const same = { ...openrouter(), baseUrl: primary.baseUrl, apiKey: primary.apiKey };
  assert.equal(buildProviderChain(primary, same).length, 1);
});

test('a failed primary falls through to the fallback provider', async (t) => {
  const calls = [];
  t.after(() => {
    global.fetch = originalFetch;
  });
  const originalFetch = global.fetch;
  global.fetch = stubFetch({ 'api.groq.com': 429, 'openrouter.ai': 'ok' }, calls);

  const result = await askHttp('hello', 100, 'low', {}, buildProviderChain(groq(), openrouter()));
  assert.equal(result.answer, 'answer from openrouter.ai');
  assert.equal(result.provider.name, 'fallback');
  assert.equal(result.provider.label, 'OpenRouter');
  assert.deepEqual(
    calls.map((u) => u.split('/')[2]),
    ['api.groq.com', 'openrouter.ai'],
  );
});

test('a healthy primary is used and the fallback is never called', async (t) => {
  const calls = [];
  t.after(() => {
    global.fetch = originalFetch;
  });
  const originalFetch = global.fetch;
  global.fetch = stubFetch({ 'api.groq.com': 'ok', 'openrouter.ai': 'ok' }, calls);

  const result = await askHttp('hello', 100, 'low', {}, buildProviderChain(groq(), openrouter()));
  assert.equal(result.answer, 'answer from api.groq.com');
  assert.equal(result.provider.name, 'primary');
  assert.deepEqual(
    calls.map((u) => u.split('/')[2]),
    ['api.groq.com'],
  );
});

test('when every provider fails the error of the last one surfaces', async (t) => {
  const calls = [];
  t.after(() => {
    global.fetch = originalFetch;
  });
  const originalFetch = global.fetch;
  global.fetch = stubFetch({ 'api.groq.com': 429, 'openrouter.ai': 500 }, calls);

  await assert.rejects(
    () => askHttp('hello', 100, 'low', {}, buildProviderChain(groq(), openrouter())),
    /boom 500/,
  );
  assert.equal(calls.length, 2);
});
