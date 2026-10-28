import { describe, expect, it } from 'vitest';
import { indlaesKilde, setBilag } from './kilde';

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

  it('tager det samme bilagsnummer fra en anden kilde med', () => {
    const resultat = indlaesKilde(fil, 'billy', mapping, [{ kilde: 'economic', bilagsnummer: '104' }]);
    expect(resultat.nye.some((linje) => linje.bilagsnummer === '104')).toBe(true);
  });
});
