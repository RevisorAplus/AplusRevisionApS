import { describe, expect, it } from 'vitest';
import { indlaesFoerste, indlaesKilde, setBilag, type KildeNavn } from './kilde';

const kr = (kroner: number) => Math.round(kroner * 100);
const fil = [
  'Bilag;Dato;Tekst;Konto;Beløb',
  '104;15.09.2024;Salg;1000;12.500,00',
  '105;16.09.2024;Husleje;2000;-6.250,00',
  '106;17.09.2024;Ukendt;9999;-400,00',
].join('\n');
const mapping = [
  { kildeKonto: '1000', konto: '1010' },
  { kildeKonto: '2000', konto: '3410' },
];

describe('kildeimport', () => {
  it('tager de mappede linjer med og lader den ukendte konto stå', () => {
    const resultat = indlaesKilde(fil, 'economic', mapping, []);
    expect(resultat.nye).toHaveLength(2);
    expect(resultat.nye[0]).toMatchObject({ bilagsnummer: '104', konto: '1010', beloeb: kr(12_500) });
    expect(resultat.undtagelser).toHaveLength(1);
    expect(resultat.undtagelser[0]).toMatchObject({ kildeKonto: '9999', beloeb: kr(-400) });
    expect(resultat.nye.length + resultat.undtagelser.length).toBe(3);
  });

  it('ændrer ikke antallet, når den samme fil køres igen', () => {
    const foerste = indlaesKilde(fil, 'economic', mapping, []);
    const gemt = setBilag([], [], foerste);
    const allerede = [
      ...gemt.linjer.map((linje) => ({ kilde: linje.kilde, bilagsnummer: linje.bilagsnummer })),
      ...gemt.undtagelser.map((linje) => ({ kilde: linje.kilde, bilagsnummer: linje.bilagsnummer })),
    ];
    const anden = indlaesKilde(fil, 'economic', mapping, allerede);
    const efter = setBilag(gemt.linjer, gemt.undtagelser, anden);
    expect(anden.nye).toHaveLength(0);
    expect(anden.sprungetOver).toBe(3);
    expect(efter.linjer).toHaveLength(2);
    expect(efter.undtagelser).toHaveLength(1);
  });

  it('beholder flere forskellige linjer på samme bilag, men genindlæser dem ikke', () => {
    const flerlinjebilag = [
      'Bilag;Dato;Tekst;Konto;Beløb',
      '200;18.09.2024;Debet;1000;1.000,00',
      '200;18.09.2024;Kredit;2000;-1.000,00',
    ].join('\n');
    const foerste = indlaesKilde(flerlinjebilag, 'economic', mapping, []);
    const gemt = setBilag([], [], foerste);

    expect(foerste.nye).toHaveLength(2);
    expect(gemt.linjer).toHaveLength(2);
    expect(setBilag(gemt.linjer, [], foerste).linjer).toHaveLength(2);

    const allerede = gemt.linjer.map(({ kilde, bilagsnummer }) => ({ kilde, bilagsnummer }));
    const anden = indlaesKilde(flerlinjebilag, 'economic', mapping, allerede);
    expect(anden.nye).toHaveLength(0);
    expect(anden.sprungetOver).toBe(2);
  });

  it('tager det samme bilagsnummer fra en anden kilde med', () => {
    const resultat = indlaesKilde(fil, 'billy', mapping, [{ kilde: 'economic', bilagsnummer: '104' }]);
    expect(resultat.nye.some((linje) => linje.bilagsnummer === '104')).toBe(true);
  });

  it.each([
    ['dinero', 'Bilagsnr.;Dato;Beskrivelse;Kontonr.;Beløb\nD-17;01.10.2024;Dinero-salg;1000;1.250,00', 'D-17'],
    ['billy', 'Bilag;Dato;Tekst;Konto;Beløb\nB-23;02.10.2024;Billy-salg;1000;2.500,00', 'B-23'],
    ['economic', 'Voucher;Date;Text;Account;Amount\nE-31;03.10.2024;e-conomic-salg;1000;3.750,00', 'E-31'],
    ['excel', 'Bilagsnummer;Dato;Beskrivelse;Kontonummer;Beløb\nX-42;04.10.2024;Excel-salg;1000;4.000,00', 'X-42'],
  ] satisfies [KildeNavn, string, string][])(
    'bevarer bilagsnummeret fra %s',
    (kilde, kildefil, bilagsnummer) => {
      const resultat = indlaesKilde(kildefil, kilde, mapping, []);
      expect(resultat.nye).toHaveLength(1);
      expect(resultat.nye[0]).toMatchObject({ kilde, bilagsnummer, konto: '1010' });
    },
  );

  it('skelner kontoplan, åbne poster og historik ved første indlæsning', () => {
    const foerstegangsfil = [
      'Art;Bilag;Dato;Tekst;Konto;Beløb;Navn',
      'Kontoplan;;;;1000;;Salg',
      'Åben post;Å-7;05.10.2024;Åben faktura;1000;1.000,00;',
      'Historik;H-8;06.10.2024;Betaling;2000;-1.000,00;',
      'Åben post;;07.10.2024;Åben uden nummer;1000;500,00;',
      'Historik;;08.10.2024;Historik uden nummer;2000;-500,00;',
    ].join('\n');

    const resultat = indlaesFoerste(foerstegangsfil, 'excel', mapping);
    expect(resultat.kontoplan).toEqual([{ kildeKonto: '1000', navn: 'Salg' }]);
    expect(resultat.aabne.map((linje) => linje.bilagsnummer)).toEqual(['Å-7', 'linje-5']);
    expect(resultat.poster.map((linje) => linje.bilagsnummer)).toEqual(['H-8', 'linje-6']);
    expect(resultat.undtagelser).toEqual([]);
  });
});
