import { describe, expect, it } from 'vitest';
import {
  DISPONERING_FEJL,
  KLASSE_B_GRAENSER,
  bygRapport,
  disponering,
  disponeringRest,
  erKapitalejerlaan,
  kanSende,
  kontiUdenLinje,
  kontrollerAar,
  kursregulering,
  lagerdifference,
  lagerregulering,
  medtagLedelsespateegning,
  postFindes,
  regnskabsklasse,
  valutareguleringer,
  type Poster,
  type RapportLinje,
} from './aar';
import { HAEFTELSESTEKST } from './skat';

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
    expect(kontrol({ anlaegFindes: true, afskrivningStemmer: false }).kanLaase).toBe(false);
    expect(kontrol().linjer.map((linje) => linje.navn)).not.toContain('Anlæg');
  });

  it('regner kurs og lagerdifference, når posten findes', () => {
    expect(kursregulering(100, 740, 746)).toBe(600);
    expect(lagerdifference(kr(10_000), kr(8_000))).toBe(kr(-2_000));
  });
});

const find = (linjer: RapportLinje[], tekst: string) => linjer.find((linje) => linje.tekst === tekst);

const handel: Poster[] = [
  { kontonummer: '1010', navn: 'Salg', beloeb: kr(-500_000), rolle: 'omsaetning' },
  { kontonummer: '1310', navn: 'Varekøb', beloeb: kr(200_000), rolle: 'vareforbrug' },
  { kontonummer: '2210', navn: 'Lønninger', beloeb: kr(120_000), rolle: 'personale' },
  { kontonummer: '3010', navn: 'Husleje', beloeb: kr(30_000), rolle: 'andre-omkostninger' },
  { kontonummer: '3620', navn: 'Stiftelse', beloeb: kr(5_000), rolle: 'stiftelse' },
  { kontonummer: '3630', navn: 'Renter Skattekontoen', beloeb: kr(500), rolle: 'skattekonto-rente' },
  { kontonummer: '3910', navn: 'Afskrivninger', beloeb: kr(20_000), rolle: 'regnskabsafskrivning' },
  { kontonummer: '5010', navn: 'Maskine', beloeb: kr(80_000), rolle: 'anlaeg' },
  { kontonummer: '5310', navn: 'Varelager', beloeb: kr(0), rolle: 'varelager' },
  { kontonummer: '5610', navn: 'Debitorer', beloeb: kr(40_000), rolle: 'tilgodehavende' },
  { kontonummer: '5810', navn: 'Bank', beloeb: kr(124_500), rolle: 'bank' },
  { kontonummer: '6110', navn: 'Anpartskapital', beloeb: kr(-40_000), rolle: 'egenkapital' },
  { kontonummer: '7210', navn: 'Moms', beloeb: kr(-30_000), rolle: 'moms' },
  { kontonummer: '7410', navn: 'Kreditorer', beloeb: kr(-50_000), rolle: 'gaeld' },
];

function handelsrapport(over: Partial<Parameters<typeof bygRapport>[0]> = {}) {
  return bygRapport({
    form: 'aps',
    foersteAar: true,
    klasseB: true,
    poster: handel,
    skatteafskrivning: kr(20_000),
    fremfoertUnderskud: 0,
    modregnetUnderskud: 0,
    sambeskatning: false,
    administrationsselskab: false,
    regnskabsvaerdiAnlaeg: null,
    skattevaerdiAnlaeg: null,
    harSidsteAar: false,
    overfoert: kr(95_900),
    udbytte: 0,
    ...over,
  });
}

describe('årsrapport', () => {
  it('samler klasse B til bruttofortjeneste, og hver linje kan spores til konti', () => {
    const regnskab = handelsrapport();
    const brutto = find(regnskab.resultat, 'Bruttofortjeneste');
    expect(brutto?.beloeb).toBe(kr(300_000));
    expect(brutto?.konti).toEqual(['1010', '1310']);
    expect(find(regnskab.resultat, 'Nettoomsætning')).toBeUndefined();
    for (const linje of [...regnskab.resultat, ...regnskab.balanceAktiver, ...regnskab.egenkapital, ...regnskab.gaeld]) {
      if (!linje.beregnet) expect(linje.konti?.length ?? 0).toBeGreaterThan(0);
    }
    expect(find(regnskab.resultat, 'Andre omkostninger')?.konti).toEqual(['3010', '3620', '3630']);
    expect(kontiUdenLinje(regnskab, handel)).toEqual([]);
    expect(regnskab.skat.aktuelSkat).toBe(kr(28_600));
    expect(regnskab.aaretsResultat).toBe(kr(124_500) - kr(28_600));
    expect(regnskab.balanceForskel).toBe(0);
  });

  it('opdeler omsætning og vareforbrug, når klasse B ikke må bruges', () => {
    const regnskab = handelsrapport({ klasseB: false });
    expect(find(regnskab.resultat, 'Nettoomsætning')?.beloeb).toBe(kr(500_000));
    expect(find(regnskab.resultat, 'Vareforbrug')?.beloeb).toBe(kr(200_000));
    expect(find(regnskab.resultat, 'Bruttofortjeneste')).toBeUndefined();
    const forStor = handelsrapport({ klassetal: { balancesum: kr(60_000_000), nettoomsaetning: kr(120_000_000), ansatte: 10 } });
    expect(find(forStor.resultat, 'Bruttofortjeneste')).toBeUndefined();
    expect(forStor.fejl.join(' ')).toContain('klasse B');
  });

  it('har ingen sammenligningskolonne i første år', () => {
    const sidste = handelsrapport();
    const foerste = handelsrapport({ foersteAar: true, harSidsteAar: true, sidsteAarsRapport: sidste });
    expect(foerste.sammenligning).toBe(false);
    expect([...foerste.resultat, ...foerste.balanceAktiver, ...foerste.egenkapital, ...foerste.gaeld].some((linje) => linje.sidsteAar !== undefined)).toBe(false);
  });

  it('har sammenligningskolonnen i et senere år', () => {
    const sidste = handelsrapport();
    const senere = handelsrapport({ foersteAar: false, poster: handel.filter((post) => post.kontonummer !== '3620'), sidsteAarsRapport: sidste });
    expect(senere.sammenligning).toBe(true);
    expect(find(senere.resultat, 'Bruttofortjeneste')?.sidsteAar).toBe(kr(300_000));
    expect(senere.resultat.every((linje) => linje.sidsteAar !== undefined)).toBe(true);
  });

  it('fører udskudt skat gennem resultatet, så balancen stadig stemmer', () => {
    const regnskab = handelsrapport({ regnskabsvaerdiAnlaeg: kr(80_000), skattevaerdiAnlaeg: kr(60_000), overfoert: kr(95_900) - kr(4_400) });
    expect(find(regnskab.gaeld, 'Udskudt skat')?.beloeb).toBe(kr(4_400));
    expect(find(regnskab.resultat, 'Skat af årets resultat')?.beloeb).toBe(kr(28_600) + kr(4_400));
    expect(regnskab.aaretsResultat).toBe(kr(95_900) - kr(4_400));
    expect(regnskab.balanceForskel).toBe(0);
    expect(regnskab.disponeringRest).toBe(0);
    expect(regnskab.notePoster).toContain('udskudt-skat');
  });

  it('regulerer kun ændringen i udskudt skat i et senere år', () => {
    const poster: Poster[] = [
      ...handel.filter((post) => post.kontonummer !== '7410'),
      { kontonummer: '7410', navn: 'Kreditorer', beloeb: kr(-46_000), rolle: 'gaeld' },
      { kontonummer: '7610', navn: 'Udskudt skat', beloeb: kr(-4_000), rolle: 'udskudt-skat' },
    ];
    const regnskab = handelsrapport({ foersteAar: false, poster, regnskabsvaerdiAnlaeg: kr(80_000), skattevaerdiAnlaeg: kr(60_000), overfoert: kr(95_900) - kr(400) });
    expect(find(regnskab.resultat, 'Skat af årets resultat')?.beloeb).toBe(kr(28_600) + kr(400));
    expect(find(regnskab.gaeld, 'Udskudt skat')?.beloeb).toBe(kr(4_400));
    expect(find(regnskab.gaeld, 'Udskudt skat')?.konti).toEqual(['7610']);
    expect(regnskab.balanceForskel).toBe(0);
  });

  it('giver en enkeltmandsvirksomhed hverken selskabsskat, hæftelse eller udbytte', () => {
    const regnskab = handelsrapport({ form: 'enkeltmand', sambeskatning: true, overfoert: 0 });
    expect(find(regnskab.resultat, 'Skat af årets resultat')).toBeUndefined();
    expect(find(regnskab.resultat, 'Årets resultat')?.beloeb).toBe(kr(124_500));
    expect(find(regnskab.gaeld, 'Skyldig selskabsskat')).toBeUndefined();
    expect(regnskab.noter).not.toContain(HAEFTELSESTEKST);
    expect(regnskab.skat.note).toBeNull();
    expect(regnskab.fejl.join(' ')).toContain('sambeskatning');
    expect(regnskab.balanceForskel).toBe(0);
    expect(handelsrapport({ form: 'enkeltmand', udbytte: kr(1_000) }).fejl.join(' ')).toContain('udbytte');
  });

  it('tager kun hæftelsesnoten med, når sambeskatning er slået til', () => {
    expect(handelsrapport().noter).not.toContain(HAEFTELSESTEKST);
    expect(handelsrapport({ sambeskatning: true }).noter).toContain(HAEFTELSESTEKST);
  });
});

describe('disponering', () => {
  it('låser ikke, når årets resultat ikke er fordelt helt', () => {
    const forkert = disponering(kr(139_740), kr(100_000), kr(30_000));
    expect(forkert.rest).toBe(kr(9_740));
    expect(forkert.stemmer).toBe(false);
    expect(kontrol({ disponeringRest: forkert.rest }).kanLaase).toBe(false);
    expect(handelsrapport({ overfoert: kr(90_000) }).disponeringRest).toBe(kr(5_900));
    const rigtig = disponering(kr(139_740), kr(109_740), kr(30_000));
    expect(rigtig.stemmer).toBe(true);
    expect(kontrol({ disponeringRest: rigtig.rest }).kanLaase).toBe(true);
  });

  it('viser udbytte som foreslået under egenkapitalen og ikke som gæld', () => {
    const regnskab = handelsrapport({ overfoert: kr(75_900), udbytte: kr(20_000) });
    expect(find(regnskab.egenkapital, 'Foreslået udbytte')?.beloeb).toBe(kr(20_000));
    expect(regnskab.gaeld.some((linje) => linje.tekst.toLowerCase().includes('udbytte'))).toBe(false);
    expect(regnskab.balanceForskel).toBe(0);
    expect(disponering(kr(10_000), kr(20_000), kr(-10_000)).fejl).toContain('negativt');
  });
});

describe('fælder', () => {
  it('kalder en debetsaldo på mellemregning i ApS og A/S et ulovligt kapitalejerlån', () => {
    expect(erKapitalejerlaan('aps', kr(5_000))).toBe(true);
    expect(erKapitalejerlaan('as', kr(5_000))).toBe(true);
    expect(erKapitalejerlaan('enkeltmand', kr(5_000))).toBe(false);
    expect(erKapitalejerlaan('aps', kr(-5_000))).toBe(false);

    const laan = kontrol({ form: 'as', mellemregningEjer: kr(5_000) });
    expect(laan.kanLaase).toBe(false);
    expect(laan.linjer.find((linje) => linje.navn === 'Mellemregning med ejer')?.tekst).toContain('ulovligt kapitalejerlån');
    expect(kontrol({ mellemregningEjer: kr(5_000), afklaring: '   ' }).kanLaase).toBe(false);
    expect(kontrol({ mellemregningEjer: kr(5_000), afklaring: 'Indfriet 15.01.' }).kanLaase).toBe(true);
    expect(kontrol({ form: 'enkeltmand', mellemregningEjer: kr(5_000) }).linjer.map((linje) => linje.navn)).not.toContain('Mellemregning med ejer');
    expect(kontrol({ mellemregningEjer: kr(-5_000) }).linjer.map((linje) => linje.navn)).not.toContain('Mellemregning med ejer');

    const regnskab = handelsrapport({ poster: [...handel.filter((post) => post.kontonummer !== '5810'), { kontonummer: '5810', navn: 'Bank', beloeb: kr(119_500), rolle: 'bank' }, { kontonummer: '6810', navn: 'Mellemregning ejer', beloeb: kr(5_000), rolle: 'mellemregning-ejer' }] });
    expect(regnskab.kapitalejerlaan).toBe(true);
    expect(regnskab.notePoster).toContain('kapitalejerlaan');
  });

  it('bogfører lagerdifferencen mod vareforbrug og spørger kun, når der er et varelager', () => {
    expect(lagerregulering(kr(10_000), kr(8_000))).toEqual([
      { rolle: 'varelager', beloeb: kr(-2_000) },
      { rolle: 'vareforbrug', beloeb: kr(2_000) },
    ]);
    expect(lagerregulering(kr(10_000), kr(10_000))).toEqual([]);
    expect(postFindes(handel, 'varelager')).toBe(false);
    const lager = [...handel, { kontonummer: '5320', navn: 'Varelager', beloeb: kr(15_000), rolle: 'varelager' as const }];
    expect(postFindes(lager, 'varelager')).toBe(true);
    expect(kontrol({ varelagerFindes: postFindes(handel, 'varelager') }).linjer.map((linje) => linje.navn)).not.toContain('Varelager');
    expect(kontrol({ varelagerFindes: postFindes(lager, 'varelager'), varelagerBekaertet: false }).kanLaase).toBe(false);
    expect(kontrol({ varelagerFindes: postFindes(lager, 'varelager'), varelagerBekaertet: true }).kanLaase).toBe(true);
  });

  it('danner kun kursgevinst eller kurstab, når en valutakonto findes', () => {
    expect(valutareguleringer(handel, {})).toEqual({ posteringer: [], mangler: [] });
    expect(postFindes(handel, 'valuta')).toBe(false);
    const valuta: Poster[] = [
      { kontonummer: '5820', navn: 'Bank EUR', beloeb: kr(7_400), rolle: 'valuta' },
      { kontonummer: '5830', navn: 'Bank USD', beloeb: kr(6_900), rolle: 'valuta' },
      { kontonummer: '5840', navn: 'Bank SEK', beloeb: 0, rolle: 'valuta' },
    ];
    expect(valutareguleringer(valuta, { '5820': { enheder: 1_000, bogfoertKursOere: 740, lukkekursOere: 746 }, '5830': { enheder: 1_000, bogfoertKursOere: 690, lukkekursOere: 680 } }).posteringer).toEqual([
      { kontonummer: '5820', tekst: 'Kursgevinst', beloeb: kr(60) },
      { kontonummer: '5830', tekst: 'Kurstab', beloeb: kr(100) },
    ]);
    expect(valutareguleringer(valuta, { '5820': { enheder: 1_000, bogfoertKursOere: 740, lukkekursOere: null } }).mangler).toEqual(['5820', '5830']);
    expect(kontrol({ valutaFindes: postFindes(valuta, 'valuta'), valutaKursSat: false }).kanLaase).toBe(false);
  });
});

describe('regnskabsklasse og ledelse', () => {
  const graense = KLASSE_B_GRAENSER;

  it('bruger grænserne 55 mio. kr., 111 mio. kr. og 50 ansatte', () => {
    expect(graense).toEqual({ balancesum: kr(55_000_000), nettoomsaetning: kr(111_000_000), ansatte: 50 });
  });

  it('er klasse C, når to af tre grænser er overskredet', () => {
    expect(regnskabsklasse({ balancesum: graense.balancesum + 1, nettoomsaetning: graense.nettoomsaetning + 1, ansatte: 10 })).toEqual({ klasse: 'C', kanBrugeKlasseB: false, overskredet: ['Balancesum', 'Nettoomsætning'] });
    expect(regnskabsklasse({ balancesum: 0, nettoomsaetning: graense.nettoomsaetning + 1, ansatte: 51 }).kanBrugeKlasseB).toBe(false);
    expect(regnskabsklasse({ balancesum: graense.balancesum + 1, nettoomsaetning: 0, ansatte: 51 }).klasse).toBe('C');
  });

  it('er klasse B, når højst én grænse er overskredet eller tallene står lige på grænsen', () => {
    expect(regnskabsklasse({ balancesum: graense.balancesum + 1, nettoomsaetning: 0, ansatte: 0 })).toEqual({ klasse: 'B', kanBrugeKlasseB: true, overskredet: ['Balancesum'] });
    expect(regnskabsklasse({ ...graense }).klasse).toBe('B');
  });

  it('sender ikke ledelsesberetningen, før et menneske har godkendt den', () => {
    expect(kanSende(false)).toBe(false);
    expect(kanSende(true)).toBe(true);
  });

  it('medtager ikke ledelsespåtegning, når ledelsen kun har ét medlem', () => {
    expect(medtagLedelsespateegning(1)).toBe(false);
    expect(medtagLedelsespateegning(2)).toBe(true);
    expect(medtagLedelsespateegning(3)).toBe(true);
  });
});

describe('kontrol af året', () => {
  it('har linjer for saldo, balance, disponering, moms, skat og noter', () => {
    const navne = kontrol({ balanceForskel: 0, manglendeNoter: [] }).linjer.map((linje) => linje.navn);
    expect(navne).toEqual(['Saldobalance', 'Balance', 'Disponering', 'Moms', 'Bank', 'Skat', 'Noter']);
  });

  it('slukker låsen, når en relevant linje er rød', () => {
    expect(kontrol({ balanceForskel: 1 }).kanLaase).toBe(false);
    expect(kontrol({ manglendeNoter: ['Anlægsaktiver'] }).kanLaase).toBe(false);
    expect(kontrol({ manglendeNoter: ['Anlægsaktiver'] }).linjer.find((linje) => linje.navn === 'Noter')?.tekst).toContain('Anlægsaktiver');
    expect(kontrol({ momsStemmer: false }).kanLaase).toBe(false);
    expect(kontrol({ skatFejl: 'Skattebroen går ikke op.' }).kanLaase).toBe(false);
    expect(kontrol({ saldoSum: 1 }).kanLaase).toBe(false);
    expect(kontrol({ balanceForskel: 0, manglendeNoter: [] }).kanLaase).toBe(true);
  });

  it('spørger ikke om skat for en enkeltmandsvirksomhed, men afviser sambeskatning', () => {
    expect(kontrol({ form: 'enkeltmand' }).linjer.map((linje) => linje.navn)).not.toContain('Skat');
    const samb = kontrol({ form: 'enkeltmand', sambeskatning: true, haeftelsesnoteMed: true });
    expect(samb.kanLaase).toBe(false);
    expect(samb.linjer.find((linje) => linje.navn === 'Sambeskatning')?.tekst).toContain('personligt ejet');
  });
});

describe('årslåsen lader ikke en glemt fælde blive grøn', () => {
  const linjeFor = (resultat: ReturnType<typeof kontrol>, navn: string) => resultat.linjer.find((linje) => linje.navn === navn);
  const navne = (resultat: ReturnType<typeof kontrol>) => resultat.linjer.map((linje) => linje.navn);

  it('siger ikke, at saldobalancen stemmer, når den ikke er godkendt', () => {
    const ikkeGodkendt = kontrol({ saldoSum: 0, saldobalanceGodkendt: false });
    expect(ikkeGodkendt.kanLaase).toBe(false);
    expect(linjeFor(ikkeGodkendt, 'Saldobalance')?.ok).toBe(false);
    expect(linjeFor(ikkeGodkendt, 'Saldobalance')?.tekst).toContain('ikke godkendt');
    expect(linjeFor(ikkeGodkendt, 'Saldobalance')?.tekst).not.toMatch(/stemmer\./);

    const skaev = kontrol({ saldoSum: kr(1), saldobalanceGodkendt: false });
    expect(linjeFor(skaev, 'Saldobalance')?.tekst).toContain('stemmer ikke');
    expect(linjeFor(skaev, 'Saldobalance')?.ok).toBe(false);

    expect(linjeFor(kontrol(), 'Saldobalance')?.ok).toBe(true);
  });

  it('gør disponeringen rød ved negativt udbytte med teksten fra disponering()', () => {
    const negativ = kontrol({ disponeringRest: 0, udbytte: kr(-10_000) });
    expect(negativ.kanLaase).toBe(false);
    expect(linjeFor(negativ, 'Disponering')?.tekst).toBe(disponering(kr(10_000), kr(20_000), kr(-10_000)).fejl);
    expect(linjeFor(negativ, 'Disponering')?.tekst).toBe(DISPONERING_FEJL.negativtUdbytte);

    expect(linjeFor(kontrol({ disponeringRest: 0, udbytte: 0 }), 'Disponering')?.ok).toBe(true);
    expect(linjeFor(kontrol({ disponeringRest: 0, udbytte: kr(20_000) }), 'Disponering')?.ok).toBe(true);
    expect(linjeFor(kontrol({ disponeringRest: kr(1), udbytte: kr(20_000) }), 'Disponering')?.ok).toBe(false);
    expect(linjeFor(kontrol({ disponeringRest: 0 }), 'Disponering')?.ok).toBe(true);
    expect(linjeFor(kontrol({ disponeringRest: kr(1) }), 'Disponering')?.ok).toBe(false);
  });

  it('gør kun anlæg grønt, når afskrivningen udtrykkeligt stemmer', () => {
    expect(linjeFor(kontrol({ anlaegFindes: true, afskrivningStemmer: true }), 'Anlæg')?.ok).toBe(true);
    expect(linjeFor(kontrol({ anlaegFindes: true, afskrivningStemmer: false }), 'Anlæg')?.ok).toBe(false);
    const glemt = kontrol({ anlaegFindes: true });
    expect(glemt.kanLaase).toBe(false);
    expect(linjeFor(glemt, 'Anlæg')?.ok).toBe(false);
    expect(navne(kontrol({ anlaegFindes: false, afskrivningStemmer: false }))).not.toContain('Anlæg');
    expect(navne(kontrol())).not.toContain('Anlæg');
  });

  it('gør regnskabsåret rødt med fejlene, når der er fejl', () => {
    const fejl = ['Første regnskabsår kan højst vare 18 måneder.', 'Første regnskabsår starter den dag selskabet er stiftet.'];
    const roed = kontrol({ regnskabsaarFejl: fejl });
    expect(roed.kanLaase).toBe(false);
    expect(linjeFor(roed, 'Regnskabsår')?.ok).toBe(false);
    for (const tekst of fejl) expect(linjeFor(roed, 'Regnskabsår')?.tekst).toContain(tekst);
    expect(linjeFor(kontrol({ regnskabsaarFejl: [] }), 'Regnskabsår')?.ok).toBe(true);
    expect(kontrol({ regnskabsaarFejl: [] }).kanLaase).toBe(true);
    expect(navne(kontrol())).not.toContain('Regnskabsår');
  });

  it('gør konti rød og nævner kontonumrene, når en konto ikke indgår i rapporten', () => {
    const roed = kontrol({ kontiUdenLinje: ['5310', '6810'] });
    expect(roed.kanLaase).toBe(false);
    expect(linjeFor(roed, 'Konti')?.ok).toBe(false);
    expect(linjeFor(roed, 'Konti')?.tekst).toContain('5310');
    expect(linjeFor(roed, 'Konti')?.tekst).toContain('6810');
    expect(linjeFor(kontrol({ kontiUdenLinje: [] }), 'Konti')?.ok).toBe(true);
    expect(kontrol({ kontiUdenLinje: kontiUdenLinje(handelsrapport(), handel) }).kanLaase).toBe(true);
    expect(navne(kontrol())).not.toContain('Konti');
  });
});
