import { describe, expect, it } from 'vitest';
import { bilagUdenFil, indlaesLoenfil, sletBilag, soegBilag, tilbagefoer, type BilagPost } from './bilag';

const kr = (kroner: number) => Math.round(kroner * 100);
const fil = [
  'Type;Beløb',
  'Bruttoløn;80.000,00',
  'A-skat;-28.000,00',
  'AM-bidrag;-6.400,00',
  'Nettoløn;-45.600,00',
].join('\n');

describe('bilag og løn', () => {
  it('lander lønnen på kontiene og i personalenoten', () => {
    const loen = indlaesLoenfil(fil);
    expect(loen.fejl).toBeNull();
    expect(loen.poster.find((post) => post.tekst === 'Bruttoløn')).toMatchObject({ konto: '2210', beloeb: kr(80_000), kilde: 'loen' });
    expect(loen.poster.find((post) => post.tekst === 'A-skat')?.konto).toBe('6910');
    expect(loen.personale).toBe(kr(80_000));
    expect(loen.poster.reduce((sum, post) => sum + post.beloeb, 0)).toBe(0);
  });

  it('kan ikke slettes, kun tilbageføres, og kan findes igen', () => {
    const loen = indlaesLoenfil(fil);
    expect(sletBilag().fejl).toContain('ikke slettes');
    expect(loen.poster).toHaveLength(4);
    const foerste = loen.poster[0];
    const tilbage = tilbagefoer(loen.poster, foerste.id, '2024-10-01');
    expect(tilbage.fejl).toBeNull();
    expect(tilbage.poster).toHaveLength(5);
    expect(tilbage.poster.at(-1)).toMatchObject({
      beloeb: -foerste.beloeb,
      stornoAf: foerste.id,
      bilagsnummer: 'L1-T',
      momskode: '',
    });
    expect(tilbage.poster.reduce((sum, post) => sum + post.beloeb, 0)).toBe(-foerste.beloeb);
    expect(tilbagefoer(tilbage.poster, foerste.id, '2024-10-02').fejl).toContain('allerede');
    expect(tilbagefoer(tilbage.poster, `${foerste.id}-t`, '2024-10-03').fejl).toContain('tilbageføres');
    expect(soegBilag(loen.poster, 'A-skat').map((post) => post.konto)).toEqual(['6910']);
    expect(soegBilag(loen.poster, '80000').map((post) => post.konto)).toEqual(['2210']);
    expect(soegBilag(loen.poster, '80.000').map((post) => post.konto)).toEqual(['2210']);
    expect(soegBilag(loen.poster, 'loen').length).toBe(4);
    expect(soegBilag(loen.poster, 'L1').length).toBe(4);
  });

  it('afviser lønfil der ikke balancerer', () => {
    const ubalanceret = ['Type;Beløb', 'Bruttoløn;80.000,00', 'Nettoløn;-45.600,00'].join('\n');
    expect(indlaesLoenfil(ubalanceret).fejl).toContain('balancerer');
  });

  it('finder bilag via filnavn, og tilbageførsel har ingen fil', () => {
    const post: BilagPost = {
      id: 'fakt-1',
      kilde: 'indkoeb',
      bilagsnummer: 'F1',
      dato: '2024-09-01',
      tekst: 'Leverandør',
      konto: '6110',
      beloeb: kr(1_000),
      momskode: 'K25',
      stornoAf: null,
      fil: 'faktura.pdf',
    };
    const poster = [post];
    expect(soegBilag(poster, 'faktura.pdf')).toEqual([post]);
    const tilbage = tilbagefoer(poster, post.id, '2024-10-01');
    expect(tilbage.poster[0].fil).toBe('faktura.pdf');
    expect(tilbage.poster[1].fil).toBeNull();
    const udenFil: BilagPost = { ...post, id: 'manu-1', stornoAf: null, fil: null };
    expect(bilagUdenFil([post, udenFil, tilbage.poster[1]!])).toEqual([udenFil]);
  });
});
