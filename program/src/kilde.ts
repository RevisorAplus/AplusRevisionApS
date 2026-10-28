import { parseDato, parseDanskBeloeb } from './penge';

export type KildeNavn = 'dinero' | 'billy' | 'economic' | 'excel';

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

export function indlaesKilde(
  tekst: string,
  kilde: KildeNavn,
  mapping: { kildeKonto: string; konto: string }[],
  allerede: { kilde: KildeNavn; bilagsnummer: string }[],
): KildeImport {
  const raekker = parseCsv(tekst.replace(/^\uFEFF/, ''));
  const header = raekker.findIndex((raekke) => raekke.some((celle) => ['bilag', 'bilagsnr', 'dato', 'konto'].includes(normaliser(celle))));
  if (header < 0) {
    return { nye: [], undtagelser: [{ kilde, bilagsnummer: '', kildeKonto: '', beloeb: null, aarsag: 'Filen har ingen kolonne med bilag eller konto.' }], sprungetOver: 0 };
  }
  const kolonner = laesKolonner(raekker[header]);
  const set = new Set(allerede.filter((post) => post.kilde === kilde).map((post) => post.bilagsnummer));
  const nye: KildeLinje[] = [];
  const undtagelser: Undtagelse[] = [];
  let sprungetOver = 0;

  raekker.slice(header + 1).forEach((raekke, indeks) => {
    const bilagsnummer = (raekke[kolonner.bilag] ?? '').trim() || `linje-${header + indeks + 2}`;
    const dato = parseDato(raekke[kolonner.dato] ?? '') ?? '';
    const tekstlinje = (raekke[kolonner.tekst] ?? '').trim();
    const kildeKonto = (raekke[kolonner.konto] ?? '').trim();
    const beloeb = parseDanskBeloeb(raekke[kolonner.beloeb] ?? '');
    if (!kildeKonto && beloeb === null && !tekstlinje) return;
    if (set.has(bilagsnummer)) {
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
  const noegler = new Set([
    ...eksisterende.map((linje) => `${linje.kilde}:${linje.bilagsnummer}`),
    ...undtagelser.map((linje) => `${linje.kilde}:${linje.bilagsnummer}`),
  ]);
  const linjer = [...eksisterende];
  const samlet = [...undtagelser];
  for (const linje of tilfoejelse.nye) {
    const noegle = `${linje.kilde}:${linje.bilagsnummer}`;
    if (noegler.has(noegle)) continue;
    noegler.add(noegle);
    linjer.push(linje);
  }
  for (const linje of tilfoejelse.undtagelser) {
    const noegle = `${linje.kilde}:${linje.bilagsnummer}`;
    if (!linje.bilagsnummer || noegler.has(noegle)) continue;
    noegler.add(noegle);
    samlet.push(linje);
  }
  return { linjer, undtagelser: samlet };
}

function laesKolonner(header: string[]): { bilag: number; dato: number; tekst: number; konto: number; beloeb: number } {
  const find = (navne: string[], ellers: number) => {
    const indeks = header.findIndex((celle) => navne.includes(normaliser(celle)));
    return indeks < 0 ? ellers : indeks;
  };
  return {
    bilag: find(['bilag', 'bilagsnr', 'voucher', 'nummer'], 0),
    dato: find(['dato', 'date'], 1),
    tekst: find(['tekst', 'beskrivelse', 'text'], 2),
    konto: find(['konto', 'kontonr', 'kontonummer'], 3),
    beloeb: find(['beloeb', 'belob', 'amount'], 4),
  };
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
