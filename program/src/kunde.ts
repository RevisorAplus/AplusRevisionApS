import { formatKroner } from './penge';

export type KundeKilde = 'dinero' | 'billy' | 'economic' | 'excel' | 'saft';

export const KILDER: readonly KundeKilde[] = ['dinero', 'billy', 'economic', 'excel', 'saft'];

export type Kunde = {
  navn: string;
  /** Aftalt pris i øre pr. måned. Tom, til den er skrevet. */
  pris: number | null;
  omfang: string;
  kilde: KundeKilde;
  klasse: 'B' | 'C';
  foersteAar: boolean;
  /** Tom streng, når kunden ikke indgår i en sambeskatningskreds. */
  sambeskatningskreds: string;
  /** Højst antal bilag pr. måned i 895-kroners pakken. Skrives af et menneske. */
  bilagsloft: number | null;
  aftaleGemt: boolean;
  aftaletekst?: string;
  medarbejderId: string;
};

export type Frist = { kunde: string; tekst: string; dato: string };

export type Opkraevningslinje = { tekst: string; beloeb: number };

export const BOGFOERING_PRIS = 895_00;
export const AARSRAPPORT_B_PRIS = 4_995_00;
export const TIMEPRIS = 495_00;

export function nyKunde(medarbejderId: string): Kunde {
  return {
    navn: '',
    pris: null,
    omfang: '',
    kilde: 'dinero',
    klasse: 'B',
    foersteAar: false,
    sambeskatningskreds: '',
    bilagsloft: null,
    aftaleGemt: false,
    medarbejderId,
  };
}

export function kanStarte(kunde: Kunde): boolean {
  const harPris = kunde.pris !== null && Number.isFinite(kunde.pris) && kunde.pris > 0;
  const harOmfang = kunde.omfang.trim().length > 0;
  return harPris && harOmfang && kunde.aftaleGemt === true;
}

export function mangler(kunde: Kunde): string[] {
  const liste: string[] = [];
  if (!(kunde.pris !== null && Number.isFinite(kunde.pris) && kunde.pris > 0)) liste.push('Prisen er ikke skrevet.');
  if (kunde.omfang.trim().length === 0) liste.push('Omfanget er ikke skrevet.');
  if (!kunde.aftaleGemt) liste.push('Aftalen er ikke gemt.');
  return liste;
}

export function opkraevning(input: { maaned: boolean | string; aarsrapport: boolean; timer: number }): {
  linjer: Opkraevningslinje[];
  sum: number;
} {
  const linjer: Opkraevningslinje[] = [];
  const medMaaned = input.maaned !== false && input.maaned !== '';
  if (medMaaned) {
    const navn = typeof input.maaned === 'string' ? ` ${input.maaned}` : '';
    linjer.push({ tekst: `Bogføring pr. måned${navn}`, beloeb: BOGFOERING_PRIS });
  }
  if (input.aarsrapport) {
    linjer.push({ tekst: 'Årsrapport klasse B', beloeb: AARSRAPPORT_B_PRIS });
  }
  const timer = Number.isFinite(input.timer) && input.timer > 0 ? input.timer : 0;
  if (timer > 0) {
    linjer.push({ tekst: `Tid ud over pakken: ${timer} timer à ${formatKroner(TIMEPRIS)} kr.`, beloeb: Math.round(timer * TIMEPRIS) });
  }
  return { linjer, sum: linjer.reduce((acc, linje) => acc + linje.beloeb, 0) };
}

export function naeste30<T extends Frist>(iDagIso: string, frister: T[]): T[] {
  const slut = laegDageTil(iDagIso, 30);
  return frister
    .filter((frist) => frist.dato >= iDagIso && frist.dato <= slut)
    .sort((a, b) => (a.dato < b.dato ? -1 : a.dato > b.dato ? 1 : 0));
}

export function kunderFor<T extends { medarbejderId: string }>(alle: T[], medarbejderId: string): T[] {
  return alle.filter((kunde) => kunde.medarbejderId === medarbejderId);
}

export function aftalebrev(kunde: Kunde): string {
  const pris = kunde.pris !== null && kunde.pris > 0 ? `${formatKroner(kunde.pris)} kr. om måneden` : 'den pris, der er skrevet på kundekortet';
  const loft = kunde.bilagsloft !== null && kunde.bilagsloft > 0
    ? `Pakken rummer op til ${kunde.bilagsloft} bilag om måneden.`
    : 'Antallet af bilag i pakken er ikke fastsat endnu.';
  return [
    `Aftale med ${kunde.navn.trim() || 'kunden'}.`,
    `Vi hjælper med bogføring og regnskabsopstilling efter dette omfang: ${kunde.omfang.trim() || 'ikke skrevet endnu'}.`,
    `Prisen er ${pris}. ${loft}`,
    `Tid ud over pakken regnes til ${formatKroner(TIMEPRIS)} kr. i timen, og vi aftaler den med dig først.`,
    'Aftalen omfatter kun det, der står her. Alt andet er ikke aftalt.',
  ].join('\n');
}

function laegDageTil(iso: string, dage: number): string {
  const [aar, maaned, dag] = iso.split('-').map(Number);
  const dato = new Date(Date.UTC(aar, maaned - 1, dag));
  dato.setUTCDate(dato.getUTCDate() + dage);
  return dato.toISOString().slice(0, 10);
}
