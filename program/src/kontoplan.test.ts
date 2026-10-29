import { describe, expect, it } from 'vitest';
import { art, gemMapping, konto, kontoForKilde } from './kontoplan';

describe('standardkontoplan', () => {
  it('returnerer konto og art for krævede konti', () => {
    expect(konto('1010')).toMatchObject({ navn: 'Salg', art: 'resultat' });
    expect(konto('2210')?.navn).toBe('Lønninger');
    expect(konto('3410')?.navn).toBe('Lokale');
    expect(konto('3610')).toMatchObject({ navn: 'Stiftelsesomkostninger', art: 'resultat', skatterolle: 'stiftelse' });
    expect(konto('3630')).toMatchObject({
      navn: 'Renter Skattekonto',
      art: 'resultat',
      skatterolle: 'skattekonto-rente',
    });
    expect(art('3630')).toBe('resultat');
    expect(konto('5500')?.art).toBe('balance');
    expect(konto('6110')?.art).toBe('varelager');
    expect(konto('6310')?.art).toBe('mellemregning-ejer');
    expect(konto('6810')?.navn).toContain('sambeskatningsbidrag');
    expect(konto('6820')?.navn).toContain('Tilgodehavende');
    expect(konto('6910')?.navn).toBe('A-skat');
    expect(konto('6920')?.navn).toBe('AM-bidrag');
    expect(konto('7410')?.art).toBe('egenkapital');
    expect(konto('7510')?.navn).toBe('Overført resultat');
    expect(art('1010')).toBe('resultat');
    expect(konto('9999')).toBeNull();
    expect(art('9999')).toBeNull();
  });
});

describe('kildekonto-mapping', () => {
  it('gemmer én mapping pr. kildekonto og gætter aldrig', () => {
    let mapping = gemMapping([], 'economic', '1000', '1010');
    expect(kontoForKilde('economic', '1000', mapping)).toBe('1010');
    mapping = gemMapping(mapping, 'economic', '1000', '3410');
    expect(kontoForKilde('economic', '1000', mapping)).toBe('3410');
    expect(kontoForKilde('economic', 'ukendt', mapping)).toBeNull();
    expect(kontoForKilde('billy', '1000', mapping)).toBeNull();
  });
});
