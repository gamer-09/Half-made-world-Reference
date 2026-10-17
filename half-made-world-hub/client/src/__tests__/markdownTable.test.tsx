import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Markdown } from '../components/QueryChatRoom';

afterEach(() => cleanup());

describe('Markdown — GFM tables', () => {
  it('renders a table with header and body cells', () => {
    const md = [
      '| Race | Power |',
      '| --- | --- |',
      '| Aelthar | **Highest** |',
      '| Cherubim | Apex |',
    ].join('\n');

    const { container } = render(<Markdown text={md} nameRe={null} />);

    const table = container.querySelector('table.chat-md-table');
    expect(table).toBeTruthy();
    expect(container.querySelectorAll('thead th').length).toBe(2);
    expect(container.querySelectorAll('tbody tr').length).toBe(2);

    expect(screen.getByText('Race')).toBeTruthy();
    expect(screen.getByText('Power')).toBeTruthy();
    expect(screen.getByText('Aelthar')).toBeTruthy();
    // inline markdown inside a cell still renders
    expect(container.querySelector('tbody strong')?.textContent).toBe('Highest');
  });

  it('supports alignment markers from the delimiter row', () => {
    const md = ['| L | C | R |', '| :--- | :---: | ---: |', '| a | b | c |'].join('\n');
    const { container } = render(<Markdown text={md} nameRe={null} />);

    const ths = container.querySelectorAll('thead th');
    expect((ths[0] as HTMLElement).style.textAlign).toBe('left');
    expect((ths[1] as HTMLElement).style.textAlign).toBe('center');
    expect((ths[2] as HTMLElement).style.textAlign).toBe('right');
  });

  it('does not treat a plain paragraph containing a pipe as a table', () => {
    const md = 'Use the arrow key | to move, then press enter.';
    const { container } = render(<Markdown text={md} nameRe={null} />);
    expect(container.querySelector('table')).toBeNull();
    expect(screen.getByText(/Use the arrow key/)).toBeTruthy();
  });

  it('stops the table at a blank line and renders following text', () => {
    const md = ['| A | B |', '| --- | --- |', '| 1 | 2 |', '', 'After the table.'].join('\n');
    const { container } = render(<Markdown text={md} nameRe={null} />);
    expect(container.querySelectorAll('tbody tr').length).toBe(1);
    expect(screen.getByText('After the table.')).toBeTruthy();
  });

  it('turns <br> inside a cell into a line break, not literal text', () => {
    const md = ['| Threat | Why |', '| --- | --- |', '| World Eater | Drains Veyn<br>Opens rifts |'].join('\n');
    const { container } = render(<Markdown text={md} nameRe={null} />);
    const cells = container.querySelectorAll('tbody td');
    expect(cells[1].querySelector('br')).toBeTruthy();
    expect(container.textContent).not.toContain('<br>');
    expect(container.textContent).toContain('Drains Veyn');
    expect(container.textContent).toContain('Opens rifts');
  });
});
