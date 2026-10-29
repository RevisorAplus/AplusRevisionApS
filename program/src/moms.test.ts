import { describe, expect, it } from 'vitest';
import { MOMS_PROCENT, momsangivelse, momsFelter, momsStemmer } from './moms';

const kr = (kroner: number) => Math.round(kroner * 100);

describe('momskoder', () => {
  it('bruger 25 procent', () => {
    expect(MOMS_PROCENT).toBe(25);
  });

  it('lægger salg25 i salgsmoms og intet andet sted', () => {
    const felter = momsFelter('salg25', kr(12_500));
    expect(felter).toMatchObject({ grundlag: kr(10_000), salgsmoms: kr(2_500), koebsmoms: 0, euYdelser: 0, euErhvervelser: 0, ikkeFradrag: 0, rubrik: null, fejl: null });
  });

  it('lægger koeb25 i købsmoms og intet andet sted', () => {
    const felter = momsFelter('koeb25', kr(12_500));
    expect(felter).toMatchObject({ grundlag: kr(10_000), salgsmoms: 0, koebsmoms: kr(2_500), euYdelser: 0, euErhvervelser: 0, rubrik: null });
  });

  it('lægger eu-erhvervelse i moms af varekøb, købsmoms og rubrik A varer', () => {
    const felter = momsFelter('eu-erhvervelse', kr(10_000));
    expect(felter).toMatchObject({ grundlag: kr(10_000), salgsmoms: 0, euErhvervelser: kr(2_500), euYdelser: 0, koebsmoms: kr(2_500) });
    expect(felter.rubrik).toEqual({ felt: 'rubrikAVarer', tekst: 'Rubrik A – varer', beloeb: kr(10_000) });
  });

  it('lægger omvendt betalingspligt i moms af ydelseskøb, købsmoms og rubrik A ydelser', () => {
    const felter = momsFelter('omvendt', kr(10_000));
    expect(felter).toMatchObject({ grundlag: kr(10_000), salgsmoms: 0, euYdelser: kr(2_500), euErhvervelser: 0, koebsmoms: kr(2_500) });
    expect(felter.rubrik?.felt).toBe('rubrikAYdelser');
  });

  it('lader ingen ramme noget felt', () => {
    expect(momsFelter('ingen', kr(1_000))).toMatchObject({ grundlag: kr(1_000), salgsmoms: 0, koebsmoms: 0, euYdelser: 0, euErhvervelser: 0, ikkeFradrag: 0, rubrik: null });
  });

  it('giver kun fradrag for fradragsprocenten ved delvis fradrag', () => {
    const felter = momsFelter('delvis', kr(12_500), 30);
    expect(felter.koebsmoms).toBe(kr(750));
    expect(felter.ikkeFradrag).toBe(kr(1_750));
    expect(felter.koebsmoms).not.toBe(kr(2_500));
    expect(felter.koebsmoms + felter.ikkeFradrag).toBe(kr(2_500));
    expect(felter.salgsmoms).toBe(0);
    expect(momsFelter('delvis', kr(12_500), 0).koebsmoms).toBe(0);
    expect(momsFelter('delvis', kr(12_500), 100).koebsmoms).toBe(kr(2_500));
  });

  it('afviser delvis fradrag uden en gyldig procent', () => {
    expect(momsFelter('delvis', kr(12_500)).fejl).toContain('fradragsprocent');
    expect(momsFelter('delvis', kr(12_500), 120).fejl).toContain('fradragsprocent');
    expect(momsFelter('delvis', kr(12_500), -5).koebsmoms).toBe(0);
  });

  it('regner i hele øre, også for kreditnotaer', () => {
    expect(momsFelter('salg25', 99).salgsmoms).toBe(20);
    expect(momsFelter('salg25', kr(-12_500)).salgsmoms).toBe(kr(-2_500));
    expect(momsFelter('salg25', 12.5).fejl).toContain('øre');
  });
});

describe('momsangivelse', () => {
  it('samler felterne og regner afgiften', () => {
    const angivelse = momsangivelse([
      { kode: 'salg25', beloeb: kr(12_500) },
      { kode: 'eu-erhvervelse', beloeb: kr(10_000) },
      { kode: 'omvendt', beloeb: kr(4_000) },
      { kode: 'koeb25', beloeb: kr(6_250) },
      { kode: 'delvis', beloeb: kr(1_250), fradragProcent: 50 },
    ]);
    expect(angivelse.salgsmoms).toBe(kr(2_500));
    expect(angivelse.euErhvervelser).toBe(kr(2_500));
    expect(angivelse.euYdelser).toBe(kr(1_000));
    expect(angivelse.koebsmoms).toBe(kr(2_500) + kr(1_000) + kr(1_250) + kr(125));
    expect(angivelse.rubrikAVarer).toBe(kr(10_000));
    expect(angivelse.rubrikAYdelser).toBe(kr(4_000));
    expect(angivelse.ikkeFradrag).toBe(kr(125));
    expect(angivelse.afgift).toBe(kr(1_125));
    expect(angivelse.fejl).toEqual([]);
  });

  it('kan ikke stemme, når afgiften ikke er lig momskontoen', () => {
    expect(momsStemmer(kr(1_125), kr(1_125))).toBe(true);
    expect(momsStemmer(kr(1_125), kr(1_125) - 1)).toBe(false);
    expect(momsStemmer(kr(1_125), 0)).toBe(false);
  });
});
