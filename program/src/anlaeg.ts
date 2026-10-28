import { erIsoDato, kalenderMaaneder } from './penge';
import { SELSKABSSKAT_PROCENT, rundOere, udskudtSkatAfForskel } from './skat';

export type Anlaeg = {
  navn: string;
  kostpris: number;
  brugstidAar: number;
  restvaerdi: number;
  anskaffet: string;
  /** Akkumulerede skattemæssige afskrivninger ved periodens slutning. */
  skatteafskrivning: number;
};

export const SKOEN: readonly (keyof Anlaeg)[] = ['brugstidAar', 'restvaerdi'];

export type KartotekLinje = {
  navn: string;
  kostpris: number;
  tilgang: boolean;
  afskrevetPrimo: number;
  aaretsAfskrivning: number;
  afskrevetUltimo: number;
  regnskabsmaessigVaerdi: number;
  skattemaessigVaerdi: number;
  udskudtSkat: number;
};

export type Kartotek = {
  linjer: KartotekLinje[];
  kostprisPrimo: number;
  tilgang: number;
  kostprisUltimo: number;
  afskrevetPrimo: number;
  aaretsAfskrivning: number;
  afskrevetUltimo: number;
  ultimo: number;
  skattemaessigVaerdi: number;
  udskudtSkat: number;
};

export function kontrollerAnlaeg(anlaeg: Anlaeg): string[] {
  const fejl: string[] = [];
  if (!erIsoDato(anlaeg.anskaffet)) fejl.push(`${anlaeg.navn}: anskaffelsesdatoen er ikke en gyldig dato.`);
  if (anlaeg.kostpris <= 0) fejl.push(`${anlaeg.navn}: kostprisen skal være større end 0.`);
  if (!Number.isInteger(anlaeg.brugstidAar) || anlaeg.brugstidAar <= 0) fejl.push(`${anlaeg.navn}: brugstiden skal være et helt antal år over 0.`);
  if (anlaeg.restvaerdi < 0) fejl.push(`${anlaeg.navn}: restværdien kan ikke være negativ.`);
  if (anlaeg.restvaerdi > anlaeg.kostpris) fejl.push(`${anlaeg.navn}: restværdien kan ikke være højere end kostprisen.`);
  return fejl;
}

export function afskrivningsgrundlag(anlaeg: Anlaeg): number {
  return Math.max(anlaeg.kostpris - anlaeg.restvaerdi, 0);
}

export function aarligAfskrivning(anlaeg: Anlaeg): number {
  if (anlaeg.brugstidAar <= 0) return 0;
  return rundOere(afskrivningsgrundlag(anlaeg) / anlaeg.brugstidAar);
}

export function afskrevetFoer(anlaeg: Anlaeg, fra: string): number {
  if (anlaeg.brugstidAar <= 0) return 0;
  const maaneder = Math.max(maanedsnummer(fra) - maanedsnummer(anlaeg.anskaffet), 0);
  return Math.min(forMaaneder(anlaeg, maaneder), afskrivningsgrundlag(anlaeg));
}

export function afskrivningIPerioden(anlaeg: Anlaeg, fra: string, til: string, tidligereAfskrevet = afskrevetFoer(anlaeg, fra)): number {
  if (anlaeg.brugstidAar <= 0) return 0;
  const start = anlaeg.anskaffet > fra ? anlaeg.anskaffet : fra;
  if (start > til) return 0;
  const restgrundlag = Math.max(afskrivningsgrundlag(anlaeg) - tidligereAfskrevet, 0);
  return Math.min(forMaaneder(anlaeg, kalenderMaaneder(start, til)), restgrundlag);
}

export function bogfoertVaerdi(anlaeg: Anlaeg, afskrevet: number): number {
  return anlaeg.kostpris - afskrevet;
}

export function udskudtSkatAfAnlaeg(bogfoert: number, skattemæssig: number, procent = SELSKABSSKAT_PROCENT): number {
  return udskudtSkatAfForskel(bogfoert, skattemæssig, procent);
}

export function afskrivningStemmer(kartotek: number, resultat: number): boolean {
  return kartotek === resultat;
}

export function koerKartotek(anlaeg: Anlaeg[], fra: string, til: string, procent = SELSKABSSKAT_PROCENT): Kartotek {
  const linjer = anlaeg
    .filter((post) => post.anskaffet <= til)
    .map((post): KartotekLinje => {
      const afskrevetPrimo = afskrevetFoer(post, fra);
      const aaretsAfskrivning = afskrivningIPerioden(post, fra, til, afskrevetPrimo);
      const afskrevetUltimo = afskrevetPrimo + aaretsAfskrivning;
      const regnskabsmaessigVaerdi = bogfoertVaerdi(post, afskrevetUltimo);
      const skattemaessigVaerdi = post.kostpris - post.skatteafskrivning;
      return {
        navn: post.navn,
        kostpris: post.kostpris,
        tilgang: post.anskaffet >= fra,
        afskrevetPrimo,
        aaretsAfskrivning,
        afskrevetUltimo,
        regnskabsmaessigVaerdi,
        skattemaessigVaerdi,
        udskudtSkat: udskudtSkatAfForskel(regnskabsmaessigVaerdi, skattemaessigVaerdi, procent),
      };
    });
  const sum = (felt: (linje: KartotekLinje) => number) => linjer.reduce((acc, linje) => acc + felt(linje), 0);
  const ultimo = sum((linje) => linje.regnskabsmaessigVaerdi);
  const skattemaessigVaerdi = sum((linje) => linje.skattemaessigVaerdi);
  return {
    linjer,
    kostprisPrimo: sum((linje) => (linje.tilgang ? 0 : linje.kostpris)),
    tilgang: sum((linje) => (linje.tilgang ? linje.kostpris : 0)),
    kostprisUltimo: sum((linje) => linje.kostpris),
    afskrevetPrimo: sum((linje) => linje.afskrevetPrimo),
    aaretsAfskrivning: sum((linje) => linje.aaretsAfskrivning),
    afskrevetUltimo: sum((linje) => linje.afskrevetUltimo),
    ultimo,
    skattemaessigVaerdi,
    udskudtSkat: udskudtSkatAfForskel(ultimo, skattemaessigVaerdi, procent),
  };
}

function forMaaneder(anlaeg: Anlaeg, maaneder: number): number {
  return rundOere(afskrivningsgrundlag(anlaeg) * maaneder / (anlaeg.brugstidAar * 12));
}

function maanedsnummer(iso: string): number {
  const [aar, maaned] = iso.split('-').map(Number);
  return aar * 12 + maaned - 1;
}
