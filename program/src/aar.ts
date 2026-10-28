import type { NotePost } from './noter';
import { beregnSkat, erSelskab, HAEFTELSESTEKST, type SkatGrundlag, type SkatResultat, type Selskabsform } from './skat';

export type PosterRolle =
  | 'omsaetning'
  | 'vareforbrug'
  | 'personale'
  | 'andre-omkostninger'
  | 'finans'
  | 'stiftelse'
  | 'skattekonto-rente'
  | 'ikke-fradrag'
  | 'regnskabsafskrivning'
  | 'anlaeg'
  | 'varelager'
  | 'tilgodehavende'
  | 'bank'
  | 'egenkapital'
  | 'overfoert-resultat'
  | 'mellemregning-ejer'
  | 'gaeld'
  | 'udskudt-skat'
  | 'moms'
  | 'valuta';

export type Poster = {
  kontonummer: string;
  navn: string;
  beloeb: number;
  rolle: PosterRolle;
};

export type RapportLinje = {
  tekst: string;
  beloeb: number;
  konti?: string[];
  beregnet?: boolean;
  sidsteAar?: number;
};

export type Rapport = {
  sammenligning: boolean;
  resultat: RapportLinje[];
  balanceAktiver: RapportLinje[];
  egenkapital: RapportLinje[];
  gaeld: RapportLinje[];
  noter: string[];
  skat: SkatResultat;
  aaretsResultat: number;
  disponeringRest: number;
  balanceForskel: number;
  kapitalejerlaan: boolean;
  notePoster: NotePost[];
  fejl: string[];
};

export type Klassetal = { balancesum: number; nettoomsaetning: number; ansatte: number };

const RESULTAT_ROLLER: PosterRolle[] = ['omsaetning', 'vareforbrug', 'personale', 'andre-omkostninger', 'finans', 'stiftelse', 'skattekonto-rente', 'ikke-fradrag', 'regnskabsafskrivning'];

export function bygRapport(input: {
  form: Selskabsform;
  foersteAar: boolean;
  klasseB: boolean;
  poster: Poster[];
  skatteafskrivning: number;
  fremfoertUnderskud: number;
  modregnetUnderskud: number;
  sambeskatning: boolean;
  administrationsselskab: boolean;
  regnskabsvaerdiAnlaeg: number | null;
  skattevaerdiAnlaeg: number | null;
  harSidsteAar: boolean;
  overfoert: number;
  udbytte: number;
  sidsteAarsRapport?: Rapport;
  klassetal?: Klassetal;
}): Rapport {
  const sum = (...roller: PosterRolle[]) => input.poster.filter((post) => roller.includes(post.rolle)).reduce((acc, post) => acc + post.beloeb, 0);
  const konti = (...roller: PosterRolle[]) => input.poster.filter((post) => roller.includes(post.rolle) && post.beloeb !== 0).map((post) => post.kontonummer);
  const fraKonti = (tekst: string, beloeb: number, ...roller: PosterRolle[]): RapportLinje => ({ tekst, beloeb, konti: konti(...roller) });
  const beregnet = (tekst: string, beloeb: number, ...roller: PosterRolle[]): RapportLinje => ({ tekst, beloeb, konti: konti(...roller), beregnet: true });

  const selskab = erSelskab(input.form);
  const fejl: string[] = [];
  const resultatFoerSkat = -sum(...RESULTAT_ROLLER);
  const grundlag: SkatGrundlag = {
    form: input.form,
    resultatFoerSkat,
    ikkeFradrag: sum('ikke-fradrag'),
    stiftelse: sum('stiftelse'),
    skattekontoRente: sum('skattekonto-rente'),
    regnskabsafskrivning: sum('regnskabsafskrivning'),
    skatteafskrivning: input.skatteafskrivning,
    fremfoertUnderskud: input.fremfoertUnderskud,
    modregnetUnderskud: input.modregnetUnderskud,
    sambeskatning: input.sambeskatning,
    administrationsselskab: input.administrationsselskab,
    regnskabsvaerdiAnlaeg: input.regnskabsvaerdiAnlaeg,
    skattevaerdiAnlaeg: input.skattevaerdiAnlaeg,
  };
  const skat = beregnSkat(grundlag);
  if (!selskab && input.sambeskatning && skat.fejl) fejl.push(skat.fejl);

  const udskudtPrimo = -sum('udskudt-skat');
  const udskudtUltimo = skat.udskudtSkat ?? udskudtPrimo;
  const skatAfAaret = selskab ? skat.aktuelSkat + udskudtUltimo - udskudtPrimo : 0;
  const aaretsResultat = resultatFoerSkat - skatAfAaret;

  let klasseB = input.klasseB;
  if (klasseB && input.klassetal && !regnskabsklasse(input.klassetal).kanBrugeKlasseB) {
    fejl.push('Virksomheden overskrider to af tre grænser for klasse B og kan ikke samle til bruttofortjeneste.');
    klasseB = false;
  }

  const resultat: RapportLinje[] = [];
  const omsaetning = -sum('omsaetning');
  const vareforbrug = sum('vareforbrug');
  if (klasseB) resultat.push(fraKonti('Bruttofortjeneste', omsaetning - vareforbrug, 'omsaetning', 'vareforbrug'));
  else {
    skub(resultat, fraKonti('Nettoomsætning', omsaetning, 'omsaetning'));
    skub(resultat, fraKonti('Vareforbrug', vareforbrug, 'vareforbrug'));
  }
  skub(resultat, fraKonti('Personaleomkostninger', sum('personale'), 'personale'));
  skub(resultat, fraKonti('Afskrivninger', sum('regnskabsafskrivning'), 'regnskabsafskrivning'));
  skub(resultat, fraKonti('Andre omkostninger', sum('andre-omkostninger', 'ikke-fradrag', 'stiftelse', 'skattekonto-rente'), 'andre-omkostninger', 'ikke-fradrag', 'stiftelse', 'skattekonto-rente'));
  skub(resultat, fraKonti('Finansielle poster', -sum('finans'), 'finans'));
  resultat.push(beregnet('Resultat før skat', resultatFoerSkat, ...RESULTAT_ROLLER));
  if (selskab) {
    resultat.push(beregnet(input.sambeskatning && !input.administrationsselskab ? 'Bidrag til administrationsselskabet' : 'Skat af årets resultat', skatAfAaret, 'udskudt-skat'));
  }
  resultat.push(beregnet('Årets resultat', aaretsResultat, ...RESULTAT_ROLLER));

  const mellemregning = sum('mellemregning-ejer');
  const aktiver: RapportLinje[] = [];
  skub(aktiver, fraKonti('Anlægsaktiver', sum('anlaeg'), 'anlaeg'));
  skub(aktiver, fraKonti('Varelager', sum('varelager'), 'varelager'));
  skub(aktiver, fraKonti('Tilgodehavender', sum('tilgodehavende'), 'tilgodehavende'));
  if (sum('moms') > 0) skub(aktiver, fraKonti('Tilgodehavende moms', sum('moms'), 'moms'));
  if (mellemregning > 0) skub(aktiver, fraKonti('Mellemregning med ejer', mellemregning, 'mellemregning-ejer'));
  skub(aktiver, fraKonti('Bank', sum('bank'), 'bank'));
  if (sum('valuta') > 0) skub(aktiver, fraKonti('Likvider i fremmed valuta', sum('valuta'), 'valuta'));

  const egenkapital: RapportLinje[] = [];
  if (selskab) {
    skub(egenkapital, fraKonti('Selskabskapital', -sum('egenkapital'), 'egenkapital'));
    skub(egenkapital, beregnet('Overført resultat', -sum('overfoert-resultat') + input.overfoert, 'overfoert-resultat'));
    skub(egenkapital, beregnet('Foreslået udbytte', input.udbytte));
  } else {
    skub(egenkapital, beregnet('Egenkapital', -sum('egenkapital', 'overfoert-resultat') + aaretsResultat, 'egenkapital', 'overfoert-resultat'));
    if (input.udbytte !== 0) fejl.push('En personligt ejet virksomhed foreslår ikke udbytte.');
  }

  const gaeld: RapportLinje[] = [];
  if (selskab && skat.balanceTekst) skub(gaeld, beregnet(skat.balanceTekst, skat.aktuelSkat));
  skub(gaeld, beregnet('Udskudt skat', udskudtUltimo, 'udskudt-skat'));
  if (sum('moms') < 0) skub(gaeld, fraKonti('Skyldig moms', -sum('moms'), 'moms'));
  skub(gaeld, fraKonti('Anden gæld', -sum('gaeld'), 'gaeld'));
  if (mellemregning < 0) skub(gaeld, fraKonti('Mellemregning med ejer', -mellemregning, 'mellemregning-ejer'));
  if (sum('valuta') < 0) skub(gaeld, fraKonti('Gæld i fremmed valuta', -sum('valuta'), 'valuta'));

  const kapitalejerlaan = erKapitalejerlaan(input.form, mellemregning);
  const noter: string[] = [];
  const notePoster: NotePost[] = [];
  if (sum('personale') !== 0) {
    noter.push('Personaleomkostninger');
    notePoster.push('personale');
  }
  if (sum('anlaeg') !== 0) notePoster.push('anlaeg');
  if (selskab && udskudtUltimo !== 0) {
    noter.push('Udskudt skat');
    notePoster.push('udskudt-skat');
  }
  if (selskab && input.sambeskatning) {
    noter.push(HAEFTELSESTEKST);
    notePoster.push('sambeskatning');
  }
  if (kapitalejerlaan) {
    noter.push('Lån til kapitalejer');
    notePoster.push('kapitalejerlaan');
  }
  if (selskab) notePoster.push('egenkapital');

  const sammenligning = !input.foersteAar && (input.harSidsteAar || input.sidsteAarsRapport !== undefined);
  const sidste = sammenligning ? input.sidsteAarsRapport : undefined;
  const balanceSum = (linjer: RapportLinje[]) => linjer.reduce((acc, linje) => acc + linje.beloeb, 0);

  return {
    sammenligning,
    resultat: medSidsteAar(resultat, sidste?.resultat),
    balanceAktiver: medSidsteAar(aktiver, sidste?.balanceAktiver),
    egenkapital: medSidsteAar(egenkapital, sidste?.egenkapital),
    gaeld: medSidsteAar(gaeld, sidste?.gaeld),
    noter,
    skat,
    aaretsResultat,
    disponeringRest: selskab ? disponeringRest(aaretsResultat, input.overfoert, input.udbytte) : 0,
    balanceForskel: balanceSum(aktiver) - balanceSum(egenkapital) - balanceSum(gaeld),
    kapitalejerlaan,
    notePoster,
    fejl,
  };
}

export function kontiUdenLinje(rapport: Rapport, poster: Poster[]): string[] {
  const brugt = new Set([...rapport.resultat, ...rapport.balanceAktiver, ...rapport.egenkapital, ...rapport.gaeld].flatMap((linje) => linje.konti ?? []));
  return poster.filter((post) => post.beloeb !== 0 && !brugt.has(post.kontonummer)).map((post) => post.kontonummer);
}

export function disponeringRest(resultat: number, overfoert: number, udbytte: number): number {
  return resultat - overfoert - udbytte;
}

export const DISPONERING_FEJL = {
  negativtUdbytte: 'Foreslået udbytte kan ikke være negativt.',
  ikkeFordelt: 'Årets resultat er ikke fordelt på overført resultat og foreslået udbytte.',
} as const;

export function disponering(aaretsResultat: number, overfoert: number, udbytte: number): { linjer: RapportLinje[]; rest: number; stemmer: boolean; fejl: string | null } {
  const rest = disponeringRest(aaretsResultat, overfoert, udbytte);
  const fejl = udbytte < 0
    ? DISPONERING_FEJL.negativtUdbytte
    : rest !== 0
      ? DISPONERING_FEJL.ikkeFordelt
      : null;
  return {
    linjer: [
      { tekst: 'Overført resultat', beloeb: overfoert },
      { tekst: 'Foreslået udbytte', beloeb: udbytte },
    ],
    rest,
    stemmer: fejl === null,
    fejl,
  };
}

export function erKapitalejerlaan(form: Selskabsform, mellemregningEjer: number | null): boolean {
  return erSelskab(form) && mellemregningEjer !== null && mellemregningEjer > 0;
}

export type KontrolLinje = { navn: string; ok: boolean; tekst: string };

export function kontrollerAar(input: {
  form: Selskabsform;
  saldoSum: number;
  saldobalanceGodkendt: boolean;
  disponeringRest: number;
  momsStemmer: boolean;
  bankLukket: boolean;
  skatFejl: string | null;
  mellemregningEjer: number | null;
  afklaringLaan?: string;
  afklaring?: string;
  varelagerFindes: boolean;
  varelagerBekaertet: boolean;
  valutaFindes: boolean;
  valutaKursSat: boolean;
  sambeskatning: boolean;
  haeftelsesnoteMed: boolean;
  anlaegFindes?: boolean;
  afskrivningStemmer?: boolean;
  balanceForskel?: number;
  manglendeNoter?: string[];
  udbytte?: number;
  regnskabsaarFejl?: string[];
  kontiUdenLinje?: string[];
}): { linjer: KontrolLinje[]; kanLaase: boolean } {
  const selskab = erSelskab(input.form);
  const linjer: KontrolLinje[] = [];
  if (input.regnskabsaarFejl !== undefined) {
    const ok = input.regnskabsaarFejl.length === 0;
    linjer.push({ navn: 'Regnskabsår', ok, tekst: ok ? 'Regnskabsåret er gyldigt.' : input.regnskabsaarFejl.join(' ') });
  }
  linjer.push(saldobalanceLinje(input.saldoSum, input.saldobalanceGodkendt));
  if (input.kontiUdenLinje !== undefined) {
    const ok = input.kontiUdenLinje.length === 0;
    linjer.push({ navn: 'Konti', ok, tekst: ok ? 'Alle konti med saldo indgår i en linje i årsrapporten.' : `Disse konti indgår ikke i årsrapporten: ${input.kontiUdenLinje.join(', ')}.` });
  }
  if (input.balanceForskel !== undefined) {
    const ok = input.balanceForskel === 0;
    linjer.push({ navn: 'Balance', ok, tekst: ok ? 'Aktiver er lig med passiver.' : 'Aktiver er ikke lig med passiver.' });
  }
  linjer.push(
    disponeringLinje(input.disponeringRest, input.udbytte),
    { navn: 'Moms', ok: input.momsStemmer, tekst: input.momsStemmer ? 'Momsangivelsen og momskontoen er det samme tal.' : 'Momsangivelsen og momskontoen afviger.' },
    { navn: 'Bank', ok: input.bankLukket, tekst: input.bankLukket ? 'Bankmånederne er lukket.' : 'En bankmåned er ikke lukket.' },
  );
  if (selskab) {
    linjer.push({ navn: 'Skat', ok: input.skatFejl === null, tekst: input.skatFejl ?? 'Skatten er beregnet. Den kan ikke tastes.' });
  }
  if (input.manglendeNoter !== undefined) {
    const ok = input.manglendeNoter.length === 0;
    linjer.push({ navn: 'Noter', ok, tekst: ok ? 'De pligtige noter er med.' : `Disse pligtige noter mangler: ${input.manglendeNoter.join(', ')}.` });
  }
  if (erKapitalejerlaan(input.form, input.mellemregningEjer)) {
    const skrevet = (input.afklaring ?? input.afklaringLaan ?? '').trim().length > 0;
    linjer.push({
      navn: 'Mellemregning med ejer',
      ok: skrevet,
      tekst: skrevet ? 'Mellemregning med ejer har debetsaldo. Afklaringen er skrevet.' : 'Mellemregning med ejer har debetsaldo. Det er et ulovligt kapitalejerlån. Året låser ikke, før en afklaring er skrevet.',
    });
  }
  if (input.varelagerFindes) {
    linjer.push({ navn: 'Varelager', ok: input.varelagerBekaertet, tekst: input.varelagerBekaertet ? 'Varelageret er bekræftet.' : 'Varelageret er ikke bekræftet ud fra optællingen.' });
  }
  if (input.valutaFindes) {
    linjer.push({ navn: 'Valuta', ok: input.valutaKursSat, tekst: input.valutaKursSat ? 'Fremmed valuta er reguleret til lukkekursen.' : 'En konto i fremmed valuta mangler lukkekurs på balancedagen.' });
  }
  if (input.sambeskatning && !selskab) {
    linjer.push({ navn: 'Sambeskatning', ok: false, tekst: 'En personligt ejet virksomhed kan ikke indgå i sambeskatning.' });
  } else if (input.sambeskatning) {
    linjer.push({ navn: 'Hæftelse', ok: input.haeftelsesnoteMed, tekst: input.haeftelsesnoteMed ? 'Hæftelsesnoten er med.' : 'Hæftelsesnoten mangler i begge selskaber.' });
  }
  if (input.anlaegFindes === true) {
    const stemmer = input.afskrivningStemmer === true;
    linjer.push({
      navn: 'Anlæg',
      ok: stemmer,
      tekst: stemmer
        ? 'Afskrivningen er lig med kartotekets kørsel.'
        : input.afskrivningStemmer === false
          ? 'Afskrivningen i resultatet er ikke lig med kartoteket.'
          : 'Afskrivningen er ikke sammenlignet med kartoteket.',
    });
  }
  return { linjer, kanLaase: linjer.every((linje) => linje.ok) };
}

function saldobalanceLinje(saldoSum: number, godkendt: boolean): KontrolLinje {
  if (saldoSum !== 0) return { navn: 'Saldobalance', ok: false, tekst: 'Saldobalancen stemmer ikke. Ingen konti er fjernet.' };
  if (!godkendt) return { navn: 'Saldobalance', ok: false, tekst: 'Saldobalancen går op, men den er ikke godkendt.' };
  return { navn: 'Saldobalance', ok: true, tekst: 'Saldobalancen stemmer og er godkendt.' };
}

function disponeringLinje(rest: number, udbytte: number | undefined): KontrolLinje {
  if (udbytte !== undefined && udbytte < 0) return { navn: 'Disponering', ok: false, tekst: DISPONERING_FEJL.negativtUdbytte };
  if (rest !== 0) return { navn: 'Disponering', ok: false, tekst: DISPONERING_FEJL.ikkeFordelt };
  return { navn: 'Disponering', ok: true, tekst: 'Årets resultat er fordelt.' };
}

export function postFindes(poster: Poster[], rolle: PosterRolle): boolean {
  return poster.some((post) => post.rolle === rolle && post.beloeb !== 0);
}

export function kursregulering(enheder: number, bogfoertKursOere: number, lukkekursOere: number): number {
  return enheder * (lukkekursOere - bogfoertKursOere);
}

export type Kurs = { enheder: number; bogfoertKursOere: number; lukkekursOere: number | null };

export type Kurspostering = { kontonummer: string; tekst: 'Kursgevinst' | 'Kurstab'; beloeb: number };

export function valutareguleringer(poster: Poster[], kurser: Record<string, Kurs>): { posteringer: Kurspostering[]; mangler: string[] } {
  const posteringer: Kurspostering[] = [];
  const mangler: string[] = [];
  for (const post of poster.filter((kandidat) => kandidat.rolle === 'valuta' && kandidat.beloeb !== 0)) {
    const kurs = kurser[post.kontonummer];
    if (!kurs || kurs.lukkekursOere === null) {
      mangler.push(post.kontonummer);
      continue;
    }
    const regulering = kursregulering(kurs.enheder, kurs.bogfoertKursOere, kurs.lukkekursOere);
    if (regulering !== 0) {
      posteringer.push({ kontonummer: post.kontonummer, tekst: regulering > 0 ? 'Kursgevinst' : 'Kurstab', beloeb: Math.abs(regulering) });
    }
  }
  return { posteringer, mangler };
}

export function lagerdifference(bogfoert: number, optalt: number): number {
  return optalt - bogfoert;
}

export function lagerregulering(bogfoert: number, optalt: number): { rolle: 'varelager' | 'vareforbrug'; beloeb: number }[] {
  const difference = lagerdifference(bogfoert, optalt);
  if (difference === 0) return [];
  return [
    { rolle: 'varelager', beloeb: difference },
    { rolle: 'vareforbrug', beloeb: -difference },
  ];
}

export const KLASSE_B_GRAENSER: Klassetal = {
  balancesum: 55_000_000_00,
  nettoomsaetning: 111_000_000_00,
  ansatte: 50,
};

export function regnskabsklasse(tal: Klassetal): { klasse: 'B' | 'C'; kanBrugeKlasseB: boolean; overskredet: string[] } {
  const overskredet: string[] = [];
  if (tal.balancesum > KLASSE_B_GRAENSER.balancesum) overskredet.push('Balancesum');
  if (tal.nettoomsaetning > KLASSE_B_GRAENSER.nettoomsaetning) overskredet.push('Nettoomsætning');
  if (tal.ansatte > KLASSE_B_GRAENSER.ansatte) overskredet.push('Ansatte');
  const kanBrugeKlasseB = overskredet.length < 2;
  return { klasse: kanBrugeKlasseB ? 'B' : 'C', kanBrugeKlasseB, overskredet };
}

export function kanSende(godkendt: boolean): boolean {
  return godkendt === true;
}

export function medtagLedelsespateegning(antalLedelsesmedlemmer: number): boolean {
  return antalLedelsesmedlemmer > 1;
}

function medSidsteAar(linjer: RapportLinje[], forrige: RapportLinje[] | undefined): RapportLinje[] {
  if (!forrige) return linjer;
  const tekster = new Set(linjer.map((linje) => linje.tekst));
  return [
    ...linjer.map((linje) => ({ ...linje, sidsteAar: forrige.find((gammel) => gammel.tekst === linje.tekst)?.beloeb ?? 0 })),
    ...forrige.filter((gammel) => !tekster.has(gammel.tekst)).map((gammel) => ({ tekst: gammel.tekst, beloeb: 0, konti: [], sidsteAar: gammel.beloeb })),
  ];
}

function skub(linjer: RapportLinje[], linje: RapportLinje) {
  if (linje.beloeb !== 0) linjer.push(linje);
}
