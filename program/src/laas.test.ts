import { describe, expect, it } from 'vitest';
import type { BilagPost } from './bilag';
import { periodeLaast, proevBilag } from './laas';

const post = (dato: string): BilagPost => ({
  id: '1',
  kilde: 'test',
  bilagsnummer: 'B1',
  dato,
  tekst: 'Test',
  konto: '5500',
  beloeb: 100,
  momskode: '',
  stornoAf: null,
});

describe('låste perioder', () => {
  const laaste = [
    { fra: '2024-09-01', til: '2024-09-30' },
    { fra: '2024-01-01', til: '2024-12-31' },
  ];

  it('genkender måned og år som lukkede intervaller', () => {
    expect(periodeLaast('2024-09-15', laaste)).toBe(true);
    expect(periodeLaast('2024-09-30', laaste)).toBe(true);
    expect(periodeLaast('2024-06-07', laaste)).toBe(true);
    expect(periodeLaast('2025-01-01', laaste)).toBe(false);
  });

  it('afviser bogføring og tilbageførsel i låst periode', () => {
    const kunSeptember = [{ fra: '2024-09-01', til: '2024-09-30' }];
    expect(proevBilag(kunSeptember, post('2024-09-30'))).toContain('låst');
    expect(proevBilag(kunSeptember, post('2024-10-01'))).toBeNull();
  });
});
