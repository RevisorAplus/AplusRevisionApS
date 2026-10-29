import { formatKroner, parseDanskBeloeb, parseDato } from './penge';

export type BilagPost = {
  id: string;
  kilde: string;
  bilagsnummer: string;
  dato: string;
  tekst: string;
  konto: string;
  beloeb: number;
  momskode: string;
  stornoAf: string | null;
  fil?: string | null;
};

const LOENKONTO: Record<string, string> = {
  bruttoloen: '2210',
  askat: '6910',
  ambidrag: '6920',
  nettoloen: '5500',
};

export function indlaesLoenfil(tekst: string): { poster: BilagPost[]; personale: number; fejl: string | null } {
  const raekker = tekst.replace(/^\uFEFF/, '').split(/\r?\n/).map((linje) => linje.split(';')).filter((linje) => linje.some((felt) => felt.trim() !== ''));
  const header = raekker[0]?.map(normaliser) ?? [];
  const typeKolonne = header.indexOf('type') >= 0;
  const start = header.includes('type') || header.includes('konto') || header.includes('beloeb') ? 1 : 0;
  const poster: BilagPost[] = [];
  raekker.slice(start).forEach((raekke, indeks) => {
    const art = normaliser(typeKolonne ? raekke[0] ?? '' : raekke[1] ?? '');
    const konto = typeKolonne ? LOENKONTO[art] : (raekke[0] ?? '').trim();
    const navn = (typeKolonne ? raekke[0] : raekke[1] ?? '').trim();
    const beloeb = parseDanskBeloeb(raekke[typeKolonne ? 1 : 2] ?? '');
    const dato = parseDato(raekke[3] ?? '') ?? '2024-09-30';
    if (!konto || beloeb === null) return;
    poster.push({
      id: `loen-${indeks + 1}`,
      kilde: 'loen',
      bilagsnummer: 'L1',
      dato,
      tekst: navn,
      konto,
      beloeb,
      momskode: '',
      stornoAf: null,
      fil: 'loenfil.csv',
    });
  });
  if (poster.length === 0) return { poster, personale: 0, fejl: 'Lønfilen har ingen beløb.' };
  const sum = poster.reduce((acc, post) => acc + post.beloeb, 0);
  if (sum !== 0) {
    return { poster, personale: 0, fejl: 'Lønfilen balancerer ikke til nul.' };
  }
  const personale = poster.filter((post) => post.konto === '2210').reduce((acc, post) => acc + post.beloeb, 0);
  return { poster, personale, fejl: null };
}

export function sletBilag(): { fejl: string } {
  return { fejl: 'Et bilag kan ikke slettes. Det kan kun tilbageføres.' };
}

export function tilbagefoer(poster: BilagPost[], id: string, dato: string): { poster: BilagPost[]; fejl: string | null } {
  const fundet = poster.find((post) => post.id === id);
  if (!fundet) return { poster, fejl: 'Bilaget findes ikke.' };
  if (fundet.stornoAf) return { poster, fejl: 'En tilbageførsel kan ikke tilbageføres igen her.' };
  if (poster.some((post) => post.stornoAf === id)) return { poster, fejl: 'Bilaget er allerede tilbageført.' };
  const modpost: BilagPost = {
    ...fundet,
    id: `${id}-t`,
    bilagsnummer: `${fundet.bilagsnummer}-T`,
    dato,
    tekst: `Tilbageførsel ${fundet.tekst}`,
    beloeb: -fundet.beloeb,
    stornoAf: id,
    fil: null,
  };
  return { poster: [...poster, modpost], fejl: null };
}

export function soegBilag(poster: BilagPost[], q: string): BilagPost[] {
  const soegning = noegle(q);
  if (!soegning) return poster;
  return poster.filter((post) =>
    noegle(
      [post.tekst, post.bilagsnummer, post.konto, post.kilde, post.fil ?? '', formatKroner(post.beloeb), String(post.beloeb / 100)].join(' '),
    ).includes(soegning),
  );
}

export function bilagUdenFil(poster: BilagPost[]): BilagPost[] {
  return poster.filter((post) => !post.stornoAf && (post.fil == null || post.fil === ''));
}

function noegle(vaerdi: string): string {
  return vaerdi.toLowerCase().replace(/[\s.]/g, '');
}

function normaliser(vaerdi: string): string {
  return vaerdi.trim().toLowerCase().replaceAll('æ', 'ae').replaceAll('ø', 'oe').replaceAll('å', 'aa').replace(/[^a-z0-9]+/g, '');
}
