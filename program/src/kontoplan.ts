export type KontoArt =
  | 'resultat'
  | 'balance'
  | 'moms'
  | 'egenkapital'
  | 'varelager'
  | 'valuta'
  | 'mellemregning-ejer';

export type Skatterolle = 'stiftelse' | 'skattekonto-rente';

export type Konto = {
  nummer: string;
  navn: string;
  art: KontoArt;
  skatterolle?: Skatterolle;
};

export type KildeMapping = {
  kilde: string;
  kildeKonto: string;
  konto: string;
};

const KONTOPLAN: Konto[] = [
  { nummer: '1010', navn: 'Salg', art: 'resultat' },
  { nummer: '2210', navn: 'Lønninger', art: 'resultat' },
  { nummer: '3410', navn: 'Lokale', art: 'resultat' },
  { nummer: '3610', navn: 'Stiftelsesomkostninger', art: 'resultat', skatterolle: 'stiftelse' },
  { nummer: '3630', navn: 'Renter Skattekonto', art: 'resultat', skatterolle: 'skattekonto-rente' },
  { nummer: '5500', navn: 'Bank', art: 'balance' },
  { nummer: '6110', navn: 'Varelager', art: 'varelager' },
  { nummer: '6310', navn: 'Mellemregning ejer', art: 'mellemregning-ejer' },
  { nummer: '6810', navn: 'Skyldigt sambeskatningsbidrag', art: 'balance' },
  { nummer: '6820', navn: 'Tilgodehavende sambeskatningsbidrag', art: 'balance' },
  { nummer: '6910', navn: 'A-skat', art: 'balance' },
  { nummer: '6920', navn: 'AM-bidrag', art: 'balance' },
  { nummer: '7410', navn: 'Egenkapital', art: 'egenkapital' },
  { nummer: '7510', navn: 'Overført resultat', art: 'egenkapital' },
];

const EFTER_NUMMER = new Map(KONTOPLAN.map((k) => [k.nummer, k]));

export function konto(nummer: string): Konto | null {
  return EFTER_NUMMER.get(nummer.trim()) ?? null;
}

export function art(nummer: string): KontoArt | null {
  return konto(nummer)?.art ?? null;
}

export function alleKonti(): readonly Konto[] {
  return KONTOPLAN;
}

export function gemMapping(
  mapping: KildeMapping[],
  kilde: string,
  kildeKonto: string,
  kontoNummer: string,
): KildeMapping[] {
  const rest = mapping.filter((m) => !(m.kilde === kilde && m.kildeKonto === kildeKonto));
  return [...rest, { kilde, kildeKonto, konto: kontoNummer }];
}

export function kontoForKilde(kilde: string, kildeKonto: string, mapping: KildeMapping[]): string | null {
  const fundet = mapping.find((m) => m.kilde === kilde && m.kildeKonto === kildeKonto);
  return fundet?.konto ?? null;
}
