import { parseDato, parseDanskBeloeb } from './penge';

export type Momskode = 'ingen' | 'salg25' | 'koeb25';

export type KendtLinje = {
  tekst: string;
  konto: string;
  momskode: Momskode;
};

export type Banklinje = {
  dato: string;
  tekst: string;
  beloeb: number | null;
  konto: string | null;
  momskode: Momskode | null;
  status: 'stemmer' | 'afventer';
  kildelinje: number;
  fejl: string | null;
};

export function indlaesBank(tekst: string, kendte: KendtLinje[]): Banklinje[] {
  const raekker = parseCsv(tekst.replace(/^\uFEFF/, ''));
  const header = raekker.findIndex((raekke) => raekke.some((celle) => normaliser(celle) === 'dato' || normaliser(celle) === 'tekst' || normaliser(celle) === 'beloeb'));
  const start = header < 0 ? 0 : header + 1;
  const kolonner = header < 0 ? { dato: 0, tekst: 1, beloeb: 2 } : laesKolonner(raekker[header]);

  return raekker.slice(start).flatMap((raekke, indeks) => {
    const dato = parseDato(raekke[kolonner.dato] ?? '');
    const navn = (raekke[kolonner.tekst] ?? '').trim();
    const beloeb = parseDanskBeloeb(raekke[kolonner.beloeb] ?? '');
    if (!dato && !navn && beloeb === null) return [];
    const kendt = kendte.find((kandidat) => normaliser(kandidat.tekst) === normaliser(navn));
    const laesefejl = beloeb === null || !dato;
    return [{
      dato: dato ?? '',
      tekst: navn,
      beloeb,
      konto: kendt && !laesefejl ? kendt.konto : null,
      momskode: kendt && !laesefejl ? kendt.momskode : null,
      status: kendt && !laesefejl ? 'stemmer' : 'afventer',
      kildelinje: (header < 0 ? 1 : header + 2) + indeks,
      fejl: laesefejl ? 'Dato eller beløb kan ikke læses. Linjen er beholdt.' : null,
    }];
  });
}

export function godkendLinje(linjer: Banklinje[], kildelinje: number, konto: string, momskode: Momskode): Banklinje[] {
  return linjer.map((linje) => {
    if (linje.kildelinje !== kildelinje || linje.beloeb === null || !linje.dato) return linje;
    const renset = konto.trim();
    if (!renset) return linje;
    return { ...linje, konto: renset, momskode, status: 'stemmer', fejl: null };
  });
}

export function momsAfLinje(linje: Banklinje): { salg: number; koeb: number } {
  if (linje.status !== 'stemmer' || linje.beloeb === null || !linje.momskode || linje.momskode === 'ingen') {
    return { salg: 0, koeb: 0 };
  }
  const moms = Math.sign(linje.beloeb) * Math.round(Math.abs(linje.beloeb) * 25 / 125);
  return linje.momskode === 'salg25' ? { salg: moms, koeb: 0 } : { salg: 0, koeb: -moms };
}

export function momsAngivelse(linjer: Banklinje[]): { salgsmoms: number; koebsmoms: number; afgift: number } {
  const sum = linjer.reduce((acc, linje) => {
    const moms = momsAfLinje(linje);
    return { salgsmoms: acc.salgsmoms + moms.salg, koebsmoms: acc.koebsmoms + moms.koeb };
  }, { salgsmoms: 0, koebsmoms: 0 });
  return { ...sum, afgift: sum.salgsmoms - sum.koebsmoms };
}

export function lukMaaned(linjer: Banklinje[], momskonto: number): { kanLukke: boolean; aarsager: string[] } {
  if (linjer.length === 0) {
    return { kanLukke: false, aarsager: ['Banken er ikke lagt ind. Måneden kan ikke lukkes.'] };
  }
  const aarsager: string[] = [];
  const aabne = linjer.filter((linje) => linje.status !== 'stemmer');
  if (aabne.length > 0) {
    aarsager.push(aabne.length === 1 ? '1 linje venter på godkendelse.' : `${aabne.length} linjer venter på godkendelse.`);
  }
  const angivelse = momsAngivelse(linjer);
  const forventetKonto = angivelse.koebsmoms - angivelse.salgsmoms;
  if (aabne.length === 0 && momskonto !== forventetKonto) {
    aarsager.push('Momsangivelsen og momskontoen er ikke det samme tal. Måneden kan ikke lukkes.');
  }
  return { kanLukke: aarsager.length === 0, aarsager };
}

export function proevPostering(laast: boolean): string | null {
  return laast ? 'Perioden er låst og tager ikke imod nye posteringer.' : null;
}

function laesKolonner(header: string[]): { dato: number; tekst: number; beloeb: number } {
  const find = (navne: string[], ellers: number) => {
    const indeks = header.findIndex((celle) => navne.includes(normaliser(celle)));
    return indeks < 0 ? ellers : indeks;
  };
  return {
    dato: find(['dato', 'date'], 0),
    tekst: find(['tekst', 'beskrivelse', 'text'], 1),
    beloeb: find(['beloeb', 'belob', 'amount'], 2),
  };
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
        } else iCitation = false;
      } else celle += tegn;
      continue;
    }
    if (tegn === '"') iCitation = true;
    else if (tegn === ';') {
      raekke.push(celle);
      celle = '';
    } else if (tegn === '\n') {
      raekke.push(celle);
      raekker.push(raekke);
      raekke = [];
      celle = '';
    } else if (tegn !== '\r') celle += tegn;
  }
  if (celle.length > 0 || raekke.length > 0) {
    raekke.push(celle);
    raekker.push(raekke);
  }
  return raekker.filter((kandidat) => kandidat.some((felt) => felt.trim() !== ''));
}
