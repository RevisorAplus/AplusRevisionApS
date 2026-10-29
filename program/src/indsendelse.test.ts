import { describe, expect, it } from 'vitest';
import { bygRapport, kontrollerAar, type Poster } from './aar';
import { alleKontrollerOk, bygUdtraek, indsendelsesTekst, kanIndsende, udtraekSomTekst } from './indsendelse';

const kr = (kroner: number) => Math.round(kroner * 100);

const poster: Poster[] = [
  { kontonummer: '1010', navn: 'Salg', beloeb: kr(-228_000), rolle: 'omsaetning' },
  { kontonummer: '3610', navn: 'Repræsentation', beloeb: kr(8_000), rolle: 'ikke-fradrag' },
  { kontonummer: '3910', navn: 'Afskrivninger', beloeb: kr(40_000), rolle: 'regnskabsafskrivning' },
  { kontonummer: '2210', navn: 'Lønninger', beloeb: kr(50_000), rolle: 'personale' },
  { kontonummer: '5110', navn: 'Bank', beloeb: kr(220_000), rolle: 'bank' },
  { kontonummer: '6110', navn: 'Anpartskapital', beloeb: kr(-40_000), rolle: 'egenkapital' },
];

function rapport(foersteAar = true) {
  return bygRapport({
    form: 'aps',
    foersteAar,
    klasseB: true,
    poster,
    skatteafskrivning: kr(25_000),
    fremfoertUnderskud: 0,
    modregnetUnderskud: 0,
    sambeskatning: false,
    administrationsselskab: false,
    regnskabsvaerdiAnlaeg: null,
    skattevaerdiAnlaeg: null,
    harSidsteAar: !foersteAar,
    overfoert: 0,
    udbytte: 0,
  });
}

const input = { selskab: 'Eksempel Drift ApS', fra: '2024-06-07', til: '2025-08-31' };

describe('bygUdtraek', () => {
  it('har selskab, periode, resultatlinjer, balancelinjer og noter', () => {
    const r = rapport();
    const ud = bygUdtraek({ ...input, rapport: r });
    expect(ud.selskab).toBe('Eksempel Drift ApS');
    expect(ud.periode).toEqual({ fra: '2024-06-07', til: '2025-08-31' });
    expect(ud.resultatlinjer.map((linje) => linje.tekst)).toEqual(r.resultat.map((linje) => linje.tekst));
    expect(ud.resultatlinjer.map((linje) => linje.beloeb)).toEqual(r.resultat.map((linje) => linje.beloeb));
    expect(ud.noter).toEqual(r.noter);
    expect(ud.noter).toContain('Personaleomkostninger');
  });

  it('samler balancen i grupper uden at ændre et tal', () => {
    const r = rapport();
    const ud = bygUdtraek({ ...input, rapport: r });
    const gruppe = (navn: string) => ud.balancelinjer.filter((linje) => linje.gruppe === navn);
    expect(gruppe('Aktiver').map((linje) => linje.beloeb)).toEqual(r.balanceAktiver.map((linje) => linje.beloeb));
    expect(gruppe('Egenkapital').map((linje) => linje.beloeb)).toEqual(r.egenkapital.map((linje) => linje.beloeb));
    expect(gruppe('Gæld').map((linje) => linje.beloeb)).toEqual(r.gaeld.map((linje) => linje.beloeb));
    expect(ud.balancelinjer).toHaveLength(r.balanceAktiver.length + r.egenkapital.length + r.gaeld.length);
  });

  it('har ingen kolonne til sidste år i første år', () => {
    const ud = bygUdtraek({ ...input, rapport: rapport(true) });
    expect(ud.resultatlinjer.every((linje) => !('sidsteAar' in linje))).toBe(true);
  });

  it('kan skrives som tekst', () => {
    const ud = bygUdtraek({ ...input, rapport: rapport() });
    expect(JSON.parse(udtraekSomTekst(ud))).toEqual(ud);
  });
});

describe('kanIndsende', () => {
  it('er false, når en kontrol er rød, også når året er låst', () => {
    expect(kanIndsende(false)).toBe(false);
    expect(kanIndsende(false, true)).toBe(false);
  });

  it('er false uden lås, selv om kontrollerne er grønne', () => {
    expect(kanIndsende(true)).toBe(false);
    expect(kanIndsende(true, false)).toBe(false);
  });

  it('er true, når kontrollerne er grønne og året er låst', () => {
    expect(kanIndsende(true, true)).toBe(true);
  });

  it('følger kontrollen fra kontrollerAar', () => {
    const r = rapport();
    const basis = {
      form: 'aps' as const,
      saldoSum: 0,
      saldobalanceGodkendt: true,
      disponeringRest: r.disponeringRest,
      momsStemmer: true,
      bankLukket: true,
      skatFejl: r.skat.fejl,
      mellemregningEjer: 0,
      varelagerFindes: false,
      varelagerBekaertet: false,
      valutaFindes: false,
      valutaKursSat: false,
      sambeskatning: false,
      haeftelsesnoteMed: false,
      balanceForskel: r.balanceForskel,
    };
    const roed = kontrollerAar({ ...basis, momsStemmer: false });
    expect(alleKontrollerOk(roed.linjer)).toBe(false);
    expect(kanIndsende(alleKontrollerOk(roed.linjer), true)).toBe(false);
    const groen = kontrollerAar({ ...basis, disponeringRest: 0 });
    expect(kanIndsende(alleKontrollerOk(groen.linjer), false)).toBe(false);
    expect(kanIndsende(alleKontrollerOk(groen.linjer), true)).toBe(groen.kanLaase);
  });

  it('tæller aldrig en tom kontrol som grøn', () => {
    expect(alleKontrollerOk([])).toBe(false);
  });
});

describe('indsendelsesTekst', () => {
  it('siger, at filen er klar til et menneske, og at programmet ikke har sendt den', () => {
    const tekst = indsendelsesTekst(true, true);
    expect(tekst).toContain('klar til et menneske');
    expect(tekst).toContain('ikke sendt');
  });

  it('siger, at filen først kan gøres klar, når året er låst og kontrollerne er grønne', () => {
    for (const tekst of [indsendelsesTekst(false), indsendelsesTekst(true), indsendelsesTekst(false, true)]) {
      expect(tekst).toContain('først gøres klar, når året er låst, og kontrollerne er grønne');
      expect(tekst).toContain('ikke sendt');
      expect(tekst).not.toContain('klar til et menneske');
    }
  });
});
