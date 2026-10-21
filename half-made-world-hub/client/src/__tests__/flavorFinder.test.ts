import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { findFlavor } from '../api';
import type { FlavorResult } from '../api';

const originalFetch = global.fetch;

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
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
