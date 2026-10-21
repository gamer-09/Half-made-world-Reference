import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { FlavorFinder } from '../components/FlavorFinder';

const originalFetch = globalThis.fetch;

function okJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

// The server reports which provider in the chain answered, so an answer that
// came from the fallback (the primary was rate-limited or down) is visible
// instead of looking exactly like the usual one.
describe('FlavorFinder — answered-by provider', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  async function runDescriptors() {
    render(<FlavorFinder />);
    fireEvent.change(screen.getByLabelText('Word, phrase, or action'), {
      target: { value: 'walked slowly' },
    });
    fireEvent.click(screen.getByText('Find flavor words'));
  }

  it('names the fallback provider that answered', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        subject: 'walked slowly',
        mode: 'descriptors',
        scene: '',
        note: '',
        raw: '',
        descriptors: ['lumbered', 'shuffled'],
        provider: {
          name: 'fallback',
          label: 'OpenRouter',
          model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
        },
      }),
    );

    await runDescriptors();

    await waitFor(() => expect(screen.getByText('OpenRouter')).toBeTruthy());
    expect(screen.getByText(/nvidia\/nemotron-3-ultra-550b-a55b:free/)).toBeTruthy();
    expect(screen.getByText(/the primary provider could not answer/)).toBeTruthy();
  });

  it('names the primary provider without a fallback warning', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        subject: 'walked slowly',
        mode: 'descriptors',
        scene: '',
        note: '',
        raw: '',
        descriptors: ['lumbered'],
        provider: { name: 'primary', label: 'Groq', model: 'openai/gpt-oss-20b' },
      }),
    );

    await runDescriptors();

    await waitFor(() => expect(screen.getByText('Groq')).toBeTruthy());
    expect(screen.getByText(/openai\/gpt-oss-20b/)).toBeTruthy();
    expect(screen.queryByText(/the primary provider could not answer/)).toBeNull();
  });

  it('still renders when the server sends no provider', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        subject: 'walked slowly',
        mode: 'descriptors',
        scene: '',
        note: '',
        raw: '',
        descriptors: ['lumbered'],
      }),
    );

    await runDescriptors();

    await waitFor(() => expect(screen.getByText('lumbered')).toBeTruthy());
    expect(screen.queryByText(/Answered by/)).toBeNull();
  });
});
