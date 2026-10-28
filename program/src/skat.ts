export const SELSKABSSKAT_PROCENT = 22;

export const HAEFTELSESTEKST = 'Selskabet hæfter solidarisk for selskabsskat og kildeskat i sambeskatningskredsen.';

export type Selskabsform = 'aps' | 'enkeltmand';

export type KontoRolle = 'stiftelse' | 'skattekonto-rente' | 'ikke-fradrag' | 'anden';

export type SkatGrundlag = {
  form: Selskabsform;
  resultatFoerSkat: number;
  ikkeFradrag: number;
  stiftelse: number;
  skattekontoRente: number;
  regnskabsafskrivning: number;
  skatteafskrivning: number;
  fremfoertUnderskud: number;
  modregnetUnderskud: number;
  sambeskatning: boolean;
  administrationsselskab: boolean;
  regnskabsvaerdiAnlaeg: number | null;
  skattevaerdiAnlaeg: number | null;
};

export type SkatLinje = { tekst: string; beloeb: number };

export type SkatResultat = {
  linjer: SkatLinje[];
  skattepligtigIndkomst: number;
  aktuelSkat: number;
  udskudtSkat: number | null;
  resultatEfterSkat: number;
  nytFremfoertUnderskud: number;
  balanceTekst: string | null;
  note: string | null;
  fejl: string | null;
};

export type SelskabIKreds = {
  navn: string;
  grundlag: SkatGrundlag;
};

const TOMT: SkatResultat = {
  linjer: [],
  skattepligtigIndkomst: 0,
  aktuelSkat: 0,
  udskudtSkat: null,
  resultatEfterSkat: 0,
  nytFremfoertUnderskud: 0,
  balanceTekst: null,
  note: null,
  fejl: null,
};

export function permanenteFraKonti(konti: { rolle: KontoRolle; beloeb: number }[]): Pick<SkatGrundlag, 'ikkeFradrag' | 'stiftelse' | 'skattekontoRente'> {
  return konti.reduce(
    (acc, konto) => {
      if (konto.rolle === 'ikke-fradrag') acc.ikkeFradrag += konto.beloeb;
      if (konto.rolle === 'stiftelse') acc.stiftelse += konto.beloeb;
      if (konto.rolle === 'skattekonto-rente') acc.skattekontoRente += konto.beloeb;
      return acc;
    },
    { ikkeFradrag: 0, stiftelse: 0, skattekontoRente: 0 },
  );
}

export function beregnSkat(grundlag: SkatGrundlag, procent = SELSKABSSKAT_PROCENT): SkatResultat {
  if (grundlag.form === 'enkeltmand') {
    return {
      ...TOMT,
      resultatEfterSkat: grundlag.resultatFoerSkat,
      fejl: 'En personligt ejet virksomhed får ikke selskabsskat.',
    };
  }

  const permanente = grundlag.ikkeFradrag + grundlag.stiftelse + grundlag.skattekontoRente;
  const foerUnderskud = grundlag.resultatFoerSkat + permanente + grundlag.regnskabsafskrivning - grundlag.skatteafskrivning;
  const kanModregnes = foerUnderskud >= 0
    ? begraens(grundlag.modregnetUnderskud, foerUnderskud)
    : begraens(grundlag.modregnetUnderskud, -foerUnderskud);
  const efterModregning = foerUnderskud >= 0 ? foerUnderskud - kanModregnes : foerUnderskud + kanModregnes;
  const brugtFremfoert = begraens(grundlag.fremfoertUnderskud, Math.max(efterModregning, 0));
  const skattepligtig = efterModregning - brugtFremfoert;
  const aktuelSkat = skattepligtig > 0 ? Math.round(skattepligtig * procent / 100) : 0;
  const restUnderskud = skattepligtig < 0 ? -skattepligtig : 0;
  const udskudtSkat = udskudt(grundlag, procent);

  const linjer: SkatLinje[] = [
    { tekst: 'Resultat før skat', beloeb: grundlag.resultatFoerSkat },
    { tekst: 'Ikke fradragsberettigede omkostninger', beloeb: grundlag.ikkeFradrag },
    { tekst: 'Stiftelsesomkostninger', beloeb: grundlag.stiftelse },
    { tekst: 'Renter til Skattekontoen', beloeb: grundlag.skattekontoRente },
    { tekst: 'Regnskabsmæssige afskrivninger', beloeb: grundlag.regnskabsafskrivning },
    { tekst: 'Skattemæssige afskrivninger', beloeb: -grundlag.skatteafskrivning },
  ];
  if (grundlag.sambeskatning && kanModregnes !== 0) {
    linjer.push({ tekst: 'Modregnet underskud fra sambeskattede selskaber', beloeb: foerUnderskud >= 0 ? -kanModregnes : kanModregnes });
  }
  linjer.push({ tekst: 'Fremført underskud', beloeb: -brugtFremfoert });
  linjer.push({ tekst: 'Skattepligtig indkomst', beloeb: skattepligtig });
  linjer.push({ tekst: `Årets skat ${procent} %`, beloeb: aktuelSkat });

  return {
    linjer: linjer.filter((linje, indeks) => indeks === 0 || indeks >= linjer.length - 3 || linje.beloeb !== 0),
    skattepligtigIndkomst: skattepligtig,
    aktuelSkat,
    udskudtSkat,
    resultatEfterSkat: grundlag.resultatFoerSkat - aktuelSkat,
    nytFremfoertUnderskud: grundlag.fremfoertUnderskud - brugtFremfoert + restUnderskud,
    balanceTekst: grundlag.sambeskatning && !grundlag.administrationsselskab ? 'Skyldigt sambeskatningsbidrag' : 'Skyldig selskabsskat',
    note: `Selskabsskatten er beregnet med ${procent} %.`,
    fejl: null,
  };
}

export function beregnSambeskatning(selskaber: SelskabIKreds[], procent = SELSKABSSKAT_PROCENT): { fejl: string | null; selskaber: (SkatResultat & { navn: string })[]; skyldigTilSkat: number; tilgodehavende: number } {
  if (selskaber.some((selskab) => selskab.grundlag.form === 'enkeltmand')) {
    return { fejl: 'En personligt ejet virksomhed kan ikke indgå i sambeskatning.', selskaber: [], skyldigTilSkat: 0, tilgodehavende: 0 };
  }
  const foer = selskaber.map((selskab) => indkomstFoerUnderskud(selskab.grundlag));
  const modregnet = fordelModregning(foer);
  const resultater = selskaber.map((selskab, indeks) => ({
    navn: selskab.navn,
    ...beregnSkat({
      ...selskab.grundlag,
      form: 'aps',
      sambeskatning: true,
      modregnetUnderskud: modregnet[indeks] ?? 0,
    }, procent),
  }));
  const skyldigTilSkat = resultater.reduce((sum, selskab) => sum + selskab.aktuelSkat, 0);
  const tilgodehavende = resultater
    .filter((selskab) => !selskaber.find((kandidat) => kandidat.navn === selskab.navn)?.grundlag.administrationsselskab)
    .reduce((sum, selskab) => sum + selskab.aktuelSkat, 0);
  return {
    fejl: null,
    selskaber: resultater.map((selskab) => ({ ...selskab, note: HAEFTELSESTEKST })),
    skyldigTilSkat,
    tilgodehavende,
  };
}

function indkomstFoerUnderskud(grundlag: SkatGrundlag): number {
  return grundlag.resultatFoerSkat + grundlag.ikkeFradrag + grundlag.stiftelse + grundlag.skattekontoRente + grundlag.regnskabsafskrivning - grundlag.skatteafskrivning;
}

function fordelModregning(indkomster: number[]): number[] {
  const kan = Math.min(
    indkomster.reduce((sum, tal) => sum + Math.max(tal, 0), 0),
    indkomster.reduce((sum, tal) => sum + Math.max(-tal, 0), 0),
  );
  const tilOverskud = tildel(indkomster.map((tal) => Math.max(tal, 0)), kan);
  const tilUnderskud = tildel(indkomster.map((tal) => Math.max(-tal, 0)), kan);
  return indkomster.map((tal, indeks) => (tal >= 0 ? tilOverskud[indeks] ?? 0 : tilUnderskud[indeks] ?? 0));
}

function tildel(andele: number[], kan: number): number[] {
  const samlet = andele.reduce((sum, tal) => sum + tal, 0);
  if (samlet === 0 || kan === 0) return andele.map(() => 0);
  const ud = andele.map((tal) => Math.floor(kan * tal / samlet));
  let rest = kan - ud.reduce((sum, tal) => sum + tal, 0);
  const orden = andele.map((tal, indeks) => ({ tal, indeks })).sort((a, b) => b.tal - a.tal);
  for (const punkt of orden) {
    if (rest === 0 || punkt.tal === 0) break;
    ud[punkt.indeks] += 1;
    rest -= 1;
  }
  return ud;
}

function udskudt(grundlag: SkatGrundlag, procent: number): number | null {
  if (grundlag.regnskabsvaerdiAnlaeg === null || grundlag.skattevaerdiAnlaeg === null) return null;
  return Math.round((grundlag.regnskabsvaerdiAnlaeg - grundlag.skattevaerdiAnlaeg) * procent / 100);
}

function begraens(oensket: number, loft: number): number {
  return Math.max(0, Math.min(oensket, loft));
}
