import { describe, expect, it } from 'vitest';
import { bygNoter, egenkapitalforklaring } from './noter';

const kr = (kroner: number) => Math.round(kroner * 100);

describe('noter og egenkapital', () => {
  it('tager kun noter med, når posten findes', () => {
    const tom = bygNoter({ personale: 0, anlaegIBalancen: null, anlaegIKartotek: null, sambeskatning: false });
    expect(tom.noter).toHaveLength(0);
    const med = bygNoter({ personale: kr(70_000), anlaegIBalancen: kr(80_000), anlaegIKartotek: kr(80_000), sambeskatning: true });
    expect(med.noter.map((note) => note.titel)).toEqual(['Personaleomkostninger', 'Anlægsaktiver', 'Sambeskatning']);
    expect(med.fejl).toHaveLength(0);
    expect(bygNoter({ personale: 0, anlaegIBalancen: kr(80_000), anlaegIKartotek: kr(70_000), sambeskatning: false }).fejl[0]).toContain('ikke lig');
  });

  it('får primo plus bevægelser til at være ultimo', () => {
    const forklaring = egenkapitalforklaring(kr(40_000), [{ tekst: 'Årets resultat', beloeb: kr(139_740) }], kr(179_740));
    expect(forklaring.stemmer).toBe(true);
    expect(forklaring.linjer.at(-1)?.beloeb).toBe(kr(179_740));
    expect(egenkapitalforklaring(kr(40_000), [{ tekst: 'Årets resultat', beloeb: kr(139_740) }], kr(40_000)).stemmer).toBe(false);
  });
});
