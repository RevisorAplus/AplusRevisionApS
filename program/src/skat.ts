export const SELSKABSSKAT_PROCENT = 22;

export const HAEFTELSESTEKST = 'Selskabet hæfter solidarisk for selskabsskat og kildeskat i sambeskatningskredsen.';

export type Selskabsform = 'aps' | 'as' | 'enkeltmand';

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
  haeftelse: string | null;
  fejl: string | null;
};

export type SelskabIKreds = {
  navn: string;
  grundlag: SkatGrundlag;
};

export type Balancepost = { tekst: string; beloeb: number; modpart: string };

export type SambeskattetSelskab = SkatResultat & {
  navn: string;
  administrationsselskab: boolean;
  sambeskatningsbidrag: number;
  balanceposter: Balancepost[];
};

export type SambeskatningResultat = {
  fejl: string | null;
  selskaber: SambeskattetSelskab[];
  skyldigTilSkat: number;
  tilgodehavende: number;
};

export const BRO = {
  resultat: 'Resultat før skat',
  ikkeFradrag: 'Ikke fradragsberettigede omkostninger',
  stiftelse: 'Stiftelsesomkostninger',
  skattekontoRente: 'Renter til Skattekontoen',
  regnskabsafskrivning: 'Regnskabsmæssige afskrivninger',
  skatteafskrivning: 'Skattemæssige afskrivninger',
  fremfoert: 'Fremført underskud',
  modregnet: 'Modregnet underskud fra sambeskattede selskaber',
  afgivet: 'Underskud anvendt i sambeskattede selskaber',
  skattepligtig: 'Skattepligtig indkomst',
} as const;

export const aaretsSkatTekst = (procent: number) => `Årets skat ${procent} %`;

export function erSelskab(form: Selskabsform): boolean {
  return form !== 'enkeltmand';
}

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

export function rundOere(vaerdi: number): number {
  return Math.sign(vaerdi) * Math.round(Math.abs(vaerdi)) + 0;
}

export function skatAf(indkomst: number, procent = SELSKABSSKAT_PROCENT): number {
  return indkomst > 0 ? rundOere(indkomst * procent / 100) : 0;
}

export function udskudtSkatAfForskel(regnskabsvaerdi: number, skattevaerdi: number, procent = SELSKABSSKAT_PROCENT): number {
  return rundOere((regnskabsvaerdi - skattevaerdi) * procent / 100);
}

export function beregnUdskudtSkat(regnskabsvaerdi: number | null, skattevaerdi: number | null, procent = SELSKABSSKAT_PROCENT): number | null {
  if (regnskabsvaerdi === null || skattevaerdi === null) return null;
  return udskudtSkatAfForskel(regnskabsvaerdi, skattevaerdi, procent);
}

export function beregnSkat(grundlag: SkatGrundlag, procent = SELSKABSSKAT_PROCENT): SkatResultat {
  if (!erSelskab(grundlag.form)) {
    return frys({
      linjer: [],
      skattepligtigIndkomst: 0,
      aktuelSkat: 0,
      udskudtSkat: null,
      resultatEfterSkat: grundlag.resultatFoerSkat,
      nytFremfoertUnderskud: 0,
      balanceTekst: null,
      note: null,
      haeftelse: null,
      fejl: grundlag.sambeskatning
        ? 'En personligt ejet virksomhed får ikke selskabsskat og kan ikke indgå i sambeskatning.'
        : 'En personligt ejet virksomhed får ikke selskabsskat.',
    });
  }

  const foerUnderskud = indkomstFoerUnderskud(grundlag);
  const brugtFremfoert = begraens(grundlag.fremfoertUnderskud, Math.max(foerUnderskud, 0));
  const efterFremfoert = foerUnderskud - brugtFremfoert;
  const modregning = grundlag.sambeskatning ? begraens(grundlag.modregnetUnderskud, Math.abs(efterFremfoert)) : 0;
  const skattepligtig = efterFremfoert >= 0 ? efterFremfoert - modregning : efterFremfoert + modregning;
  const aktuelSkat = skatAf(skattepligtig, procent);
  const restUnderskud = skattepligtig < 0 ? -skattepligtig : 0;

  const trin: SkatLinje[] = [
    { tekst: BRO.ikkeFradrag, beloeb: grundlag.ikkeFradrag },
    { tekst: BRO.stiftelse, beloeb: grundlag.stiftelse },
    { tekst: BRO.skattekontoRente, beloeb: grundlag.skattekontoRente },
    { tekst: BRO.regnskabsafskrivning, beloeb: grundlag.regnskabsafskrivning },
    { tekst: BRO.skatteafskrivning, beloeb: -grundlag.skatteafskrivning },
    { tekst: BRO.fremfoert, beloeb: -brugtFremfoert },
    efterFremfoert >= 0
      ? { tekst: BRO.modregnet, beloeb: -modregning }
      : { tekst: BRO.afgivet, beloeb: modregning },
  ];

  return frys({
    linjer: [
      { tekst: BRO.resultat, beloeb: grundlag.resultatFoerSkat },
      ...trin.filter((linje) => linje.beloeb !== 0),
      { tekst: BRO.skattepligtig, beloeb: skattepligtig },
      { tekst: aaretsSkatTekst(procent), beloeb: aktuelSkat },
    ],
    skattepligtigIndkomst: skattepligtig,
    aktuelSkat,
    udskudtSkat: beregnUdskudtSkat(grundlag.regnskabsvaerdiAnlaeg, grundlag.skattevaerdiAnlaeg, procent),
    resultatEfterSkat: grundlag.resultatFoerSkat - aktuelSkat,
    nytFremfoertUnderskud: Math.max(grundlag.fremfoertUnderskud, 0) - brugtFremfoert + restUnderskud,
    balanceTekst: grundlag.sambeskatning && !grundlag.administrationsselskab ? 'Skyldigt sambeskatningsbidrag' : 'Skyldig selskabsskat',
    note: `Selskabsskatten er beregnet med ${procent} %.`,
    haeftelse: grundlag.sambeskatning ? HAEFTELSESTEKST : null,
    fejl: null,
  });
}

export function kontrollerSkattebro(resultat: SkatResultat, procent = SELSKABSSKAT_PROCENT): string[] {
  if (resultat.fejl !== null) return [];
  const fejl: string[] = [];
  const indeks = resultat.linjer.findIndex((linje) => linje.tekst === BRO.skattepligtig);
  const skatLinje = resultat.linjer.find((linje) => linje.tekst === aaretsSkatTekst(procent));
  if (indeks < 1 || !skatLinje) return ['Skattebroen mangler trin.'];
  const sumAfTrin = resultat.linjer.slice(0, indeks).reduce((sum, linje) => sum + linje.beloeb, 0);
  if (sumAfTrin !== resultat.linjer[indeks].beloeb || sumAfTrin !== resultat.skattepligtigIndkomst) {
    fejl.push('Trinene i skattebroen giver ikke den skattepligtige indkomst.');
  }
  const beregnet = skatAf(sumAfTrin, procent);
  if (skatLinje.beloeb !== beregnet || resultat.aktuelSkat !== beregnet) {
    fejl.push('Årets skat er ikke den beregnede skat af den skattepligtige indkomst.');
  }
  if (resultat.resultatEfterSkat !== resultat.linjer[0].beloeb - resultat.aktuelSkat) {
    fejl.push('Resultat efter skat er ikke resultat før skat minus årets skat.');
  }
  return fejl;
}

export function beregnSambeskatning(selskaber: SelskabIKreds[], procent = SELSKABSSKAT_PROCENT): SambeskatningResultat {
  const afvist = (fejl: string): SambeskatningResultat => ({ fejl, selskaber: [], skyldigTilSkat: 0, tilgodehavende: 0 });
  if (selskaber.some((selskab) => !erSelskab(selskab.grundlag.form))) {
    return afvist('En personligt ejet virksomhed kan ikke indgå i sambeskatning.');
  }
  if (selskaber.length < 2) return afvist('En sambeskatning kræver mindst to selskaber.');
  if (new Set(selskaber.map((selskab) => selskab.navn)).size !== selskaber.length) {
    return afvist('To selskaber i sambeskatningen har samme navn.');
  }
  const administration = selskaber.filter((selskab) => selskab.grundlag.administrationsselskab);
  if (administration.length !== 1) return afvist('Sambeskatningen skal have præcis ét administrationsselskab.');
  const admin = administration[0].navn;

  const efterEgetUnderskud = selskaber.map((selskab) => {
    const foer = indkomstFoerUnderskud(selskab.grundlag);
    return foer - begraens(selskab.grundlag.fremfoertUnderskud, Math.max(foer, 0));
  });
  const modregnet = fordelModregning(efterEgetUnderskud);
  const beregnede = selskaber.map((selskab, indeks) => ({
    navn: selskab.navn,
    administrationsselskab: selskab.grundlag.administrationsselskab,
    skat: beregnSkat({ ...selskab.grundlag, sambeskatning: true, modregnetUnderskud: modregnet[indeks] ?? 0 }, procent),
  }));

  const skyldigTilSkat = beregnede.reduce((sum, selskab) => sum + selskab.skat.aktuelSkat, 0);
  const bidragsydere = beregnede.filter((selskab) => !selskab.administrationsselskab && selskab.skat.aktuelSkat > 0);
  const tilgodehavende = bidragsydere.reduce((sum, selskab) => sum + selskab.skat.aktuelSkat, 0);

  const resultater = beregnede.map((selskab): SambeskattetSelskab => {
    const balanceposter: Balancepost[] = [];
    if (selskab.administrationsselskab) {
      for (const yder of bidragsydere) {
        balanceposter.push({ tekst: 'Tilgodehavende sambeskatningsbidrag', beloeb: yder.skat.aktuelSkat, modpart: yder.navn });
      }
      if (skyldigTilSkat > 0) balanceposter.push({ tekst: 'Skyldig selskabsskat', beloeb: skyldigTilSkat, modpart: 'Skattestyrelsen' });
    } else if (selskab.skat.aktuelSkat > 0) {
      balanceposter.push({ tekst: 'Skyldigt sambeskatningsbidrag', beloeb: selskab.skat.aktuelSkat, modpart: admin });
    }
    return frys({
      ...selskab.skat,
      linjer: selskab.skat.linjer.map((linje) => ({ ...linje })),
      navn: selskab.navn,
      administrationsselskab: selskab.administrationsselskab,
      sambeskatningsbidrag: selskab.administrationsselskab ? 0 : selskab.skat.aktuelSkat,
      balanceposter,
      note: HAEFTELSESTEKST,
      haeftelse: HAEFTELSESTEKST,
    });
  });

  return { fejl: null, selskaber: resultater, skyldigTilSkat, tilgodehavende };
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

function frys<T extends SkatResultat>(resultat: T): T {
  resultat.linjer.forEach((linje) => Object.freeze(linje));
  Object.freeze(resultat.linjer);
  if ('balanceposter' in resultat && Array.isArray(resultat.balanceposter)) {
    resultat.balanceposter.forEach((post) => Object.freeze(post));
    Object.freeze(resultat.balanceposter);
  }
  return Object.freeze(resultat);
}

function begraens(oensket: number, loft: number): number {
  return Math.max(0, Math.min(oensket, loft));
}
