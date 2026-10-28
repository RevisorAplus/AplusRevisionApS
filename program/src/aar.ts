import { beregnSkat, HAEFTELSESTEKST, type SkatGrundlag, type SkatResultat, type Selskabsform } from './skat';

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
  | 'mellemregning-ejer'
  | 'gaeld'
  | 'moms'
  | 'valuta';

export type Poster = {
  kontonummer: string;
  navn: string;
  beloeb: number;
  rolle: PosterRolle;
};

export type RapportLinje = { tekst: string; beloeb: number };

export type Rapport = {
  sammenligning: boolean;
  resultat: RapportLinje[];
  balanceAktiver: RapportLinje[];
  egenkapital: RapportLinje[];
  gaeld: RapportLinje[];
  noter: string[];
  skat: SkatResultat;
};

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
}): Rapport {
  const sum = (rolle: PosterRolle) => input.poster.filter((post) => post.rolle === rolle).reduce((acc, post) => acc + post.beloeb, 0);
  const resultatFoerSkat = -RESULTAT_ROLLER.reduce((acc, rolle) => acc + sum(rolle), 0);
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
  const resultat: RapportLinje[] = [];
  const omsaetning = -sum('omsaetning');
  const vareforbrug = sum('vareforbrug');
  if (input.klasseB) resultat.push({ tekst: 'Bruttofortjeneste', beloeb: omsaetning - vareforbrug });
  else {
    if (omsaetning !== 0) resultat.push({ tekst: 'Nettoomsætning', beloeb: omsaetning });
    if (vareforbrug !== 0) resultat.push({ tekst: 'Vareforbrug', beloeb: vareforbrug });
  }
  skub(resultat, 'Personaleomkostninger', sum('personale'));
  skub(resultat, 'Afskrivninger', sum('regnskabsafskrivning'));
  skub(resultat, 'Andre omkostninger', sum('andre-omkostninger') + sum('ikke-fradrag') + sum('stiftelse') + sum('skattekonto-rente'));
  skub(resultat, 'Finansielle poster', -sum('finans'));
  resultat.push({ tekst: 'Resultat før skat', beloeb: resultatFoerSkat });
  if (input.form === 'aps' && skat.fejl === null) {
    resultat.push({ tekst: input.sambeskatning && !input.administrationsselskab ? 'Bidrag til administrationsselskabet' : 'Skat af årets resultat', beloeb: skat.aktuelSkat });
    resultat.push({ tekst: 'Årets resultat', beloeb: skat.resultatEfterSkat });
  }

  const aktiver: RapportLinje[] = [];
  skub(aktiver, 'Anlægsaktiver', sum('anlaeg'));
  skub(aktiver, 'Varelager', sum('varelager'));
  skub(aktiver, 'Tilgodehavender', sum('tilgodehavende'));
  if (sum('mellemregning-ejer') > 0) skub(aktiver, 'Mellemregning med ejer', sum('mellemregning-ejer'));
  skub(aktiver, 'Bank', sum('bank'));
  const egenkapital: RapportLinje[] = [];
  skub(egenkapital, 'Selskabskapital', -sum('egenkapital'));
  skub(egenkapital, 'Overført resultat', input.overfoert);
  skub(egenkapital, 'Foreslået udbytte', input.udbytte);
  const gaeld: RapportLinje[] = [];
  if (skat.balanceTekst && skat.aktuelSkat !== 0) skub(gaeld, skat.balanceTekst, skat.aktuelSkat);
  if (skat.udskudtSkat) skub(gaeld, 'Udskudt skat', skat.udskudtSkat);
  skub(gaeld, 'Anden gæld', -sum('gaeld'));
  if (sum('mellemregning-ejer') < 0) skub(gaeld, 'Mellemregning med ejer', -sum('mellemregning-ejer'));

  const noter: string[] = [];
  if (sum('personale') !== 0) noter.push('Personaleomkostninger');
  if (input.sambeskatning) noter.push(HAEFTELSESTEKST);

  return {
    sammenligning: !input.foersteAar && input.harSidsteAar,
    resultat,
    balanceAktiver: aktiver,
    egenkapital,
    gaeld,
    noter,
    skat,
  };
}

export function disponeringRest(resultat: number, overfoert: number, udbytte: number): number {
  return resultat - overfoert - udbytte;
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
  afklaringLaan: string;
  varelagerFindes: boolean;
  varelagerBekaertet: boolean;
  valutaFindes: boolean;
  valutaKursSat: boolean;
  sambeskatning: boolean;
  haeftelsesnoteMed: boolean;
  anlaegFindes?: boolean;
  afskrivningStemmer?: boolean;
}): { linjer: KontrolLinje[]; kanLaase: boolean } {
  const linjer: KontrolLinje[] = [
    { navn: 'Saldobalance', ok: input.saldobalanceGodkendt && input.saldoSum === 0, tekst: input.saldoSum === 0 ? 'Saldobalancen stemmer.' : 'Saldobalancen stemmer ikke. Ingen konti er fjernet.' },
    { navn: 'Disponering', ok: input.disponeringRest === 0, tekst: input.disponeringRest === 0 ? 'Årets resultat er fordelt.' : 'Årets resultat er ikke fordelt på overført resultat og foreslået udbytte.' },
    { navn: 'Moms', ok: input.momsStemmer, tekst: input.momsStemmer ? 'Momsangivelsen og momskontoen er det samme tal.' : 'Momsangivelsen og momskontoen afviger.' },
    { navn: 'Bank', ok: input.bankLukket, tekst: input.bankLukket ? 'Bankmånederne er lukket.' : 'En bankmåned er ikke lukket.' },
  ];
  if (input.form === 'aps') {
    linjer.push({ navn: 'Skat', ok: input.skatFejl === null, tekst: input.skatFejl ?? 'Skatten er beregnet. Den kan ikke tastes.' });
  }
  if (input.form === 'aps' && input.mellemregningEjer !== null && input.mellemregningEjer > 0) {
    const skrevet = input.afklaringLaan.trim().length > 0;
    linjer.push({
      navn: 'Mellemregning med ejer',
      ok: skrevet,
      tekst: skrevet ? 'Mellemregning med ejer har debetsaldo. Afklaringen er skrevet.' : 'Mellemregning med ejer har debetsaldo. Året låser ikke, før en afklaring er skrevet.',
    });
  }
  if (input.varelagerFindes) {
    linjer.push({ navn: 'Varelager', ok: input.varelagerBekaertet, tekst: input.varelagerBekaertet ? 'Varelageret er bekræftet.' : 'Varelageret er ikke bekræftet ud fra optællingen.' });
  }
  if (input.valutaFindes) {
    linjer.push({ navn: 'Valuta', ok: input.valutaKursSat, tekst: input.valutaKursSat ? 'Fremmed valuta er reguleret til lukkekursen.' : 'En konto i fremmed valuta mangler lukkekurs på balancedagen.' });
  }
  if (input.sambeskatning) {
    linjer.push({ navn: 'Hæftelse', ok: input.haeftelsesnoteMed, tekst: input.haeftelsesnoteMed ? 'Hæftelsesnoten er med.' : 'Hæftelsesnoten mangler i begge selskaber.' });
  }
  if (input.anlaegFindes) {
    const stemmer = input.afskrivningStemmer !== false;
    linjer.push({ navn: 'Anlæg', ok: stemmer, tekst: stemmer ? 'Afskrivningen er lig med kartotekets kørsel.' : 'Afskrivningen i resultatet er ikke lig med kartoteket.' });
  }
  return { linjer, kanLaase: linjer.every((linje) => linje.ok) };
}

export function kursregulering(enheder: number, bogfoertKursOere: number, lukkekursOere: number): number {
  return enheder * (lukkekursOere - bogfoertKursOere);
}

export function lagerdifference(bogfoert: number, optalt: number): number {
  return optalt - bogfoert;
}

function skub(linjer: RapportLinje[], tekst: string, beloeb: number) {
  if (beloeb !== 0) linjer.push({ tekst, beloeb });
}
