import { describe, expect, it } from 'vitest';
import type { BilagPost } from './bilag';
import { registrerBogfoering, registrerTilbagefoering, sporFor, type SporLinje } from './spor';
import { tilbagefoer } from './bilag';

const bilag: BilagPost = {
  id: 'b-1',
  kilde: 'test',
  bilagsnummer: 'T1',
  dato: '2024-09-01',
  tekst: 'Køb kontor',
  konto: '3410',
  beloeb: -50_000,
  momskode: 'K25',
  stornoAf: null,
};

describe('spor', () => {
  it('skriver linjer ved bogføring og tilbageførsel uden sletning', () => {
    let spor: SporLinje[] = [];
    spor = registrerBogfoering(spor, bilag, '2024-09-01T10:00:00.000Z');
    const tilbage = tilbagefoer([bilag], bilag.id, '2024-10-01');
    expect(tilbage.fejl).toBeNull();
    const modpost = tilbage.poster.at(-1)!;
    spor = registrerTilbagefoering(spor, bilag, modpost, '2024-10-01T12:00:00.000Z');

    const linjer = sporFor('b-1', spor);
    expect(linjer).toHaveLength(2);
    expect(linjer[0]).toMatchObject({ handling: 'bogfoert', bilagsId: 'b-1', tekst: 'Køb kontor' });
    expect(linjer[1]).toMatchObject({ handling: 'tilbagefoert', bilagsId: 'b-1' });
    expect(linjer[1].tidspunkt).toBe('2024-10-01T12:00:00.000Z');
  });
});
