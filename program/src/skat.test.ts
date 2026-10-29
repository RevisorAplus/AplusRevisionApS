import { describe, expect, it } from 'vitest';
import {
  BRO,
  HAEFTELSESTEKST,
  SELSKABSSKAT_PROCENT,
  beregnSambeskatning,
  beregnSkat,
  beregnUdskudtSkat,
  brugAfFremfoert,
  grundbeloebOere,
  GRUNDBELOEB_MANGLER,
  kontrollerSkattebro,
  permanenteFraKonti,
  type SkatGrundlag,
} from './skat';

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

const rent = (over: Partial<SkatGrundlag> = {}) =>
  grundlag({ ikkeFradrag: 0, regnskabsafskrivning: 0, skatteafskrivning: 0, fremfoertUnderskud: 0, ...over });

const linje = (skat: { linjer: { tekst: string; beloeb: number }[] }, tekst: string) => skat.linjer.find((kandidat) => kandidat.tekst === tekst);

describe('skattebro', () => {
  it('har satsen som indstilling på 22 procent', () => {
    expect(SELSKABSSKAT_PROCENT).toBe(22);
  });

  it('lægger stiftelsesomkostninger til, så de ikke giver fradrag', () => {
    const skat = beregnSkat(rent({ resultatFoerSkat: kr(100_000), stiftelse: kr(5_000) }));
    expect(linje(skat, BRO.stiftelse)?.beloeb).toBe(kr(5_000));
    expect(skat.skattepligtigIndkomst).toBe(kr(105_000));
    expect(skat.aktuelSkat).toBe(kr(23_100));
    expect(skat.aktuelSkat).not.toBe(kr(22_000));
  });

  it('lægger renter til Skattekontoen til, så de ikke giver fradrag', () => {
    const skat = beregnSkat(rent({ resultatFoerSkat: kr(100_000), skattekontoRente: kr(450) }));
    expect(linje(skat, BRO.skattekontoRente)?.beloeb).toBe(kr(450));
    expect(skat.skattepligtigIndkomst).toBe(kr(100_450));
    expect(skat.aktuelSkat).toBe(kr(22_099));
  });

  it('henter stiftelse og skatterenter fra mærkede konti, uanset hvor mange der er', () => {
    const permanente = permanenteFraKonti([
      { rolle: 'stiftelse', beloeb: kr(3_000) },
      { rolle: 'stiftelse', beloeb: kr(2_000) },
      { rolle: 'skattekonto-rente', beloeb: kr(120) },
      { rolle: 'skattekonto-rente', beloeb: kr(30) },
      { rolle: 'ikke-fradrag', beloeb: kr(1_000) },
    ]);
    expect(permanente).toEqual({ ikkeFradrag: kr(1_000), stiftelse: kr(5_000), skattekontoRente: kr(150) });
    const skat = beregnSkat(rent({ resultatFoerSkat: kr(50_000), ...permanente }));
    expect(skat.linjer.map((kandidat) => kandidat.tekst)).toEqual([
      BRO.resultat,
      BRO.ikkeFradrag,
      BRO.stiftelse,
      BRO.skattekontoRente,
      BRO.skattepligtig,
      'Årets skat 22 %',
    ]);
  });

  it('lader hvert trin være en linje, hvor summen af trinene er den skattepligtige indkomst', () => {
    const skat = beregnSkat(grundlag({ stiftelse: kr(2_500), skattekontoRente: kr(75) }));
    const indeks = skat.linjer.findIndex((kandidat) => kandidat.tekst === BRO.skattepligtig);
    const sum = skat.linjer.slice(0, indeks).reduce((acc, kandidat) => acc + kandidat.beloeb, 0);
    expect(sum).toBe(skat.skattepligtigIndkomst);
    expect(kontrollerSkattebro(skat)).toEqual([]);
  });

  it('kan ikke få summen overskrevet', () => {
    const skat = beregnSkat(grundlag());
    expect(() => {
      (skat as { aktuelSkat: number }).aktuelSkat = 0;
    }).toThrow(TypeError);
    expect(() => {
      (skat.linjer[skat.linjer.length - 1] as { beloeb: number }).beloeb = 0;
    }).toThrow(TypeError);
    expect(() => skat.linjer.push({ tekst: 'Rettelse', beloeb: kr(-1_000) })).toThrow(TypeError);

    const aendret = { ...skat, aktuelSkat: kr(10_000) };
    expect(kontrollerSkattebro(aendret).join(' ')).toContain('Årets skat');
    const aendretTrin = { ...skat, linjer: skat.linjer.map((kandidat) => (kandidat.tekst === BRO.stiftelse || kandidat.tekst === BRO.ikkeFradrag ? { ...kandidat, beloeb: 0 } : kandidat)) };
    expect(kontrollerSkattebro(aendretTrin).join(' ')).toContain('skattepligtige indkomst');
  });

  it('har intet felt, hvor årets skat, udskudt skat eller bidraget kan tastes', () => {
    const felter = Object.keys(grundlag());
    for (const forbudt of ['aktuelSkat', 'aaretsSkat', 'udskudtSkat', 'sambeskatningsbidrag', 'skat']) {
      expect(felter).not.toContain(forbudt);
    }
  });

  it('giver null for udskudt skat, når en af værdierne mangler, i stedet for at gætte', () => {
    expect(beregnSkat(grundlag({ regnskabsvaerdiAnlaeg: kr(100_000), skattevaerdiAnlaeg: null })).udskudtSkat).toBeNull();
    expect(beregnSkat(grundlag({ regnskabsvaerdiAnlaeg: null, skattevaerdiAnlaeg: kr(60_000) })).udskudtSkat).toBeNull();
    expect(beregnSkat(grundlag({ regnskabsvaerdiAnlaeg: kr(50_000), skattevaerdiAnlaeg: kr(80_000) })).udskudtSkat).toBe(kr(-6_600));
    expect(beregnUdskudtSkat(kr(100_000), kr(60_000))).toBe(kr(8_800));
    expect(beregnUdskudtSkat(kr(100_000), null)).toBeNull();
  });

  it('giver hverken skat, balancepost, note eller hæftelse til en enkeltmandsvirksomhed', () => {
    const skat = beregnSkat(grundlag({ form: 'enkeltmand', stiftelse: kr(5_000) }));
    expect(skat.aktuelSkat).toBe(0);
    expect(skat.linjer).toHaveLength(0);
    expect(skat.note).toBeNull();
    expect(skat.haeftelse).toBeNull();
    expect(skat.resultatEfterSkat).toBe(kr(180_000));
    const medSambeskatning = beregnSkat(grundlag({ form: 'enkeltmand', sambeskatning: true }));
    expect(medSambeskatning.fejl).toContain('sambeskatning');
    expect(medSambeskatning.haeftelse).toBeNull();
  });

  it('giver selskabsskat til et A/S', () => {
    expect(beregnSkat(grundlag({ form: 'as' })).aktuelSkat).toBe(kr(40_260));
  });

  it('ruller resten af underskuddet, så år to bruger det uden ny indtastning', () => {
    const aar1 = beregnSkat(rent({ resultatFoerSkat: kr(-50_000), fremfoertUnderskud: kr(20_000) }));
    expect(aar1.aktuelSkat).toBe(0);
    expect(aar1.nytFremfoertUnderskud).toBe(kr(70_000));

    const aar2 = beregnSkat(rent({ resultatFoerSkat: kr(100_000), fremfoertUnderskud: aar1.nytFremfoertUnderskud }));
    expect(linje(aar2, BRO.fremfoert)?.beloeb).toBe(kr(-70_000));
    expect(aar2.skattepligtigIndkomst).toBe(kr(30_000));
    expect(aar2.aktuelSkat).toBe(kr(6_600));
    expect(aar2.nytFremfoertUnderskud).toBe(0);

    const aar2Lille = beregnSkat(rent({ resultatFoerSkat: kr(30_000), fremfoertUnderskud: aar1.nytFremfoertUnderskud }));
    expect(aar2Lille.aktuelSkat).toBe(0);
    expect(aar2Lille.nytFremfoertUnderskud).toBe(kr(40_000));
  });

  it('bruger ikke et modregnet underskud, når sambeskatning er slået fra', () => {
    const skat = beregnSkat(rent({ resultatFoerSkat: kr(100_000), modregnetUnderskud: kr(30_000), sambeskatning: false }));
    expect(skat.skattepligtigIndkomst).toBe(kr(100_000));
    expect(linje(skat, BRO.modregnet)).toBeUndefined();
    expect(skat.haeftelse).toBeNull();
    expect(kontrollerSkattebro(skat)).toEqual([]);
  });
});

describe('national sambeskatning', () => {
  const drift = (over: Partial<SkatGrundlag> = {}) => rent({ resultatFoerSkat: kr(200_000), ...over });
  const holding = (over: Partial<SkatGrundlag> = {}) => rent({ resultatFoerSkat: kr(-50_000), administrationsselskab: true, ...over });

  it('modregner holdings underskud i drift, før skatten beregnes', () => {
    const kreds = beregnSambeskatning([
      { navn: 'Drift', grundlag: drift() },
      { navn: 'Holding', grundlag: holding() },
    ]);
    const [d, h] = kreds.selskaber;
    expect(linje(d, BRO.modregnet)?.beloeb).toBe(kr(-50_000));
    expect(d.skattepligtigIndkomst).toBe(kr(150_000));
    expect(d.aktuelSkat).toBe(kr(33_000));
    expect(d.aktuelSkat).not.toBe(kr(44_000));
    expect(kontrollerSkattebro(d)).toEqual([]);
    expect(h.aktuelSkat).toBe(0);
    expect(h.nytFremfoertUnderskud).toBe(0);
    expect(kreds.skyldigTilSkat).toBe(kr(33_000));
  });

  it('lader drift skylde bidrag til holding og holding skylde skatten til Skattestyrelsen', () => {
    const kreds = beregnSambeskatning([
      { navn: 'Drift', grundlag: drift() },
      { navn: 'Holding', grundlag: holding() },
    ]);
    const [d, h] = kreds.selskaber;
    expect(d.balanceTekst).toBe('Skyldigt sambeskatningsbidrag');
    expect(d.sambeskatningsbidrag).toBe(kr(33_000));
    expect(d.balanceposter).toEqual([{ tekst: 'Skyldigt sambeskatningsbidrag', beloeb: kr(33_000), modpart: 'Holding' }]);
    expect(d.balanceposter.some((post) => post.modpart === 'Skattestyrelsen')).toBe(false);
    expect(h.balanceposter).toEqual([
      { tekst: 'Tilgodehavende sambeskatningsbidrag', beloeb: kr(33_000), modpart: 'Drift' },
      { tekst: 'Skyldig selskabsskat', beloeb: kr(33_000), modpart: 'Skattestyrelsen' },
    ]);
    expect(kreds.tilgodehavende).toBe(kr(33_000));
    expect(d.haeftelse).toBe(HAEFTELSESTEKST);
    expect(h.haeftelse).toBe(HAEFTELSESTEKST);
  });

  it('modregner aldrig mere end overskuddet og ruller resten i det selskab, der har underskuddet', () => {
    const kreds = beregnSambeskatning([
      { navn: 'Drift', grundlag: drift({ resultatFoerSkat: kr(40_000) }) },
      { navn: 'Holding', grundlag: holding({ resultatFoerSkat: kr(-100_000) }) },
    ]);
    const [d, h] = kreds.selskaber;
    expect(d.aktuelSkat).toBe(0);
    expect(d.skattepligtigIndkomst).toBe(0);
    expect(linje(h, BRO.afgivet)?.beloeb).toBe(kr(40_000));
    expect(h.nytFremfoertUnderskud).toBe(kr(60_000));
    expect(kreds.skyldigTilSkat).toBe(0);
    expect(d.balanceposter).toEqual([]);
  });

  it('bruger først selskabets eget fremførte underskud og derefter sambeskatningen', () => {
    const kreds = beregnSambeskatning([
      { navn: 'Drift', grundlag: drift({ fremfoertUnderskud: kr(30_000) }) },
      { navn: 'Holding', grundlag: holding() },
    ]);
    const [d] = kreds.selskaber;
    expect(linje(d, BRO.fremfoert)?.beloeb).toBe(kr(-30_000));
    expect(linje(d, BRO.modregnet)?.beloeb).toBe(kr(-50_000));
    expect(d.skattepligtigIndkomst).toBe(kr(120_000));
    expect(d.nytFremfoertUnderskud).toBe(0);
  });

  it('gør aldrig et andet selskabs underskud til eget fremført underskud', () => {
    const skat = beregnSkat(rent({ resultatFoerSkat: kr(40_000), modregnetUnderskud: kr(100_000), sambeskatning: true }));
    expect(linje(skat, BRO.modregnet)?.beloeb).toBe(kr(-40_000));
    expect(skat.skattepligtigIndkomst).toBe(0);
    expect(skat.nytFremfoertUnderskud).toBe(0);
  });

  it('kræver præcis ét administrationsselskab og mindst to selskaber', () => {
    expect(beregnSambeskatning([{ navn: 'Drift', grundlag: drift() }, { navn: 'Holding', grundlag: holding({ administrationsselskab: false }) }]).fejl).toContain('administrationsselskab');
    expect(beregnSambeskatning([{ navn: 'Drift', grundlag: drift({ administrationsselskab: true }) }, { navn: 'Holding', grundlag: holding() }]).fejl).toContain('administrationsselskab');
    expect(beregnSambeskatning([{ navn: 'Holding', grundlag: holding() }]).fejl).toContain('to selskaber');
  });
});

describe('begrænset fremførsel af underskud efter selskabsskattelovens § 12, stk. 2', () => {
  it('har grundbeløbet i øre for 2025, 2026 og 2027 og null for et ukendt år', () => {
    expect(grundbeloebOere(2025)).toBe(kr(20_829_000));
    expect(grundbeloebOere(2026)).toBe(kr(21_830_700));
    expect(grundbeloebOere(2027)).toBe(kr(22_466_700));
    expect(grundbeloebOere(2024)).toBeNull();
    expect(grundbeloebOere(2028)).toBeNull();
    expect(grundbeloebOere(2026.5)).toBeNull();
  });

  it('bruger underskuddet fuldt ud op til grundbeløbet', () => {
    expect(brugAfFremfoert(kr(1_000_000), kr(400_000), 2026)).toEqual({ brugt: kr(400_000), rest: 0, fejl: null });
    expect(brugAfFremfoert(kr(1_000_000), kr(3_000_000), 2026)).toEqual({ brugt: kr(1_000_000), rest: kr(2_000_000), fejl: null });
    expect(brugAfFremfoert(kr(21_830_700), kr(30_000_000), 2026)).toEqual({ brugt: kr(21_830_700), rest: kr(8_169_300), fejl: null });
  });

  it('bruger kun 60 procent af indkomsten over grundbeløbet og fremfører resten', () => {
    const brug = brugAfFremfoert(kr(30_000_000), kr(30_000_000), 2026);
    const forventet = kr(21_830_700) + kr(8_169_300) * 60 / 100;
    expect(brug.brugt).toBe(forventet);
    expect(brug.brugt).toBe(kr(26_732_280));
    expect(brug.rest).toBe(kr(30_000_000) - forventet);
    expect(brug.fejl).toBeNull();
    expect(brugAfFremfoert(kr(30_000_000), kr(30_000_000), 2025).brugt).toBe(kr(20_829_000) + kr(9_171_000) * 60 / 100);
  });

  it('runder 60 procent ned, så der aldrig bruges mere end loven tillader', () => {
    const grundbeloeb = kr(21_830_700);
    expect(brugAfFremfoert(grundbeloeb + 1, kr(30_000_000), 2026).brugt).toBe(grundbeloeb);
    expect(brugAfFremfoert(grundbeloeb + 2, kr(30_000_000), 2026).brugt).toBe(grundbeloeb + 1);
  });

  it('bruger ikke fremført underskud ved negativ indkomst eller nul', () => {
    expect(brugAfFremfoert(kr(-50_000), kr(20_000), 2026)).toEqual({ brugt: 0, rest: kr(20_000), fejl: null });
    expect(brugAfFremfoert(0, kr(20_000), 2026)).toEqual({ brugt: 0, rest: kr(20_000), fejl: null });
  });

  it('giver fejl og bruger intet, når grundbeløbet for året mangler', () => {
    expect(brugAfFremfoert(kr(100_000), kr(20_000), 2030)).toEqual({ brugt: 0, rest: kr(20_000), fejl: GRUNDBELOEB_MANGLER });
    expect(GRUNDBELOEB_MANGLER).toBe('Grundbeløbet for indkomståret er ikke lagt ind.');
    expect(brugAfFremfoert(kr(100_000), 0, 2030).fejl).toBeNull();
    expect(brugAfFremfoert(kr(-100_000), kr(20_000), 2030).fejl).toBeNull();
  });

  it('beregner skatten af 30 mio. kr. med 30 mio. kr. fremført underskud i 2026 med begrænsningen', () => {
    const skat = beregnSkat(rent({ resultatFoerSkat: kr(30_000_000), fremfoertUnderskud: kr(30_000_000), indkomstAar: 2026 }));
    const brugt = kr(21_830_700) + kr(8_169_300) * 60 / 100;
    expect(linje(skat, BRO.fremfoert)?.beloeb).toBe(-brugt);
    expect(linje(skat, BRO.fremfoert)?.beloeb).not.toBe(kr(-30_000_000));
    expect(skat.skattepligtigIndkomst).toBe(kr(30_000_000) - brugt);
    expect(skat.skattepligtigIndkomst).toBe(kr(3_267_720));
    expect(skat.aktuelSkat).toBe(Math.round((kr(30_000_000) - brugt) * 22 / 100));
    expect(skat.aktuelSkat).toBe(kr(718_898.4));
    expect(skat.nytFremfoertUnderskud).toBe(kr(30_000_000) - brugt);
    expect(skat.fejl).toBeNull();
    expect(kontrollerSkattebro(skat)).toEqual([]);
    expect(Object.keys(rent({ indkomstAar: 2026 }))).not.toContain('aktuelSkat');
  });

  it('bruger 2026, når året ikke er angivet', () => {
    const uden = beregnSkat(rent({ resultatFoerSkat: kr(30_000_000), fremfoertUnderskud: kr(30_000_000) }));
    const med = beregnSkat(rent({ resultatFoerSkat: kr(30_000_000), fremfoertUnderskud: kr(30_000_000), indkomstAar: 2026 }));
    expect(uden.aktuelSkat).toBe(med.aktuelSkat);
  });

  it('melder fejl i skatten, når grundbeløbet for indkomståret mangler', () => {
    const skat = beregnSkat(rent({ resultatFoerSkat: kr(100_000), fremfoertUnderskud: kr(20_000), indkomstAar: 2030 }));
    expect(skat.fejl).toBe(GRUNDBELOEB_MANGLER);
    expect(linje(skat, BRO.fremfoert)).toBeUndefined();
    expect(beregnSkat(rent({ resultatFoerSkat: kr(100_000), indkomstAar: 2030 })).fejl).toBeNull();
  });

  it('bruger begrænsningen før sambeskatningen og afviser kredsen ved manglende grundbeløb', () => {
    const kreds = beregnSambeskatning([
      { navn: 'Drift', grundlag: rent({ resultatFoerSkat: kr(30_000_000), fremfoertUnderskud: kr(30_000_000), indkomstAar: 2026 }) },
      { navn: 'Holding', grundlag: rent({ resultatFoerSkat: kr(-1_000_000), administrationsselskab: true, indkomstAar: 2026 }) },
    ]);
    const [d] = kreds.selskaber;
    expect(linje(d, BRO.fremfoert)?.beloeb).toBe(kr(-26_732_280));
    expect(linje(d, BRO.modregnet)?.beloeb).toBe(kr(-1_000_000));
    expect(d.skattepligtigIndkomst).toBe(kr(2_267_720));

    const mangler = beregnSambeskatning([
      { navn: 'Drift', grundlag: rent({ resultatFoerSkat: kr(100_000), fremfoertUnderskud: kr(20_000), indkomstAar: 2030 }) },
      { navn: 'Holding', grundlag: rent({ resultatFoerSkat: kr(-10_000), administrationsselskab: true, indkomstAar: 2030 }) },
    ]);
    expect(mangler.fejl).toBe(GRUNDBELOEB_MANGLER);
    expect(mangler.selskaber).toHaveLength(0);
  });
});
