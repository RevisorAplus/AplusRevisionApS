import { describe, expect, it } from 'vitest';
import { koerKartotek, type Anlaeg } from './anlaeg';
import {
  PLIGTIGE_NOTER,
  anlaegsnote,
  anlaegsnoteStemmer,
  bygNoter,
  egenkapitalforklaring,
  fjernTommeNoter,
  manglendeNoter,
  praksisFor,
} from './noter';
import { HAEFTELSESTEKST } from './skat';

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

const maskine: Anlaeg = { navn: 'Maskine', kostpris: kr(100_000), brugstidAar: 5, restvaerdi: 0, anskaffet: '2024-01-01', skatteafskrivning: kr(25_000) };

describe('pligtige noter', () => {
  it('laver ingen tom note, når posten er 0', () => {
    const noter = bygNoter({ personale: 0, anlaegIBalancen: 0, anlaegIKartotek: 0, sambeskatning: false, udskudtSkat: 0, kapitalejerlaan: 0 });
    expect(noter.noter).toEqual([]);
    expect(noter.noter.every((note) => note.tekst.trim().length > 0)).toBe(true);
    expect(fjernTommeNoter([{ titel: 'Personaleomkostninger', tekst: ' ' }, { titel: 'Udskudt skat', tekst: 'Tekst' }]).map((note) => note.titel)).toEqual(['Udskudt skat']);
  });

  it('melder en manglende pligtig note som fejl, også når noten er tom', () => {
    expect(manglendeNoter(['personale', 'anlaeg'], [{ titel: 'Personaleomkostninger', tekst: 'Personaleomkostninger udgør 1,00 kr.' }])).toEqual(['Anlægsaktiver']);
    expect(manglendeNoter(['personale'], [{ titel: 'Personaleomkostninger', tekst: '  ' }])).toEqual(['Personaleomkostninger']);
    expect(manglendeNoter(['personale', 'personale', 'ukendt'], [])).toEqual(['Personaleomkostninger']);
    expect(manglendeNoter([], [])).toEqual([]);
  });

  it('tager kun hæftelsesnoten med, når sambeskatning er slået til', () => {
    const uden = bygNoter({ personale: 0, anlaegIBalancen: null, anlaegIKartotek: null, sambeskatning: false });
    expect(uden.noter.some((note) => note.tekst === HAEFTELSESTEKST)).toBe(false);
    const med = bygNoter({ personale: 0, anlaegIBalancen: null, anlaegIKartotek: null, sambeskatning: true });
    expect(med.noter).toEqual([{ titel: PLIGTIGE_NOTER.sambeskatning, tekst: HAEFTELSESTEKST }]);
    expect(manglendeNoter(['sambeskatning'], uden.noter)).toEqual(['Sambeskatning']);
    expect(manglendeNoter(['sambeskatning'], med.noter)).toEqual([]);
  });

  it('giver kun hæftelsesnoten til et selskab, ikke til en enkeltmandsvirksomhed', () => {
    const tom = { personale: 0, anlaegIBalancen: null, anlaegIKartotek: null };
    const enkeltmand = bygNoter({ ...tom, sambeskatning: true, form: 'enkeltmand' });
    expect(enkeltmand.noter.some((note) => note.tekst === HAEFTELSESTEKST)).toBe(false);
    expect(enkeltmand.fejl.join(' ')).toContain('personligt ejet');
    expect(bygNoter({ ...tom, sambeskatning: false, form: 'enkeltmand' }).fejl).toEqual([]);
    expect(bygNoter({ ...tom, sambeskatning: true, form: 'aps' }).noter.map((note) => note.tekst)).toEqual([HAEFTELSESTEKST]);
    expect(bygNoter({ ...tom, sambeskatning: true, form: 'as' }).noter.map((note) => note.tekst)).toEqual([HAEFTELSESTEKST]);
    expect(bygNoter({ ...tom, sambeskatning: false, form: 'aps' }).noter).toEqual([]);
  });

  it('laver noter for udskudt skat, kapitalejerlån og egenkapital, når posterne findes', () => {
    const noter = bygNoter({
      personale: 0,
      anlaegIBalancen: null,
      anlaegIKartotek: null,
      sambeskatning: false,
      udskudtSkat: kr(4_400),
      kapitalejerlaan: kr(5_000),
      egenkapital: { primo: kr(40_000), bevaegelser: [{ tekst: 'Årets resultat', beloeb: kr(95_900) }], ultimo: kr(135_900) },
    });
    expect(noter.noter.map((note) => note.titel)).toEqual(['Udskudt skat', 'Lån til kapitalejer', 'Egenkapital']);
    expect(manglendeNoter(['udskudt-skat', 'kapitalejerlaan', 'egenkapital'], noter.noter)).toEqual([]);
    const forkert = bygNoter({ personale: 0, anlaegIBalancen: null, anlaegIKartotek: null, sambeskatning: false, egenkapital: { primo: kr(40_000), bevaegelser: [{ tekst: 'Årets resultat', beloeb: kr(95_900) }], ultimo: kr(40_000) } });
    expect(forkert.fejl.join(' ')).toContain('Egenkapital');
    expect(manglendeNoter(['egenkapital'], forkert.noter)).toEqual(['Egenkapital']);
  });
});

describe('anlægsnote', () => {
  const kartotek = koerKartotek([maskine], '2024-01-01', '2024-12-31');

  it('er bundet til kartoteket, så ultimo kan sammenlignes med balancen', () => {
    const note = anlaegsnote(kartotek);
    const ultimo = note.linjer?.find((linje) => linje.tekst === 'Regnskabsmæssig værdi ultimo')?.beloeb;
    expect(ultimo).toBe(kr(80_000));
    expect(note.linjer?.find((linje) => linje.tekst === 'Årets afskrivninger')?.beloeb).toBe(kr(20_000));
    expect(anlaegsnoteStemmer(ultimo ?? 0, kr(80_000))).toBe(true);
    expect(anlaegsnoteStemmer(ultimo ?? 0, kr(80_000) - 1)).toBe(false);
  });

  it('melder fejl og ingen note, når balancens anlæg ikke er kartotekets ultimo', () => {
    const stemmer = bygNoter({ personale: 0, anlaegIBalancen: kr(80_000), anlaegIKartotek: null, sambeskatning: false, kartotek });
    expect(stemmer.fejl).toEqual([]);
    expect(stemmer.noter[0].linjer?.length).toBe(7);
    const afviger = bygNoter({ personale: 0, anlaegIBalancen: kr(85_000), anlaegIKartotek: null, sambeskatning: false, kartotek });
    expect(afviger.fejl[0]).toContain('ikke lig');
    expect(manglendeNoter(['anlaeg'], afviger.noter)).toEqual(['Anlægsaktiver']);
  });
});

describe('anvendt regnskabspraksis', () => {
  it('beskriver kun metoder for poster, virksomheden har', () => {
    const praksis = praksisFor(['anlaeg', 'omsaetning']);
    expect(praksis.map((punkt) => punkt.post)).toEqual(['omsaetning', 'anlaeg']);
    expect(praksis.some((punkt) => punkt.titel === 'Varebeholdninger')).toBe(false);
    expect(praksisFor([])).toEqual([]);
    expect(praksisFor(['ukendt'])).toEqual([]);
  });

  it('beskriver anlæg som lineær afskrivning over brugstiden', () => {
    const [anlaeg] = praksisFor(['anlaeg']);
    expect(anlaeg.tekst).toContain('lineært');
    expect(anlaeg.tekst).toContain('brugstid');
  });
});
