import { rundOere } from './skat';

export const MOMS_PROCENT = 25;

export type Momskode = 'ingen' | 'salg25' | 'koeb25' | 'eu-erhvervelse' | 'omvendt' | 'delvis';

export const MOMSKODER: readonly Momskode[] = ['ingen', 'salg25', 'koeb25', 'eu-erhvervelse', 'omvendt', 'delvis'];

export type Rubrik = {
  felt: 'rubrikAVarer' | 'rubrikAYdelser';
  tekst: string;
  beloeb: number;
};

export type MomsFelter = {
  grundlag: number;
  salgsmoms: number;
  koebsmoms: number;
  euYdelser: number;
  euErhvervelser: number;
  ikkeFradrag: number;
  rubrik: Rubrik | null;
  fejl: string | null;
};

export type MomsLinje = { kode: Momskode; beloeb: number; fradragProcent?: number };

export type Momsangivelse = {
  salgsmoms: number;
  koebsmoms: number;
  euYdelser: number;
  euErhvervelser: number;
  rubrikAVarer: number;
  rubrikAYdelser: number;
  ikkeFradrag: number;
  afgift: number;
  fejl: string[];
};

const NUL: MomsFelter = {
  grundlag: 0,
  salgsmoms: 0,
  koebsmoms: 0,
  euYdelser: 0,
  euErhvervelser: 0,
  ikkeFradrag: 0,
  rubrik: null,
  fejl: null,
};

/**
 * For salg25, koeb25 og delvis er beløbet inklusive moms.
 * For eu-erhvervelse og omvendt er beløbet grundlaget uden moms, fordi fakturaen kommer uden dansk moms.
 */
export function momsFelter(kode: Momskode, beloebInclOereEllerGrundlag: number, fradragProcent?: number): MomsFelter {
  const beloeb = beloebInclOereEllerGrundlag;
  if (!Number.isInteger(beloeb)) return { ...NUL, fejl: 'Beløbet skal være et helt antal øre.' };
  const momsAfInkl = rundOere(beloeb * MOMS_PROCENT / (100 + MOMS_PROCENT));
  const momsAfGrundlag = rundOere(beloeb * MOMS_PROCENT / 100);

  switch (kode) {
    case 'ingen':
      return { ...NUL, grundlag: beloeb };
    case 'salg25':
      return { ...NUL, grundlag: beloeb - momsAfInkl, salgsmoms: momsAfInkl };
    case 'koeb25':
      return { ...NUL, grundlag: beloeb - momsAfInkl, koebsmoms: momsAfInkl };
    case 'eu-erhvervelse':
      return {
        ...NUL,
        grundlag: beloeb,
        euErhvervelser: momsAfGrundlag,
        koebsmoms: momsAfGrundlag,
        rubrik: { felt: 'rubrikAVarer', tekst: 'Rubrik A – varer', beloeb },
      };
    case 'omvendt':
      return {
        ...NUL,
        grundlag: beloeb,
        euYdelser: momsAfGrundlag,
        koebsmoms: momsAfGrundlag,
        rubrik: { felt: 'rubrikAYdelser', tekst: 'Rubrik A – ydelser', beloeb },
      };
    case 'delvis': {
      if (fradragProcent === undefined || !Number.isFinite(fradragProcent) || fradragProcent < 0 || fradragProcent > 100) {
        return { ...NUL, fejl: 'Delvis fradrag kræver en fradragsprocent mellem 0 og 100.' };
      }
      const koebsmoms = rundOere(momsAfInkl * fradragProcent / 100);
      return { ...NUL, grundlag: beloeb - momsAfInkl, koebsmoms, ikkeFradrag: momsAfInkl - koebsmoms };
    }
    default:
      return { ...NUL, fejl: `Momskoden ${String(kode)} findes ikke.` };
  }
}

export function momsangivelse(linjer: MomsLinje[]): Momsangivelse {
  const ud: Momsangivelse = {
    salgsmoms: 0,
    koebsmoms: 0,
    euYdelser: 0,
    euErhvervelser: 0,
    rubrikAVarer: 0,
    rubrikAYdelser: 0,
    ikkeFradrag: 0,
    afgift: 0,
    fejl: [],
  };
  linjer.forEach((linje, indeks) => {
    const felter = momsFelter(linje.kode, linje.beloeb, linje.fradragProcent);
    if (felter.fejl) {
      ud.fejl.push(`Linje ${indeks + 1}: ${felter.fejl}`);
      return;
    }
    ud.salgsmoms += felter.salgsmoms;
    ud.koebsmoms += felter.koebsmoms;
    ud.euYdelser += felter.euYdelser;
    ud.euErhvervelser += felter.euErhvervelser;
    ud.ikkeFradrag += felter.ikkeFradrag;
    if (felter.rubrik) ud[felter.rubrik.felt] += felter.rubrik.beloeb;
  });
  ud.afgift = ud.salgsmoms + ud.euErhvervelser + ud.euYdelser - ud.koebsmoms;
  return ud;
}

/** Begge tal er afgift til betaling: momskontoens kreditsaldo angives som et positivt beløb. */
export function momsStemmer(angivelseAfgift: number, momskonto: number): boolean {
  return Number.isInteger(angivelseAfgift) && Number.isInteger(momskonto) && angivelseAfgift === momskonto;
}
