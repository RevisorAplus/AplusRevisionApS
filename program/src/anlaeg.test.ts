import { describe, expect, it } from 'vitest';
import {
  SKOEN,
  aarligAfskrivning,
  afskrevetFoer,
  afskrivningIPerioden,
  afskrivningStemmer,
  bogfoertVaerdi,
  koerKartotek,
  kontrollerAnlaeg,
  udskudtSkatAfAnlaeg,
  type Anlaeg,
} from './anlaeg';
import { beregnUdskudtSkat } from './skat';

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

describe('lineær afskrivning', () => {
  it('har kun brugstid og restværdi som skøn', () => {
    expect([...SKOEN].sort()).toEqual(['brugstidAar', 'restvaerdi']);
  });

  it('trækker restværdien fra grundlaget', () => {
    const bil = { ...maskine, restvaerdi: kr(10_000) };
    expect(aarligAfskrivning(bil)).toBe(kr(18_000));
    expect(afskrivningIPerioden(bil, '2024-01-01', '2024-12-31')).toBe(kr(18_000));
  });

  it('afrunder et skævt første år til øre', () => {
    const skaev = { ...maskine, kostpris: 1_000_01, brugstidAar: 3, anskaffet: '2024-06-15' };
    expect(afskrivningIPerioden(skaev, '2024-06-15', '2024-12-31')).toBe(Math.round(1_000_01 * 7 / 36));
    expect(Number.isInteger(afskrivningIPerioden(skaev, '2024-06-15', '2024-12-31'))).toBe(true);
  });

  it('afskriver aldrig mere end restgrundlaget', () => {
    const kort = { ...maskine, brugstidAar: 1, anskaffet: '2024-07-01' };
    expect(afskrivningIPerioden(kort, '2024-07-01', '2024-12-31')).toBe(kr(50_000));
    expect(afskrevetFoer(kort, '2025-01-01')).toBe(kr(50_000));
    expect(afskrivningIPerioden(kort, '2025-01-01', '2025-12-31')).toBe(kr(50_000));
    expect(afskrivningIPerioden(kort, '2026-01-01', '2026-12-31')).toBe(0);
    expect(afskrivningIPerioden(maskine, '2028-01-01', '2029-06-30')).toBe(kr(20_000));
    expect(afskrivningIPerioden(maskine, '2024-01-01', '2024-12-31', kr(95_000))).toBe(kr(5_000));
  });

  it('afviser et anlæg med restværdi over kostprisen eller uden brugstid', () => {
    expect(kontrollerAnlaeg(maskine)).toEqual([]);
    expect(kontrollerAnlaeg({ ...maskine, restvaerdi: kr(120_000) }).join(' ')).toContain('restværdien');
    expect(kontrollerAnlaeg({ ...maskine, brugstidAar: 0 }).join(' ')).toContain('brugstiden');
    expect(afskrivningIPerioden({ ...maskine, brugstidAar: 0 }, '2024-01-01', '2024-12-31')).toBe(0);
  });

  it('fanger en afskrivning i resultatet, der afviger med én øre fra kartoteket', () => {
    const kartotek = afskrivningIPerioden(maskine, '2024-01-01', '2024-12-31');
    expect(afskrivningStemmer(kartotek, kartotek - 1)).toBe(false);
    expect(afskrivningStemmer(kartotek, kartotek)).toBe(true);
  });
});

describe('kartotek', () => {
  const bil: Anlaeg = { navn: 'Bil', kostpris: kr(240_000), brugstidAar: 4, restvaerdi: kr(48_000), anskaffet: '2025-04-01', skatteafskrivning: kr(60_000) };

  it('kører alle anlæg for perioden og summerer ultimo', () => {
    const kartotek = koerKartotek([maskine, bil, { ...bil, navn: 'Senere køb', anskaffet: '2026-02-01' }], '2025-01-01', '2025-12-31');
    expect(kartotek.linjer.map((linje) => linje.navn)).toEqual(['Maskine', 'Bil']);
    expect(kartotek.kostprisPrimo).toBe(kr(100_000));
    expect(kartotek.tilgang).toBe(kr(240_000));
    expect(kartotek.afskrevetPrimo).toBe(kr(20_000));
    expect(kartotek.aaretsAfskrivning).toBe(kr(20_000) + kr(36_000));
    expect(kartotek.afskrevetUltimo).toBe(kr(76_000));
    expect(kartotek.ultimo).toBe(kr(340_000) - kr(76_000));
    expect(kartotek.ultimo).toBe(kartotek.kostprisUltimo - kartotek.afskrevetUltimo);
  });

  it('regner udskudt skat af anlæg med samme formel som skatten', () => {
    const kartotek = koerKartotek([maskine, bil], '2025-01-01', '2025-12-31');
    expect(kartotek.skattemaessigVaerdi).toBe(kr(75_000) + kr(180_000));
    expect(kartotek.udskudtSkat).toBe(beregnUdskudtSkat(kartotek.ultimo, kartotek.skattemaessigVaerdi));
    expect(udskudtSkatAfAnlaeg(kartotek.ultimo, kartotek.skattemaessigVaerdi)).toBe(kartotek.udskudtSkat);
    expect(kartotek.udskudtSkat).toBe(kr(1_980));
  });
});
