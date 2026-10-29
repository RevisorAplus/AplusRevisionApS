import type { Kartotek } from './anlaeg';
import { formatKroner } from './penge';
import { erSelskab, HAEFTELSESTEKST, SELSKABSSKAT_PROCENT, type Selskabsform } from './skat';

export type NoteLinje = { tekst: string; beloeb: number };

export type Note = { titel: string; tekst: string; linjer?: NoteLinje[] };

export type NotePost = 'personale' | 'anlaeg' | 'udskudt-skat' | 'sambeskatning' | 'kapitalejerlaan' | 'egenkapital';

export const PLIGTIGE_NOTER: Record<NotePost, string> = {
  personale: 'Personaleomkostninger',
  anlaeg: 'Anlægsaktiver',
  'udskudt-skat': 'Udskudt skat',
  sambeskatning: 'Sambeskatning',
  kapitalejerlaan: 'Lån til kapitalejer',
  egenkapital: 'Egenkapital',
};

export function bygNoter(input: {
  personale: number;
  anlaegIBalancen: number | null;
  anlaegIKartotek: number | null;
  sambeskatning: boolean;
  form?: Selskabsform;
  kartotek?: Kartotek;
  udskudtSkat?: number | null;
  kapitalejerlaan?: number;
  egenkapital?: { primo: number; bevaegelser: NoteLinje[]; ultimo: number };
}): { noter: Note[]; fejl: string[] } {
  const noter: Note[] = [];
  const fejl: string[] = [];
  if (input.personale !== 0) {
    noter.push({ titel: PLIGTIGE_NOTER.personale, tekst: `Personaleomkostninger udgør ${formatKroner(input.personale)} kr.` });
  }

  const kartotekUltimo = input.kartotek ? input.kartotek.ultimo : input.anlaegIKartotek;
  const harAnlaeg = (input.kartotek?.linjer.length ?? 0) > 0 || (input.anlaegIBalancen ?? 0) !== 0 || (kartotekUltimo ?? 0) !== 0;
  if (harAnlaeg) {
    if (!anlaegsnoteStemmer(kartotekUltimo ?? 0, input.anlaegIBalancen ?? 0)) {
      fejl.push('Anlægsnotens ultimo er ikke lig med balancens anlæg.');
    } else if (input.kartotek) {
      noter.push(anlaegsnote(input.kartotek));
    } else {
      noter.push({ titel: PLIGTIGE_NOTER.anlaeg, tekst: `Ultimo i noten er lig med balancen: ${formatKroner(kartotekUltimo ?? 0)} kr.` });
    }
  }

  if (input.sambeskatning) {
    if (input.form === undefined || erSelskab(input.form)) noter.push({ titel: PLIGTIGE_NOTER.sambeskatning, tekst: HAEFTELSESTEKST });
    else fejl.push('En personligt ejet virksomhed kan ikke indgå i sambeskatning og får ingen hæftelsesnote.');
  }
  if (input.udskudtSkat !== undefined && input.udskudtSkat !== null && input.udskudtSkat !== 0) {
    noter.push({
      titel: PLIGTIGE_NOTER['udskudt-skat'],
      tekst: `Udskudt skat er ${formatKroner(input.udskudtSkat)} kr., beregnet med ${SELSKABSSKAT_PROCENT} % af forskellen mellem regnskabsmæssig og skattemæssig værdi.`,
    });
  }
  if (input.kapitalejerlaan !== undefined && input.kapitalejerlaan > 0) {
    noter.push({
      titel: PLIGTIGE_NOTER.kapitalejerlaan,
      tekst: `Selskabet har et tilgodehavende hos kapitalejeren på ${formatKroner(input.kapitalejerlaan)} kr. på mellemregningen.`,
    });
  }
  if (input.egenkapital) {
    const forklaring = egenkapitalforklaring(input.egenkapital.primo, input.egenkapital.bevaegelser, input.egenkapital.ultimo);
    if (forklaring.stemmer) noter.push({ titel: PLIGTIGE_NOTER.egenkapital, tekst: 'Primo plus årets bevægelser er lig med ultimo.', linjer: forklaring.linjer });
    else fejl.push('Egenkapitalnoten går ikke op: primo plus bevægelser er ikke lig med ultimo.');
  }
  return { noter, fejl };
}

export function manglendeNoter(poster: readonly (NotePost | string)[], noter: Note[]): string[] {
  const udfyldte = new Set(noter.filter((note) => !erTom(note)).map((note) => note.titel));
  const kraevet = [...new Set(poster)]
    .filter((post): post is NotePost => post in PLIGTIGE_NOTER)
    .map((post) => PLIGTIGE_NOTER[post]);
  return kraevet.filter((titel) => !udfyldte.has(titel));
}

export function fjernTommeNoter(noter: Note[]): Note[] {
  return noter.filter((note) => !erTom(note));
}

export function anlaegsnote(kartotek: Kartotek): Note {
  return {
    titel: PLIGTIGE_NOTER.anlaeg,
    tekst: 'Materielle anlægsaktiver afskrives lineært over brugstiden til restværdi.',
    linjer: [
      { tekst: 'Kostpris primo', beloeb: kartotek.kostprisPrimo },
      { tekst: 'Tilgang', beloeb: kartotek.tilgang },
      { tekst: 'Kostpris ultimo', beloeb: kartotek.kostprisUltimo },
      { tekst: 'Afskrivninger primo', beloeb: kartotek.afskrevetPrimo },
      { tekst: 'Årets afskrivninger', beloeb: kartotek.aaretsAfskrivning },
      { tekst: 'Afskrivninger ultimo', beloeb: kartotek.afskrevetUltimo },
      { tekst: 'Regnskabsmæssig værdi ultimo', beloeb: kartotek.ultimo },
    ],
  };
}

export function anlaegsnoteStemmer(noteUltimo: number, balanceAnlaeg: number): boolean {
  return noteUltimo === balanceAnlaeg;
}

export function egenkapitalforklaring(primo: number, bevaegelser: { tekst: string; beloeb: number }[], ultimo: number): { linjer: { tekst: string; beloeb: number }[]; stemmer: boolean } {
  const linjer = [{ tekst: 'Primo', beloeb: primo }, ...bevaegelser, { tekst: 'Ultimo', beloeb: primo + bevaegelser.reduce((sum, linje) => sum + linje.beloeb, 0) }];
  return { linjer, stemmer: linjer[linjer.length - 1].beloeb === ultimo };
}

export type Praksis = { post: string; titel: string; tekst: string };

const PRAKSIS: Praksis[] = [
  { post: 'omsaetning', titel: 'Nettoomsætning', tekst: 'Nettoomsætning indregnes ved levering til køberen og måles uden moms og med fradrag af rabatter.' },
  { post: 'vareforbrug', titel: 'Vareforbrug', tekst: 'Vareforbrug omfatter årets køb af varer reguleret for ændringen i varelageret.' },
  { post: 'personale', titel: 'Personaleomkostninger', tekst: 'Personaleomkostninger omfatter løn, pension og andre omkostninger til selskabets ansatte.' },
  { post: 'anlaeg', titel: 'Materielle anlægsaktiver', tekst: 'Materielle anlægsaktiver måles til kostpris med fradrag af akkumulerede afskrivninger. Der afskrives lineært over den forventede brugstid til den forventede restværdi.' },
  { post: 'varelager', titel: 'Varebeholdninger', tekst: 'Varebeholdninger måles til kostpris eller nettorealisationsværdi, hvis den er lavere.' },
  { post: 'tilgodehavende', titel: 'Tilgodehavender', tekst: 'Tilgodehavender måles til nominel værdi med fradrag af nedskrivning til forventet tab.' },
  { post: 'valuta', titel: 'Fremmed valuta', tekst: 'Transaktioner i fremmed valuta omregnes til transaktionsdagens kurs. Monetære poster omregnes til balancedagens kurs. Kursdifferencer indregnes under finansielle poster.' },
  { post: 'finans', titel: 'Finansielle poster', tekst: 'Finansielle poster omfatter renter og kursdifferencer, der vedrører regnskabsåret.' },
  { post: 'skat', titel: 'Skat af årets resultat', tekst: `Årets skat består af årets aktuelle skat og ændringen i udskudt skat. Skatten beregnes med ${SELSKABSSKAT_PROCENT} %.` },
  { post: 'udskudt-skat', titel: 'Udskudt skat', tekst: `Udskudt skat måles af forskellen mellem regnskabsmæssig og skattemæssig værdi med ${SELSKABSSKAT_PROCENT} %.` },
  { post: 'sambeskatning', titel: 'Sambeskatning', tekst: 'Den aktuelle selskabsskat fordeles mellem de sambeskattede selskaber ved afregning af sambeskatningsbidrag til administrationsselskabet.' },
  { post: 'udbytte', titel: 'Udbytte', tekst: 'Foreslået udbytte vises som en særskilt post under egenkapitalen, indtil det er vedtaget på generalforsamlingen.' },
  { post: 'gaeld', titel: 'Gæld', tekst: 'Gæld måles til nominel værdi.' },
];

export function praksisFor(poster: string[]): Praksis[] {
  const har = new Set(poster);
  return PRAKSIS.filter((praksis) => har.has(praksis.post)).map((praksis) => ({ ...praksis }));
}

function erTom(note: Note): boolean {
  return note.tekst.trim().length === 0 && (note.linjer?.length ?? 0) === 0;
}
