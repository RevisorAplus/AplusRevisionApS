import { HAEFTELSESTEKST } from './skat';

export type Note = { titel: string; tekst: string };

export function bygNoter(input: {
  personale: number;
  anlaegIBalancen: number | null;
  anlaegIKartotek: number | null;
  sambeskatning: boolean;
}): { noter: Note[]; fejl: string[] } {
  const noter: Note[] = [];
  const fejl: string[] = [];
  if (input.personale !== 0) noter.push({ titel: 'Personaleomkostninger', tekst: 'Noten følger personalekontoen.' });
  if (input.anlaegIBalancen !== null || input.anlaegIKartotek !== null) {
    const balance = input.anlaegIBalancen ?? 0;
    const kartotek = input.anlaegIKartotek ?? 0;
    if (balance !== kartotek) fejl.push('Anlægsnotens ultimo er ikke lig med balancens anlæg.');
    else noter.push({ titel: 'Anlægsaktiver', tekst: 'Ultimo i noten er lig med balancen.' });
  }
  if (input.sambeskatning) noter.push({ titel: 'Sambeskatning', tekst: HAEFTELSESTEKST });
  return { noter, fejl };
}

export function egenkapitalforklaring(primo: number, bevaegelser: { tekst: string; beloeb: number }[], ultimo: number): { linjer: { tekst: string; beloeb: number }[]; stemmer: boolean } {
  const linjer = [{ tekst: 'Primo', beloeb: primo }, ...bevaegelser, { tekst: 'Ultimo', beloeb: primo + bevaegelser.reduce((sum, linje) => sum + linje.beloeb, 0) }];
  return { linjer, stemmer: linjer[linjer.length - 1].beloeb === ultimo };
}
