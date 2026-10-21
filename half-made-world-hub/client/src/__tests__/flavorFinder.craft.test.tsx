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

// The server's craft response carries NO "descriptors" key. Reading
// result.descriptors.length unguarded threw a TypeError during render, which
// unmounted the whole app and left a blank page.
describe('FlavorFinder — craft response without descriptors', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    globalThis.fetch = originalFetch;
  });

  it('renders a craft result that has no descriptors array', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        subject: 'how do I get back to the MC?',
        mode: 'craft',
        scene: 'The room was empty when she came back.',
        note: '',
        raw: '',
        advice: 'Use a section break before the cut.',
        suggestions: ['Section break before the cut'],
        design: { title: 'POV handoff', goal: 'Return to the MC cleanly', steps: ['Break'] },
      }),
    );

    render(<FlavorFinder />);

    fireEvent.click(screen.getByText('Scene craft'));
    fireEvent.change(screen.getByLabelText('What do you want help with?'), {
      target: { value: 'how do I get back to the MC?' },
    });
    fireEvent.click(screen.getByText('Craft the scene'));

    await waitFor(() => expect(screen.getByText('Use a section break before the cut.')).toBeTruthy());
    expect(screen.getByText('POV handoff')).toBeTruthy();
    expect(screen.getByText('Section break before the cut')).toBeTruthy();
  });

  it('renders a descriptors result that is missing fields instead of crashing', async () => {
    fetchMock.mockResolvedValue(okJson({ subject: 'walked slowly', mode: 'descriptors' }));

    render(<FlavorFinder />);

    fireEvent.change(screen.getByLabelText('Word, phrase, or action'), {
      target: { value: 'walked slowly' },
    });
    fireEvent.click(screen.getByText('Find flavor words'));

    await waitFor(() => expect(screen.getByText(/returned nothing usable/)).toBeTruthy());
  });

  it('renders sound words for a sound source', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        subject: 'a door slamming',
        mode: 'sound',
        scene: '',
        note: 'heavy and final',
        raw: '',
        descriptors: ['boom', 'thud', 'clack'],
      }),
    );

    render(<FlavorFinder />);

    fireEvent.click(screen.getByText('Sounds'));
    fireEvent.change(screen.getByLabelText('Sound you want to hear'), {
      target: { value: 'a door slamming' },
    });
    fireEvent.click(screen.getByText('Find sound words'));

    await waitFor(() => expect(screen.getByText('Sound words for “a door slamming”')).toBeTruthy());
    expect(screen.getByText('boom')).toBeTruthy();
    expect(screen.getByText('heavy and final')).toBeTruthy();
  });

  it('shows a flavored line of prose when the sound comes with one', async () => {
    fetchMock.mockResolvedValue(
      okJson({
        subject: 'a door slamming',
        mode: 'sound',
        note: '',
        raw: '',
        descriptors: ['bang', 'clatter'],
        scene: 'The front door bangs shut, a flat crack that rattles the glasses.',
      }),
    );

    render(<FlavorFinder />);

    fireEvent.click(screen.getByText('Sounds'));
    fireEvent.change(screen.getByLabelText('Sound you want to hear'), {
      target: { value: 'a door slamming' },
    });
    fireEvent.click(screen.getByText('Find sound words'));

    await waitFor(() => expect(screen.getByText('How it reads')).toBeTruthy());
    expect(
      screen.getByText('The front door bangs shut, a flat crack that rattles the glasses.'),
    ).toBeTruthy();
  });
});
