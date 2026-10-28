import { kalenderMaaneder } from './penge';
import { SELSKABSSKAT_PROCENT } from './skat';

export type Anlaeg = {
  navn: string;
  kostpris: number;
  brugstidAar: number;
  restvaerdi: number;
  anskaffet: string;
  skatteafskrivning: number;
};

export function aarligAfskrivning(anlaeg: Anlaeg): number {
  if (anlaeg.brugstidAar <= 0) return 0;
  return Math.round((anlaeg.kostpris - anlaeg.restvaerdi) / anlaeg.brugstidAar);
}

export function afskrivningIPerioden(anlaeg: Anlaeg, fra: string, til: string): number {
  const start = anlaeg.anskaffet > fra ? anlaeg.anskaffet : fra;
  if (start > til) return 0;
  const maaneder = kalenderMaaneder(start, til);
  const beloeb = Math.round(aarligAfskrivning(anlaeg) * maaneder / 12);
  const loft = Math.max(anlaeg.kostpris - anlaeg.restvaerdi, 0);
  return Math.min(beloeb, loft);
}

export function bogfoertVaerdi(anlaeg: Anlaeg, afskrevet: number): number {
  return anlaeg.kostpris - afskrevet;
}

export function udskudtSkatAfAnlaeg(bogfoert: number, skattemæssig: number, procent = SELSKABSSKAT_PROCENT): number {
  return Math.round((bogfoert - skattemæssig) * procent / 100);
}

export function afskrivningStemmer(kartotek: number, resultat: number): boolean {
  return kartotek === resultat;
}
