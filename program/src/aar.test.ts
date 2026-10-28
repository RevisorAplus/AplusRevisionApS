import { describe, expect, it } from 'vitest';
import { bygRapport, disponeringRest, kontrollerAar, kursregulering, lagerdifference, type Poster } from './aar';

const kr = (kroner: number) => Math.round(kroner * 100);

const poster: Poster[] = [
  { kontonummer: '1010', navn: 'Salg', beloeb: kr(-228_000), rolle: 'omsaetning' },
  { kontonummer: '3610', navn: 'Repræsentation', beloeb: kr(8_000), rolle: 'ikke-fradrag' },
  { kontonummer: '3910', navn: 'Afskrivninger', beloeb: kr(40_000), rolle: 'regnskabsafskrivning' },
  { kontonummer: '2210', navn: 'Lønninger', beloeb: kr(0), rolle: 'personale' },
  { kontonummer: '5110', navn: 'Bank', beloeb: kr(220_000), rolle: 'bank' },
  { kontonummer: '6110', navn: 'Anpartskapital', beloeb: kr(-40_000), rolle: 'egenkapital' },
];

function rapport(over: Partial<Parameters<typeof bygRapport>[0]> = {}) {
  return bygRapport({
    form: 'aps',
    foersteAar: true,
    klasseB: true,
    poster,
    skatteafskrivning: kr(25_000),
    fremfoertUnderskud: kr(20_000),
    modregnetUnderskud: 0,
    sambeskatning: false,
    administrationsselskab: false,
    regnskabsvaerdiAnlaeg: null,
    skattevaerdiAnlaeg: null,
    harSidsteAar: true,
    overfoert: kr(139_740),
    udbytte: 0,
    ...over,
  });
}

function kontrol(over: Partial<Parameters<typeof kontrollerAar>[0]> = {}) {
  return kontrollerAar({
    form: 'aps',
    saldoSum: 0,
    saldobalanceGodkendt: true,
    disponeringRest: 0,
    momsStemmer: true,
    bankLukket: true,
    skatFejl: null,
    mellemregningEjer: null,
    afklaringLaan: '',
    varelagerFindes: false,
    varelagerBekaertet: false,
    valutaFindes: false,
    valutaKursSat: false,
    sambeskatning: false,
    haeftelsesnoteMed: false,
    ...over,
  });
}

describe('årsregnskab og kontrol', () => {
  it('samler klasse B til bruttofortjeneste og skjuler sidste år i første regnskabsår', () => {
    const regnskab = rapport();
    expect(regnskab.sammenligning).toBe(false);
    expect(regnskab.resultat.find((linje) => linje.tekst === 'Bruttofortjeneste')?.beloeb).toBe(kr(228_000));
    expect(regnskab.resultat.find((linje) => linje.tekst === 'Årets resultat')?.beloeb).toBe(kr(139_740));
    expect(regnskab.skat.aktuelSkat).toBe(kr(40_260));
    expect(regnskab.noter).not.toContain('Personaleomkostninger');
    const aktiver = regnskab.balanceAktiver.reduce((sum, linje) => sum + linje.beloeb, 0);
    const passiver = [...regnskab.egenkapital, ...regnskab.gaeld].reduce((sum, linje) => sum + linje.beloeb, 0);
    expect(aktiver).toBe(passiver);
  });

  it('lader foreslået udbytte stå under egenkapitalen', () => {
    const regnskab = rapport({ overfoert: kr(129_740), udbytte: kr(10_000) });
    expect(regnskab.egenkapital.some((linje) => linje.tekst === 'Foreslået udbytte')).toBe(true);
    expect(regnskab.gaeld.some((linje) => linje.tekst === 'Foreslået udbytte')).toBe(false);
    expect(disponeringRest(kr(139_740), kr(129_740), kr(10_000))).toBe(0);
  });

  it('kalder skatten et bidrag og tager hæftelsesnoten med, når sambeskatning er til', () => {
    const regnskab = rapport({ sambeskatning: true, fremfoertUnderskud: 0, modregnetUnderskud: kr(20_000) });
    expect(regnskab.gaeld.some((linje) => linje.tekst === 'Skyldigt sambeskatningsbidrag')).toBe(true);
    expect(regnskab.resultat.some((linje) => linje.tekst === 'Bidrag til administrationsselskabet')).toBe(true);
    expect(regnskab.noter.some((note) => note.includes('solidarisk'))).toBe(true);
  });

  it('låser kun når kontrollerne er grønne og skjuler fælder, kunden ikke har', () => {
    const groent = kontrol();
    expect(groent.kanLaase).toBe(true);
    expect(groent.linjer.map((linje) => linje.navn)).not.toContain('Varelager');
    expect(groent.linjer.map((linje) => linje.navn)).not.toContain('Valuta');
    expect(groent.linjer.map((linje) => linje.navn)).not.toContain('Mellemregning med ejer');

    expect(kontrol({ disponeringRest: kr(1) }).kanLaase).toBe(false);
    expect(kontrol({ form: 'aps', mellemregningEjer: kr(5_000) }).kanLaase).toBe(false);
    expect(kontrol({ form: 'aps', mellemregningEjer: kr(5_000), afklaringLaan: 'Indfriet i januar.' }).kanLaase).toBe(true);
    expect(kontrol({ form: 'enkeltmand', mellemregningEjer: kr(5_000) }).kanLaase).toBe(true);
    expect(kontrol({ varelagerFindes: true }).kanLaase).toBe(false);
    expect(kontrol({ valutaFindes: true }).kanLaase).toBe(false);
    expect(kontrol({ sambeskatning: true, haeftelsesnoteMed: false }).kanLaase).toBe(false);
  });

  it('regner kurs og lagerdifference, når posten findes', () => {
    expect(kursregulering(100, 740, 746)).toBe(600);
    expect(lagerdifference(kr(10_000), kr(8_000))).toBe(kr(-2_000));
  });
});
