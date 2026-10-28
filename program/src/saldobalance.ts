import type { BilagPost } from './bilag';
import type { LaastPeriode } from './laas';
import {
  dagenFoer,
  erForLang,
  erIsoDato,
  formatDato,
  formatKroner,
  kalenderMaaneder,
  parseDato,
  parseDanskBeloeb,
} from './penge';

export type Regnskabsaar = {
  stiftet: string;
  fra: string;
  til: string;
  foersteAar: boolean;
};

export type KontoLinje = {
  kontonummer: string;
  navn: string;
  primo: number | null;
  periode: number | null;
  ultimo: number | null;
  beloeb: number | null;
  nulstillet: boolean;
  kildelinje: number;
};

export type FilPeriode = {
  fra: string;
  til: string;
};

export type ImportResultat = {
  linjer: KontoLinje[];
  filPeriode: FilPeriode | null;
  status: 'klar' | 'blokeret';
  aarsager: string[];
  noter: string[];
  sum: number | null;
  sprangOver: number;
};

type CelleBeloeb = {
  beloeb: number | null;
  tom: boolean;
  raa: string;
};

type KolonneNoegle = 'konto' | 'navn' | 'saldo' | 'debet' | 'kredit' | 'primo' | 'periode' | 'ultimo';

const ALIAS: Record<KolonneNoegle, string[]> = {
  konto: ['konto', 'kontonr', 'kontonummer', 'account', 'nr'],
  navn: ['navn', 'kontonavn', 'tekst', 'beskrivelse', 'name'],
  saldo: ['saldo', 'beloeb', 'balance'],
  debet: ['debet', 'debit'],
  kredit: ['kredit', 'credit'],
  primo: ['primo', 'primosaldo', 'opening'],
  periode: ['periode', 'bevaegelse', 'periodens bevaegelser', 'movement'],
  ultimo: ['ultimo', 'ultimosaldo', 'closing', 'ultimo saldo'],
};

export type KontoSaldo = {
  konto: string;
  beloeb: number;
};

export function saldobalanceFraBilag(poster: BilagPost[], _laaste: LaastPeriode[] = []): KontoSaldo[] {
  const sum = new Map<string, number>();
  for (const post of poster) {
    sum.set(post.konto, (sum.get(post.konto) ?? 0) + post.beloeb);
  }
  return [...sum.entries()]
    .map(([konto, beloeb]) => ({ konto, beloeb }))
    .sort((a, b) => a.konto.localeCompare(b.konto, 'da'));
}

export function sumSaldo(saldi: KontoSaldo[]): number {
  return saldi.reduce((acc, linje) => acc + linje.beloeb, 0);
}

export function primoStemmer(foersteAar: boolean, primo: number, sidsteUltimo: number): boolean {
  if (foersteAar) return true;
  return primo === sidsteUltimo;
}

export function kontrollerRegnskabsaar(aar: Regnskabsaar): string[] {
  if (!erIsoDato(aar.stiftet) || !erIsoDato(aar.fra) || !erIsoDato(aar.til)) {
    return ['Udfyld stiftelsesdato og regnskabsårets fra- og tildato.'];
  }
  if (aar.fra > aar.til) return ['Regnskabsåret slutter før det starter.'];

  const fejl: string[] = [];
  if (aar.foersteAar && aar.fra !== aar.stiftet) {
    fejl.push('Første regnskabsår starter den dag selskabet er stiftet.');
  }
  if (!aar.foersteAar && aar.fra === aar.stiftet) {
    fejl.push('Regnskabsåret starter på stiftelsesdagen. Markér det som første år.');
  }
  if (erForLang(aar.fra, aar.til, aar.foersteAar ? 18 : 12)) {
    fejl.push(
      aar.foersteAar
        ? 'Første regnskabsår kan højst vare 18 måneder.'
        : 'Et senere regnskabsår kan højst vare 12 måneder. Et længere udtræk skærer de første måneder fra, og så stemmer tallene ikke.',
    );
  }
  return fejl;
}

export function indlaesSaldobalance(tekst: string, aar: Regnskabsaar): ImportResultat {
  const aarsager = kontrollerRegnskabsaar(aar);
  const raekker = parseCsv(tekst.replace(/^\uFEFF/, ''));
  const headerIndex = raekker.findIndex((raekke) => raekke.some((celle) => ALIAS.konto.includes(normaliser(celle))));

  if (headerIndex < 0) {
    return tomt(aarsager.concat('Filen har ingen kolonne med kontonummer.'), null, 0);
  }

  const kolonner = laesKolonner(raekker[headerIndex]);
  if (kolonner.konto === undefined) {
    return tomt(aarsager.concat('Filen har ingen kolonne med kontonummer.'), null, 0);
  }
  const kontoKolonne = kolonner.konto;
  const filPeriode = findPeriode(raekker.slice(0, headerIndex));
  if (!filPeriode) {
    aarsager.push('Filen angiver ikke sin periode. Uden periode kan et for kort udtræk ikke afvises, og tallene bliver ikke godkendt.');
  } else if (erIsoDato(aar.fra) && erIsoDato(aar.til) && aar.fra <= aar.til) {
    const periodeFejl = sammenlignPeriode(filPeriode, aar);
    if (periodeFejl) aarsager.push(periodeFejl);
  }

  const linjer: KontoLinje[] = [];
  let sprangOver = 0;
  const noter: string[] = [];

  raekker.slice(headerIndex + 1).forEach((raekke, indeks) => {
    const kildelinje = headerIndex + indeks + 2;
    const kontonummer = (raekke[kontoKolonne] ?? '').trim();
    const navn = (kolonner.navn === undefined ? '' : raekke[kolonner.navn] ?? '').trim();
    if (!kontonummer) {
      if (/^(i alt|ialt|sum|total|saldobalance)\b/i.test(navn)) sprangOver += 1;
      return;
    }

    const primo = laesCelle(raekke, kolonner.primo);
    const periode = laesCelle(raekke, kolonner.periode);
    const ultimo = laesCelle(raekke, kolonner.ultimo);
    const saldo = laesCelle(raekke, kolonner.saldo);
    const debet = laesCelle(raekke, kolonner.debet);
    const kredit = laesCelle(raekke, kolonner.kredit);
    const ulovlig = [primo, periode, ultimo, saldo, debet, kredit].find((celle) => celle !== null && !celle.tom && celle.beloeb === null);
    if (ulovlig) {
      aarsager.push(`Konto ${kontonummer} har beløbet "${ulovlig.raa}", som ikke kan læses. Linjen er beholdt.`);
    }

    const valgt = vaelgBeloeb(primo, periode, ultimo, saldo, debet, kredit);
    if (valgt.uoverensstemmelse) {
      aarsager.push(`Konto ${kontonummer} har primo plus periode, som ikke er lig ultimo. Linjen er beholdt.`);
    }
    if (valgt.nulstillet && valgt.beloeb !== null) {
      aarsager.push(
        `Konto ${kontonummer} er nulstillet. Ultimo er 0, mens primo plus periode er ${formatKroner(valgt.beloeb)} kr. Linjen er beholdt, men årets tal godkendes ikke ud fra en nulstillet konto.`,
      );
    }

    linjer.push({
      kontonummer,
      navn,
      primo: primo?.beloeb ?? null,
      periode: periode?.beloeb ?? null,
      ultimo: ultimo?.beloeb ?? null,
      beloeb: valgt.beloeb,
      nulstillet: valgt.nulstillet,
      kildelinje,
    });
  });

  if (sprangOver > 0) {
    noter.push(sprangOver === 1 ? 'Sumlinjen er udeladt, så beløbet ikke tæller med to gange.' : `${sprangOver} sumlinjer er udeladt, så beløbet ikke tæller med to gange.`);
  }

  const set = new Set<string>();
  const dubletter = new Set<string>();
  for (const linje of linjer) {
    if (set.has(linje.kontonummer)) dubletter.add(linje.kontonummer);
    set.add(linje.kontonummer);
  }
  if (dubletter.size > 0) {
    aarsager.push(`Konto ${[...dubletter].join(', ')} står mere end én gang. Linjerne er ikke slået sammen.`);
  }

  const manglerBeloeb = linjer.some((linje) => linje.beloeb === null);
  const sum = manglerBeloeb ? null : linjer.reduce((acc, linje) => acc + (linje.beloeb ?? 0), 0);
  if (sum !== null && sum !== 0) {
    aarsager.push(`Saldobalancen stemmer ikke. Differencen er ${formatKroner(sum)} kr. Ingen konti er fjernet for at få den til at gå op.`);
  }

  const unikke = [...new Set(aarsager)];
  return {
    linjer,
    filPeriode,
    status: unikke.length === 0 ? 'klar' : 'blokeret',
    aarsager: unikke,
    noter,
    sum,
    sprangOver,
  };
}

function tomt(aarsager: string[], filPeriode: FilPeriode | null, sprangOver: number): ImportResultat {
  return {
    linjer: [],
    filPeriode,
    status: 'blokeret',
    aarsager,
    noter: [],
    sum: null,
    sprangOver,
  };
}

function sammenlignPeriode(fil: FilPeriode, aar: Regnskabsaar): string | null {
  if (fil.fra === aar.fra && fil.til === aar.til) return null;
  const dele: string[] = [];
  if (fil.fra > aar.fra) dele.push(`Fra ${formatDato(aar.fra)} til ${formatDato(dagenFoer(fil.fra))} mangler foran i filen`);
  if (fil.til < aar.til) dele.push(`Fra ${formatDato(dagenEfter(fil.til))} til ${formatDato(aar.til)} mangler bagefter i filen`);
  if (fil.fra < aar.fra) dele.push(`Filen starter allerede ${formatDato(fil.fra)}, før regnskabsåret`);
  if (fil.til > aar.til) dele.push(`Filen slutter først ${formatDato(fil.til)}, efter regnskabsåret`);
  const spand = kalenderMaaneder(aar.fra, aar.til);
  return `Filens periode er ${formatDato(fil.fra)}–${formatDato(fil.til)}. Regnskabsåret er ${formatDato(aar.fra)}–${formatDato(aar.til)} (${spand} kalendermåneder). ${dele.join('. ')}. Tallene bliver ikke godkendt, for så kommer de rigtige tal ikke med. Eksporter saldobalancen for hele regnskabsåret.`;
}

function dagenEfter(iso: string): string {
  const [aar, maaned, dag] = iso.split('-').map(Number);
  const dato = new Date(Date.UTC(aar, maaned - 1, dag));
  dato.setUTCDate(dato.getUTCDate() + 1);
  return dato.toISOString().slice(0, 10);
}

function vaelgBeloeb(
  primo: CelleBeloeb | null,
  periode: CelleBeloeb | null,
  ultimo: CelleBeloeb | null,
  saldo: CelleBeloeb | null,
  debet: CelleBeloeb | null,
  kredit: CelleBeloeb | null,
): { beloeb: number | null; nulstillet: boolean; uoverensstemmelse: boolean } {
  if ((debet && !debet.tom) || (kredit && !kredit.tom)) {
    if ((debet && debet.beloeb === null && !debet.tom) || (kredit && kredit.beloeb === null && !kredit.tom)) {
      return { beloeb: null, nulstillet: false, uoverensstemmelse: false };
    }
    return { beloeb: (debet?.beloeb ?? 0) - (kredit?.beloeb ?? 0), nulstillet: false, uoverensstemmelse: false };
  }

  const p = primo && !primo.tom ? primo.beloeb : null;
  const pe = periode && !periode.tom ? periode.beloeb : null;
  const u = ultimo && !ultimo.tom ? ultimo.beloeb : null;
  if (p !== null || pe !== null || u !== null) {
    if ((primo && primo.beloeb === null && !primo.tom) || (periode && periode.beloeb === null && !periode.tom) || (ultimo && ultimo.beloeb === null && !ultimo.tom)) {
      return { beloeb: null, nulstillet: false, uoverensstemmelse: false };
    }
    if (p !== null && pe !== null) {
      const sum = p + pe;
      if (u === null || u === sum) return { beloeb: sum, nulstillet: false, uoverensstemmelse: false };
      if (u === 0) return { beloeb: sum, nulstillet: true, uoverensstemmelse: false };
      return { beloeb: null, nulstillet: false, uoverensstemmelse: true };
    }
    return { beloeb: u ?? pe ?? p, nulstillet: false, uoverensstemmelse: false };
  }

  if (saldo && saldo.beloeb === null && !saldo.tom) return { beloeb: null, nulstillet: false, uoverensstemmelse: false };
  return { beloeb: saldo?.beloeb ?? null, nulstillet: false, uoverensstemmelse: false };
}

function laesCelle(raekke: string[], indeks: number | undefined): CelleBeloeb | null {
  if (indeks === undefined) return null;
  const raa = (raekke[indeks] ?? '').trim();
  if (!raa || raa === '-' || raa === '–' || raa === '—') return { beloeb: null, tom: true, raa };
  const beloeb = parseDanskBeloeb(raa);
  return { beloeb, tom: false, raa };
}

function laesKolonner(header: string[]): Partial<Record<KolonneNoegle, number>> {
  const kolonner: Partial<Record<KolonneNoegle, number>> = {};
  header.forEach((celle, indeks) => {
    const noegle = normaliser(celle);
    (Object.keys(ALIAS) as KolonneNoegle[]).forEach((kolonne) => {
      if (ALIAS[kolonne].includes(noegle) && kolonner[kolonne] === undefined) kolonner[kolonne] = indeks;
    });
  });
  return kolonner;
}

function findPeriode(raekker: string[][]): FilPeriode | null {
  for (const raekke of raekker) {
    const datoer = raekke.flatMap((celle) => [...celle.matchAll(/\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}[./-]\d{4}/g)].map((match) => parseDato(match[0]))).filter((dato): dato is string => dato !== null);
    if (datoer.length >= 2) return { fra: datoer[0], til: datoer[1] };
  }
  return null;
}

function normaliser(vaerdi: string): string {
  return vaerdi
    .trim()
    .toLowerCase()
    .replaceAll('æ', 'ae')
    .replaceAll('ø', 'oe')
    .replaceAll('å', 'aa')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseCsv(tekst: string): string[][] {
  const skilletegn = vaelgSkilletegn(tekst);
  const raekker: string[][] = [];
  let raekke: string[] = [];
  let celle = '';
  let iCitation = false;

  for (let i = 0; i < tekst.length; i += 1) {
    const tegn = tekst[i];
    if (iCitation) {
      if (tegn === '"') {
        if (tekst[i + 1] === '"') {
          celle += '"';
          i += 1;
        } else {
          iCitation = false;
        }
      } else {
        celle += tegn;
      }
      continue;
    }
    if (tegn === '"') {
      iCitation = true;
    } else if (tegn === skilletegn) {
      raekke.push(celle);
      celle = '';
    } else if (tegn === '\n') {
      raekke.push(celle);
      raekker.push(raekke);
      raekke = [];
      celle = '';
    } else if (tegn !== '\r') {
      celle += tegn;
    }
  }
  if (celle.length > 0 || raekke.length > 0) {
    raekke.push(celle);
    raekker.push(raekke);
  }
  return raekker.filter((kandidat) => kandidat.some((felt) => felt.trim() !== ''));
}

function vaelgSkilletegn(tekst: string): string {
  const tael = { ';': 0, ',': 0, '\t': 0 };
  let iCitation = false;
  for (let i = 0; i < tekst.length; i += 1) {
    const tegn = tekst[i];
    if (tegn === '"') {
      if (iCitation && tekst[i + 1] === '"') i += 1;
      else iCitation = !iCitation;
      continue;
    }
    if (iCitation) continue;
    if (tegn === ',' && /\d/.test(tekst[i - 1] ?? '') && /\d/.test(tekst[i + 1] ?? '')) continue;
    if (tegn === ';' || tegn === ',' || tegn === '\t') tael[tegn] += 1;
  }
  if (tael[';'] >= tael[','] && tael[';'] >= tael['\t'] && tael[';'] > 0) return ';';
  if (tael['\t'] >= tael[','] && tael['\t'] > 0) return '\t';
  return ',';
}
