import { describe, expect, it } from 'vitest';
import { godkendLinje, indlaesBank, lukMaaned, momsAngivelse, proevPostering, type KendtLinje } from './bank';

const kr = (kroner: number) => Math.round(kroner * 100);
const kendte: KendtLinje[] = [
  { tekst: 'Salgsfaktura 104', konto: '1010', momskode: 'salg25' },
  { tekst: 'Husleje', konto: '3410', momskode: 'koeb25' },
];
const fil = [
  'Dato;Tekst;Beløb',
  '15.09.2024;Salgsfaktura 104;12.500,00',
  '16.09.2024;Husleje;-6.250,00',
  '17.09.2024;Ukendt betaling;-400,00',
].join('\n');

describe('bank', () => {
  it('beholder alle linjer og foreslår kun en tekst, der er godkendt før', () => {
    const linjer = indlaesBank(fil, kendte);
    expect(linjer).toHaveLength(3);
    expect(linjer.filter((linje) => linje.status === 'stemmer')).toHaveLength(2);
    expect(linjer.find((linje) => linje.tekst === 'Ukendt betaling')).toMatchObject({ status: 'afventer', konto: null });
    expect(momsAngivelse(linjer).afgift).toBe(kr(1_250));
  });

  it('åbner ikke næste trin og lukker ikke måneden uden bank eller med en åben linje', () => {
    expect(lukMaaned([], 0).aarsager[0]).toContain('Banken er ikke lagt ind');
    const aaben = lukMaaned(indlaesBank(fil, kendte), kr(-1_250));
    expect(aaben.kanLukke).toBe(false);
    const godkendt = godkendLinje(indlaesBank(fil, kendte), 4, '2210', 'ingen');
    expect(lukMaaned(godkendt, kr(-1_250)).kanLukke).toBe(true);
    expect(lukMaaned(godkendt, kr(-1_000)).kanLukke).toBe(false);
  });

  it('tager ikke imod en ny postering i en låst måned', () => {
    expect(proevPostering(true)).toContain('låst');
    expect(proevPostering(false)).toBeNull();
  });
});
