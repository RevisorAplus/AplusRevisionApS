import { describe, expect, it } from 'vitest';
import { beregnSambeskatning, beregnSkat, permanenteFraKonti, type SkatGrundlag } from './skat';

const kr = (kroner: number) => Math.round(kroner * 100);

function grundlag(over: Partial<SkatGrundlag> = {}): SkatGrundlag {
  return {
    form: 'aps',
    resultatFoerSkat: kr(180_000),
    ikkeFradrag: kr(8_000),
    stiftelse: 0,
    skattekontoRente: 0,
    regnskabsafskrivning: kr(40_000),
    skatteafskrivning: kr(25_000),
    fremfoertUnderskud: kr(20_000),
    modregnetUnderskud: 0,
    sambeskatning: false,
    administrationsselskab: false,
    regnskabsvaerdiAnlaeg: null,
    skattevaerdiAnlaeg: null,
    ...over,
  };
}

describe('skat', () => {
  it('regner 40.260 kr og årets resultat 139.740 kr uden et felt til skatten', () => {
    const skat = beregnSkat(grundlag());
    expect(skat.skattepligtigIndkomst).toBe(kr(183_000));
    expect(skat.aktuelSkat).toBe(kr(40_260));
    expect(skat.resultatEfterSkat).toBe(kr(139_740));
    expect(skat.balanceTekst).toBe('Skyldig selskabsskat');
    expect(skat.linjer.some((linje) => linje.tekst === 'Årets skat 22 %')).toBe(true);
  });

  it('tager stiftelse og skatterenter med og lader en umærket konto ligge', () => {
    const permanente = permanenteFraKonti([
      { rolle: 'stiftelse', beloeb: kr(5_000) },
      { rolle: 'skattekonto-rente', beloeb: kr(300) },
      { rolle: 'anden', beloeb: kr(9_000) },
    ]);
    expect(permanente).toEqual({ ikkeFradrag: 0, stiftelse: kr(5_000), skattekontoRente: kr(300) });
    const skat = beregnSkat(grundlag({ ...permanente, ikkeFradrag: 0, fremfoertUnderskud: 0, regnskabsafskrivning: 0, skatteafskrivning: 0, resultatFoerSkat: kr(180_000) }));
    expect(skat.skattepligtigIndkomst).toBe(kr(185_300));
  });

  it('sætter udskudt skat til forskellen gange 22 procent', () => {
    const skat = beregnSkat(grundlag({ regnskabsvaerdiAnlaeg: kr(100_000), skattevaerdiAnlaeg: kr(60_000) }));
    expect(skat.udskudtSkat).toBe(kr(8_800));
  });

  it('giver ikke selskabsskat til en enkeltmandsvirksomhed', () => {
    const skat = beregnSkat(grundlag({ form: 'enkeltmand' }));
    expect(skat.aktuelSkat).toBe(0);
    expect(skat.balanceTekst).toBeNull();
    expect(skat.note).toBeNull();
    expect(skat.fejl).toContain('selskabsskat');
  });

  it('fordeler sambeskatningen, så drift skylder bidrag til holding', () => {
    const faelles = grundlag({
      ikkeFradrag: 0,
      stiftelse: kr(23_000),
      regnskabsafskrivning: 0,
      skatteafskrivning: 0,
      fremfoertUnderskud: 0,
    });
    const kreds = beregnSambeskatning([
      { navn: 'Drift', grundlag: { ...faelles, administrationsselskab: false } },
      { navn: 'Holding', grundlag: { ...faelles, resultatFoerSkat: kr(-20_000), stiftelse: 0, administrationsselskab: true } },
    ]);
    const drift = kreds.selskaber.find((selskab) => selskab.navn === 'Drift');
    const holding = kreds.selskaber.find((selskab) => selskab.navn === 'Holding');
    expect(drift?.skattepligtigIndkomst).toBe(kr(183_000));
    expect(drift?.aktuelSkat).toBe(kr(40_260));
    expect(drift?.balanceTekst).toBe('Skyldigt sambeskatningsbidrag');
    expect(drift?.linjer.some((linje) => linje.tekst.startsWith('Modregnet underskud'))).toBe(true);
    expect(holding?.aktuelSkat).toBe(0);
    expect(holding?.nytFremfoertUnderskud).toBe(0);
    expect(kreds.skyldigTilSkat).toBe(kr(40_260));
    expect(kreds.tilgodehavende).toBe(kr(40_260));
    expect(drift?.note).toContain('solidarisk');
    expect(holding?.note).toContain('solidarisk');
  });

  it('afviser sambeskatning for en personligt ejet virksomhed', () => {
    const kreds = beregnSambeskatning([
      { navn: 'Drift', grundlag: grundlag() },
      { navn: 'Ejer', grundlag: grundlag({ form: 'enkeltmand' }) },
    ]);
    expect(kreds.fejl).toContain('sambeskatning');
    expect(kreds.selskaber).toHaveLength(0);
    expect(kreds.skyldigTilSkat).toBe(0);
  });
});
