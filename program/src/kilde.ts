import { parseDato, parseDanskBeloeb } from './penge';

export type KildeNavn = 'dinero' | 'billy' | 'economic' | 'excel' | 'saft';

export type KildeLinje = {
  kilde: KildeNavn;
  bilagsnummer: string;
  dato: string;
  tekst: string;
  kildeKonto: string;
  konto: string;
  beloeb: number;
};

export type Undtagelse = {
  kilde: KildeNavn;
  bilagsnummer: string;
  kildeKonto: string;
  beloeb: number | null;
  aarsag: string;
};

export type KildeImport = {
  nye: KildeLinje[];
  undtagelser: Undtagelse[];
  sprungetOver: number;
};

export type FoersteKildeImport = {
  kontoplan: { kildeKonto: string; navn: string }[];
  aabne: KildeLinje[];
  poster: KildeLinje[];
  undtagelser: Undtagelse[];
};

type KildeRaekke = {
  felter: string[];
  kildelinje: number;
};

export function indlaesKilde(
  tekst: string,
  kilde: KildeNavn,
  mapping: { kildeKonto: string; konto: string }[],
  allerede: { kilde: KildeNavn; bilagsnummer: string }[],
): KildeImport {
  const raekker = parseCsv(tekst.replace(/^\uFEFF/, ''));
  const header = findHeader(raekker);
  if (header < 0) {
    return { nye: [], undtagelser: [{ kilde, bilagsnummer: '', kildeKonto: '', beloeb: null, aarsag: 'Filen har ingen kolonne med bilag eller konto.' }], sprungetOver: 0 };
  }
  const dataraekker = raekker.slice(header + 1).map((felter, indeks) => ({
    felter,
    kildelinje: header + indeks + 2,
  }));
  return indlaesRaekker(raekker[header], dataraekker, kilde, mapping, allerede);
}

export function indlaesFoerste(
  tekst: string,
  kilde: KildeNavn,
  mapping: { kildeKonto: string; konto: string }[],
  allerede: { kilde: KildeNavn; bilagsnummer: string }[] = [],
): FoersteKildeImport {
  const raekker = parseCsv(tekst.replace(/^\uFEFF/, ''));
  const header = findHeader(raekker);
  if (header < 0) {
    return {
      kontoplan: [],
      aabne: [],
      poster: [],
      undtagelser: [{ kilde, bilagsnummer: '', kildeKonto: '', beloeb: null, aarsag: 'Filen har ingen kolonne med bilag eller konto.' }],
    };
  }

  const artKolonne = findKolonne(raekker[header], ['art', 'type']);
  const dataraekker = raekker.slice(header + 1).map((felter, indeks) => ({
    felter,
    kildelinje: header + indeks + 2,
  }));
  if (artKolonne < 0) {
    const resultat = indlaesRaekker(raekker[header], dataraekker, kilde, mapping, allerede);
    return { kontoplan: [], aabne: [], poster: resultat.nye, undtagelser: resultat.undtagelser };
  }

  const kolonner = laesKolonner(raekker[header]);
  const navnKolonne = findKolonne(raekker[header], ['navn', 'kontonavn', 'account name']);
  const kontoplan: { kildeKonto: string; navn: string }[] = [];
  const aabneRaekker: KildeRaekke[] = [];
  const posterRaekker: KildeRaekke[] = [];

  for (const kildeRaekke of dataraekker) {
    const raekke = kildeRaekke.felter;
    const art = normaliser(raekke[artKolonne] ?? '');
    if (art === 'kontoplan' || art === 'konto' || art === 'account') {
      const kildeKonto = (raekke[kolonner.konto] ?? '').trim();
      const navn = (raekke[navnKolonne >= 0 ? navnKolonne : kolonner.tekst] ?? '').trim();
      if (kildeKonto) kontoplan.push({ kildeKonto, navn });
    } else if (art.includes('aaben') || art.includes('open')) {
      aabneRaekker.push(kildeRaekke);
    } else {
      posterRaekker.push(kildeRaekke);
    }
  }

  const aabneImport = indlaesRaekker(raekker[header], aabneRaekker, kilde, mapping, allerede);
  const posterImport = indlaesRaekker(raekker[header], posterRaekker, kilde, mapping, allerede);
  return {
    kontoplan,
    aabne: aabneImport.nye,
    poster: posterImport.nye,
    undtagelser: [...aabneImport.undtagelser, ...posterImport.undtagelser],
  };
}

function indlaesRaekker(
  header: string[],
  raekker: KildeRaekke[],
  kilde: KildeNavn,
  mapping: { kildeKonto: string; konto: string }[],
  allerede: { kilde: KildeNavn; bilagsnummer: string }[],
): KildeImport {
  const kolonner = laesKolonner(header);
  const alleredeKendte = new Set(allerede.filter((post) => post.kilde === kilde).map((post) => post.bilagsnummer));
  const nye: KildeLinje[] = [];
  const undtagelser: Undtagelse[] = [];
  let sprungetOver = 0;

  raekker.forEach(({ felter: raekke, kildelinje }) => {
    const bilagsnummer = (raekke[kolonner.bilag] ?? '').trim() || `linje-${kildelinje}`;
    const dato = parseDato(raekke[kolonner.dato] ?? '') ?? '';
    const tekstlinje = (raekke[kolonner.tekst] ?? '').trim();
    const kildeKonto = (raekke[kolonner.konto] ?? '').trim();
    const beloeb = parseDanskBeloeb(raekke[kolonner.beloeb] ?? '');
    if (!kildeKonto && beloeb === null && !tekstlinje) return;
    if (alleredeKendte.has(bilagsnummer)) {
      sprungetOver += 1;
      return;
    }
    if (beloeb === null || !dato) {
      undtagelser.push({ kilde, bilagsnummer, kildeKonto, beloeb, aarsag: 'Dato eller beløb kan ikke læses. Linjen er beholdt.' });
      return;
    }
    const konto = mapping.find((kandidat) => kandidat.kildeKonto === kildeKonto)?.konto;
    if (!konto) {
      undtagelser.push({ kilde, bilagsnummer, kildeKonto, beloeb, aarsag: 'Kontoen er ikke mappet. Den er ikke gættet.' });
      return;
    }
    nye.push({ kilde, bilagsnummer, dato, tekst: tekstlinje, kildeKonto, konto, beloeb });
  });

  return { nye, undtagelser, sprungetOver };
}

export function setBilag(eksisterende: KildeLinje[], undtagelser: Undtagelse[], tilfoejelse: KildeImport): { linjer: KildeLinje[]; undtagelser: Undtagelse[] } {
  const linjeNoegler = new Set(eksisterende.map(linjeNoegle));
  const undtagelseNoegler = new Set(undtagelser.map(undtagelseNoegle));
  const linjer = [...eksisterende];
  const samlet = [...undtagelser];
  for (const linje of tilfoejelse.nye) {
    const noegle = linjeNoegle(linje);
    if (linjeNoegler.has(noegle)) continue;
    linjeNoegler.add(noegle);
    linjer.push(linje);
  }
  for (const linje of tilfoejelse.undtagelser) {
    const noegle = undtagelseNoegle(linje);
    if (!linje.bilagsnummer || undtagelseNoegler.has(noegle)) continue;
    undtagelseNoegler.add(noegle);
    samlet.push(linje);
  }
  return { linjer, undtagelser: samlet };
}

function linjeNoegle(linje: KildeLinje): string {
  return JSON.stringify([linje.kilde, linje.bilagsnummer, linje.konto, linje.beloeb, linje.tekst]);
}

function undtagelseNoegle(linje: Undtagelse): string {
  return JSON.stringify([linje.kilde, linje.bilagsnummer, linje.kildeKonto, linje.beloeb, linje.aarsag]);
}

function laesKolonner(header: string[]): { bilag: number; dato: number; tekst: number; konto: number; beloeb: number } {
  const find = (navne: string[], ellers: number) => {
    const indeks = findKolonne(header, navne);
    return indeks < 0 ? ellers : indeks;
  };
  return {
    bilag: find(['bilag', 'bilagsnr', 'bilags nr', 'bilagsnummer', 'voucher', 'voucher no', 'voucher number', 'entry number', 'nummer'], 0),
    dato: find(['dato', 'bogfoeringsdato', 'date', 'posting date'], 1),
    tekst: find(['tekst', 'bogfoeringstekst', 'beskrivelse', 'text', 'entry text', 'description'], 2),
    konto: find(['konto', 'kildekonto', 'kontonr', 'konto nr', 'kontonummer', 'account', 'account id', 'account no', 'account number', 'source account'], 3),
    beloeb: find(['beloeb', 'belob', 'beloeb dkk', 'amount', 'amount dkk'], 4),
  };
}

function findHeader(raekker: string[][]): number {
  const kendte = [
    'bilag', 'bilagsnr', 'bilags nr', 'bilagsnummer', 'voucher', 'voucher no', 'voucher number',
    'dato', 'bogfoeringsdato', 'date', 'posting date',
    'konto', 'kildekonto', 'kontonr', 'konto nr', 'kontonummer',
    'account', 'account id', 'account no', 'account number', 'source account',
  ];
  return raekker.findIndex((raekke) => raekke.some((celle) => kendte.includes(normaliser(celle))));
}

function findKolonne(header: string[], navne: string[]): number {
  return header.findIndex((celle) => navne.includes(normaliser(celle)));
}

function normaliser(vaerdi: string): string {
  return vaerdi.trim().toLowerCase().replaceAll('æ', 'ae').replaceAll('ø', 'oe').replaceAll('å', 'aa').normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim();
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
        if (tekst[i + 1] === '"') { celle += '"'; i += 1; } else iCitation = false;
      } else celle += tegn;
      continue;
    }
    if (tegn === '"') iCitation = true;
    else if (tegn === ';') { raekke.push(celle); celle = ''; }
    else if (tegn === '\n') { raekke.push(celle); raekker.push(raekke); raekke = []; celle = ''; }
    else if (tegn !== '\r') celle += tegn;
  }
  if (celle.length > 0 || raekke.length > 0) { raekke.push(celle); raekker.push(raekke); }
  return raekker.filter((kandidat) => kandidat.some((felt) => felt.trim() !== ''));
}
