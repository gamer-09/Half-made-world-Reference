import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { findFlavor } from '../api';
import type { FlavorResult } from '../api';

const originalFetch = globalThis.fetch;

function okJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

describe('findFlavor', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('posts the subject and mode, defaulting to descriptors', async () => {
    const payload: FlavorResult = {
      subject: 'walked slowly',
      mode: 'descriptors',
      scene: '',
      descriptors: ['lumbered', 'crept'],
      note: '',
      raw: '',
    };
    fetchMock.mockResolvedValue(okJson(payload));

    const result = await findFlavor('walked slowly');

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/ai/flavor');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({ subject: 'walked slowly', mode: 'descriptors' });
  });

  it('passes scene mode through', async () => {
    fetchMock.mockResolvedValue(
      okJson({ subject: 'x', mode: 'scene', scene: 'rewritten', descriptors: [], note: '', raw: '' }),
    );

    await findFlavor('x', 'scene');

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ subject: 'x', mode: 'scene' });
  });

  it('passes craft mode through and returns advice, suggestions and a design', async () => {
    // The craft response has NO "descriptors" key at all — the UI must not
    // assume it is there (reading it unguarded used to blank the whole page).
    const payload = {
      subject: 'how do I get back to the MC?',
      mode: 'craft',
      scene: 'The room was empty...',
      note: 'a short line',
      raw: '',
      advice: 'Use a section break.',
      suggestions: ['Section break before the cut'],
      design: {
        title: 'POV handoff',
        goal: 'Return to the MC cleanly',
        steps: ['Break', 'Re-enter'],
        cues: ['A door closing'],
        pitfalls: ['Head-hopping'],
        notes: 'Keep the side scene short',
      },
    } as unknown as FlavorResult;
    fetchMock.mockResolvedValue(okJson(payload));

    const result = await findFlavor('how do I get back to the MC?', 'craft');

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      subject: 'how do I get back to the MC?',
      mode: 'craft',
    });
    expect(result.advice).toBe('Use a section break.');
    expect(result.suggestions).toEqual(['Section break before the cut']);
    expect(result.design?.steps).toEqual(['Break', 'Re-enter']);
    expect(result.descriptors).toBeUndefined();
  });

  it('surfaces a 429 as AiRateLimitError with the countdown', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Busy', retryAfterSeconds: 42 }),
    } as unknown as Response);

    await expect(findFlavor('walked slowly')).rejects.toMatchObject({
      name: 'AiRateLimitError',
      retryAfterSeconds: 42,
    });
  });
});
