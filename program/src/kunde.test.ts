import { describe, expect, it } from 'vitest';
import {
  AARSRAPPORT_B_PRIS,
  BOGFOERING_PRIS,
  TIMEPRIS,
  aftalebrev,
  kanStarte,
  kunderFor,
  naeste30,
  nyKunde,
  opkraevning,
  type Kunde,
} from './kunde';

const klar: Kunde = {
  ...nyKunde('m1'),
  navn: 'Eksempel Drift ApS',
  pris: 895_00,
  omfang: 'Bogføring og årsrapport',
  aftaleGemt: true,
};

describe('kanStarte', () => {
  it('er false for et nyt kundekort', () => {
    expect(kanStarte(nyKunde('m1'))).toBe(false);
  });

  it('er false uden pris', () => {
    expect(kanStarte({ ...klar, pris: null })).toBe(false);
    expect(kanStarte({ ...klar, pris: 0 })).toBe(false);
  });

  it('er false uden omfang', () => {
    expect(kanStarte({ ...klar, omfang: '' })).toBe(false);
    expect(kanStarte({ ...klar, omfang: '   ' })).toBe(false);
  });

  it('er false uden gemt aftale', () => {
    expect(kanStarte({ ...klar, aftaleGemt: false })).toBe(false);
  });

  it('er true, når pris, omfang og aftale er der', () => {
    expect(kanStarte(klar)).toBe(true);
  });
});

describe('opkraevning', () => {
  it('tager 895 kr. for måneden', () => {
    const ud = opkraevning({ maaned: true, aarsrapport: false, timer: 0 });
    expect(ud.linjer).toHaveLength(1);
    expect(ud.linjer[0].beloeb).toBe(BOGFOERING_PRIS);
    expect(ud.sum).toBe(89_500);
  });

  it('lægger 4.995 kr. til, når årsrapporten er med', () => {
    const ud = opkraevning({ maaned: true, aarsrapport: true, timer: 0 });
    expect(ud.linjer.map((linje) => linje.beloeb)).toEqual([BOGFOERING_PRIS, AARSRAPPORT_B_PRIS]);
    expect(ud.sum).toBe(89_500 + 499_500);
  });

  it('holder timerne som en linje for sig til 495 kr. i timen', () => {
    const ud = opkraevning({ maaned: true, aarsrapport: false, timer: 3 });
    expect(ud.linjer).toHaveLength(2);
    expect(ud.linjer[1].beloeb).toBe(3 * TIMEPRIS);
    expect(ud.linjer[1].tekst).toContain('timer');
    expect(ud.sum).toBe(89_500 + 148_500);
  });

  it('giver ingen timelinje ved 0 timer', () => {
    const ud = opkraevning({ maaned: true, aarsrapport: false, timer: 0 });
    expect(ud.linjer.some((linje) => linje.tekst.includes('timer'))).toBe(false);
  });

  it('runder halve timer til hele øre', () => {
    const ud = opkraevning({ maaned: false, aarsrapport: false, timer: 1.5 });
    expect(ud.sum).toBe(74_250);
  });
});

describe('naeste30', () => {
  const frister = [
    { kunde: 'A', tekst: 'Før', dato: '2024-09-29' },
    { kunde: 'A', tekst: 'I dag', dato: '2024-09-30' },
    { kunde: 'B', tekst: 'Om 30 dage', dato: '2024-10-30' },
    { kunde: 'B', tekst: 'Om 31 dage', dato: '2024-10-31' },
    { kunde: 'A', tekst: 'Midt i', dato: '2024-10-10' },
  ];

  it('tager fra og med i dag og højst 30 dage frem', () => {
    const ud = naeste30('2024-09-30', frister);
    expect(ud.map((frist) => frist.tekst)).toEqual(['I dag', 'Midt i', 'Om 30 dage']);
  });

  it('ændrer ikke listen, den får', () => {
    const kopi = frister.map((frist) => ({ ...frist }));
    naeste30('2024-09-30', frister);
    expect(frister).toEqual(kopi);
  });

  it('virker henover årsskiftet', () => {
    const ud = naeste30('2024-12-20', [{ kunde: 'A', tekst: 'Januar', dato: '2025-01-15' }, { kunde: 'A', tekst: 'Februar', dato: '2025-02-15' }]);
    expect(ud.map((frist) => frist.tekst)).toEqual(['Januar']);
  });
});

describe('kunderFor', () => {
  it('giver kun den medarbejders kunder', () => {
    const alle = [
      { ...klar, navn: 'Et', medarbejderId: 'm1' },
      { ...klar, navn: 'To', medarbejderId: 'm2' },
      { ...klar, navn: 'Tre', medarbejderId: 'm1' },
    ];
    expect(kunderFor(alle, 'm1').map((kunde) => kunde.navn)).toEqual(['Et', 'Tre']);
    expect(kunderFor(alle, 'm2').map((kunde) => kunde.navn)).toEqual(['To']);
    expect(kunderFor(alle, 'm3')).toEqual([]);
  });
});

describe('aftalebrev', () => {
  it('lover ikke revision, erklæring eller selvangivelse', () => {
    const tekst = aftalebrev({ ...klar, bilagsloft: 60 }).toLowerCase();
    expect(tekst).not.toMatch(/revision|revisor|erklæring|selvangivelse|indsend/);
  });

  it('nævner prisen og loftet, når de er skrevet', () => {
    const tekst = aftalebrev({ ...klar, bilagsloft: 60 });
    expect(tekst).toContain('895,00 kr.');
    expect(tekst).toContain('60 bilag');
  });

  it('gætter ikke et loft', () => {
    expect(aftalebrev(klar)).toContain('ikke fastsat');
  });
});
