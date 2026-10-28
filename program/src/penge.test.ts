import { describe, expect, it } from 'vitest';
import { erForLang, kalenderMaaneder, parseDanskBeloeb } from './penge';

describe('danske beløb', () => {
  it('læser punktum som tusindtalskilletegn', () => {
    expect(parseDanskBeloeb('730.271')).toBe(73_027_100);
    expect(parseDanskBeloeb('1.234.567,89')).toBe(123_456_789);
    expect(parseDanskBeloeb('-23.541')).toBe(-2_354_100);
    expect(parseDanskBeloeb('92.000,00 kr')).toBe(9_200_000);
  });

  it('læser komma som decimal og engelsk decimal med to pladser', () => {
    expect(parseDanskBeloeb('1.250,50')).toBe(125_050);
    expect(parseDanskBeloeb('(1.250,50)')).toBe(-125_050);
    expect(parseDanskBeloeb('1.250,50-')).toBe(-125_050);
    expect(parseDanskBeloeb('730.27')).toBe(73_027);
    expect(parseDanskBeloeb('0,00')).toBe(0);
  });

  it('afviser et tal, der ikke er entydigt', () => {
    expect(parseDanskBeloeb('1,234')).toBeNull();
    expect(parseDanskBeloeb('')).toBeNull();
  });
});

describe('regnskabsårets længde', () => {
  it('tillader præcis 12 og 18 måneder og afviser dagen efter', () => {
    expect(erForLang('2024-09-01', '2025-08-31', 12)).toBe(false);
    expect(erForLang('2024-06-07', '2025-08-31', 12)).toBe(true);
    expect(erForLang('2024-06-07', '2025-08-31', 18)).toBe(false);
    expect(erForLang('2024-06-07', '2025-12-06', 18)).toBe(false);
    expect(erForLang('2024-06-07', '2025-12-07', 18)).toBe(true);
    expect(kalenderMaaneder('2024-06-07', '2025-08-31')).toBe(15);
    expect(kalenderMaaneder('2024-09-01', '2025-08-31')).toBe(12);
  });
});
