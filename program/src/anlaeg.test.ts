import { describe, expect, it } from 'vitest';
import { afskrivningIPerioden, afskrivningStemmer, bogfoertVaerdi, udskudtSkatAfAnlaeg, type Anlaeg } from './anlaeg';

const kr = (kroner: number) => Math.round(kroner * 100);
const maskine: Anlaeg = {
  navn: 'Maskine',
  kostpris: kr(100_000),
  brugstidAar: 5,
  restvaerdi: 0,
  anskaffet: '2024-01-01',
  skatteafskrivning: kr(25_000),
};

describe('anlæg', () => {
  it('afskriver kostpris minus restværdi over brugstiden', () => {
    expect(afskrivningIPerioden(maskine, '2024-01-01', '2024-12-31')).toBe(kr(20_000));
    expect(bogfoertVaerdi(maskine, kr(20_000))).toBe(kr(80_000));
    expect(udskudtSkatAfAnlaeg(kr(80_000), kr(75_000))).toBe(kr(1_100));
    expect(afskrivningStemmer(kr(20_000), kr(20_000))).toBe(true);
    expect(afskrivningStemmer(kr(20_000), kr(15_000))).toBe(false);
  });

  it('fordeler et første år på 15 måneder og et køb midt i året', () => {
    expect(afskrivningIPerioden(maskine, '2024-06-07', '2025-08-31')).toBe(kr(25_000));
    expect(afskrivningIPerioden({ ...maskine, anskaffet: '2024-07-01' }, '2024-01-01', '2024-12-31')).toBe(kr(10_000));
  });
});
