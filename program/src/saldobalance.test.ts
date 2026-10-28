import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { BilagPost } from './bilag';
import { indlaesSaldobalance, primoStemmer, saldobalanceFraBilag, sumSaldo, type Regnskabsaar } from './saldobalance';

const mappe = dirname(fileURLToPath(import.meta.url));
const foersteAar: Regnskabsaar = {
  stiftet: '2024-06-07',
  fra: '2024-06-07',
  til: '2025-08-31',
  foersteAar: true,
};

function laes(navn: string): string {
  return readFileSync(join(mappe, '../public/fixtures', navn), 'utf8');
}

function linje(navn: string, kontonummer: string, aar: Regnskabsaar = foersteAar) {
  const resultat = indlaesSaldobalance(laes(navn), aar);
  return resultat.linjer.find((kandidat) => kandidat.kontonummer === kontonummer);
}

describe('saldobalance', () => {
  it('godkender hele første år og beholder en konto uden placering', () => {
    const resultat = indlaesSaldobalance(laes('hele-aaret.csv'), foersteAar);

    expect(resultat.status).toBe('klar');
    expect(resultat.linjer).toHaveLength(7);
    expect(resultat.sprangOver).toBe(1);
    expect(resultat.sum).toBe(0);
    expect(linje('hele-aaret.csv', '1010')?.beloeb).toBe(-9_200_000);
    expect(linje('hele-aaret.csv', '9999')).toMatchObject({ navn: 'Endnu ikke placeret', beloeb: 100_000 });
    expect(resultat.noter[0]).toMatch(/Sumlinjen er udeladt/);
  });

  it('afviser et udtræk på 12 måneder, når første år starter tidligere', () => {
    const resultat = indlaesSaldobalance(laes('for-kort-periode.csv'), foersteAar);
    const salg = linje('for-kort-periode.csv', '1010');

    expect(resultat.status).toBe('blokeret');
    expect(resultat.linjer).toHaveLength(7);
    expect(resultat.aarsager[0]).toContain('01.09.2024');
    expect(resultat.aarsager[0]).toContain('07.06.2024');
    expect(resultat.aarsager[0]).toContain('31.08.2024');
    expect(resultat.aarsager[0]).toContain('ikke godkendt');
    expect(salg?.periode).toBe(-8_000_000);
    expect(salg?.beloeb).toBe(-9_200_000);
    expect(resultat.linjer.map((kandidat) => kandidat.kontonummer)).toContain('9999');
  });

  it('afviser periodetallene alene, når de første måneder slet ikke står i filen', () => {
    const tekst = [
      'Periode;01.09.2024;31.08.2025',
      'Konto;Navn;Saldo',
      '1010;Salg;-80.000,00',
      '1310;Varekøb;30.000,00',
      '2210;Lønninger;40.000,00',
      '6110;Anpartskapital;-40.000,00',
      '5110;Bank;50.000,00',
    ].join('\n');
    const resultat = indlaesSaldobalance(tekst, foersteAar);

    expect(resultat.status).toBe('blokeret');
    expect(resultat.linjer).toHaveLength(5);
    expect(resultat.linjer.find((kandidat) => kandidat.kontonummer === '1010')?.beloeb).toBe(-8_000_000);
    expect(resultat.aarsager.join(' ')).toContain('07.06.2024');
  });

  it('læser debet og kredit med punktum som tusinde, ikke som decimal', () => {
    const tekst = [
      'Periode,07.06.2024,31.08.2025',
      'Konto,Navn,Debet,Kredit',
      '1010,Salg,,"730.271,00"',
      '2210,Omkostninger,"730.271,00",',
    ].join('\n');
    const resultat = indlaesSaldobalance(tekst, foersteAar);
    const salg = resultat.linjer.find((kandidat) => kandidat.kontonummer === '1010');

    expect(resultat.status).toBe('klar');
    expect(salg?.beloeb).toBe(-73_027_100);
    expect(resultat.sum).toBe(0);
  });

  it('slår ikke dubletter sammen og fjerner ikke differencen', () => {
    const tekst = [
      'Periode;07.06.2024;31.08.2025',
      'Konto;Navn;Saldo',
      '1010;Salg;-10,00',
      '1010;Salg ekstra;-5,00',
      '2210;Modkonto;10,00',
    ].join('\n');
    const resultat = indlaesSaldobalance(tekst, foersteAar);

    expect(resultat.linjer).toHaveLength(3);
    expect(resultat.status).toBe('blokeret');
    expect(resultat.aarsager.join(' ')).toContain('1010');
    expect(resultat.aarsager.join(' ')).toContain('Differencen er -5,00 kr');
  });

  it('godkender ikke en nulstillet resultatkonto som nul', () => {
    const tekst = [
      'Periode;07.06.2024;31.08.2025',
      'Konto;Navn;Primo;Periode;Ultimo',
      '1010;Salg;0,00;-100,00;0,00',
      '6110;Anpartskapital;0,00;-40.000,00;-40.000,00',
      '6120;Overført resultat;0,00;-100,00;-100,00',
      '5110;Bank;0,00;40.200,00;40.200,00',
    ].join('\n');
    const resultat = indlaesSaldobalance(tekst, foersteAar);
    const salg = resultat.linjer.find((kandidat) => kandidat.kontonummer === '1010');

    expect(salg?.nulstillet).toBe(true);
    expect(salg?.beloeb).toBe(-10_000);
    expect(resultat.status).toBe('blokeret');
    expect(resultat.aarsager.join(' ')).toContain('nulstillet');
  });

  it('afviser et senere år på over 12 måneder, også når filen passer til datoerne', () => {
    const aar: Regnskabsaar = {
      stiftet: '2020-01-01',
      fra: '2024-06-07',
      til: '2025-08-31',
      foersteAar: false,
    };
    const tekst = ['Periode;07.06.2024;31.08.2025', 'Konto;Navn;Saldo', '5110;Bank;0,00'].join('\n');
    const resultat = indlaesSaldobalance(tekst, aar);

    expect(resultat.status).toBe('blokeret');
    expect(resultat.aarsager.join(' ')).toContain('12 måneder');
    expect(resultat.linjer).toHaveLength(1);
  });

  it('afviser første år efter 18 måneder', () => {
    const aar: Regnskabsaar = {
      stiftet: '2024-06-07',
      fra: '2024-06-07',
      til: '2025-12-07',
      foersteAar: true,
    };
    const tekst = ['Periode;07.06.2024;07.12.2025', 'Konto;Navn;Saldo', '5110;Bank;0,00'].join('\n');
    const resultat = indlaesSaldobalance(tekst, aar);

    expect(resultat.status).toBe('blokeret');
    expect(resultat.aarsager.join(' ')).toContain('18 måneder');
  });

  it('godkender ikke en fil uden periode', () => {
    const tekst = ['Konto;Navn;Saldo', '5110;Bank;10,00', '2210;Modkonto;-10,00'].join('\n');
    const resultat = indlaesSaldobalance(tekst, foersteAar);

    expect(resultat.status).toBe('blokeret');
    expect(resultat.linjer).toHaveLength(2);
    expect(resultat.sum).toBe(0);
    expect(resultat.aarsager.join(' ')).toContain('ikke sin periode');
  });
});

describe('saldobalance fra bilag og primo', () => {
  const grundPoster: BilagPost[] = [
    {
      id: '1',
      kilde: 'test',
      bilagsnummer: 'B1',
      dato: '2024-09-01',
      tekst: 'Salg',
      konto: '1010',
      beloeb: -100_000,
      momskode: '',
      stornoAf: null,
    },
    {
      id: '2',
      kilde: 'test',
      bilagsnummer: 'B1',
      dato: '2024-09-01',
      tekst: 'Bank',
      konto: '5500',
      beloeb: 100_000,
      momskode: '',
      stornoAf: null,
    },
  ];

  it('summerer netto pr. konto til nul og tilbageførsel flytter saldo', async () => {
    const { tilbagefoer } = await import('./bilag');
    expect(sumSaldo(saldobalanceFraBilag(grundPoster))).toBe(0);
    const { poster: medTilbage } = tilbagefoer(grundPoster, '1', '2024-10-01');
    const salg = saldobalanceFraBilag(medTilbage).find((s) => s.konto === '1010')?.beloeb;
    expect(salg).toBe(0);
  });

  it('beholder bogførte poster i låste perioder i saldobalancen', () => {
    const laaste = [{ fra: '2024-09-01', til: '2024-09-30' }];
    const saldi = saldobalanceFraBilag(grundPoster, laaste);
    expect(saldi).toHaveLength(2);
    expect(sumSaldo(saldi)).toBe(0);
  });

  it('primo stemmer i første år altid og derefter kun ved lighed', () => {
    expect(primoStemmer(true, 0, 999)).toBe(true);
    expect(primoStemmer(false, 100, 100)).toBe(true);
    expect(primoStemmer(false, 100, 101)).toBe(false);
  });
});
