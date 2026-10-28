import type { KontrolLinje, Rapport, RapportLinje } from './aar';

export type UdtraekLinje = { tekst: string; beloeb: number; sidsteAar?: number };

export type BalanceGruppe = 'Aktiver' | 'Egenkapital' | 'Gæld';

export type BalanceUdtraekLinje = UdtraekLinje & { gruppe: BalanceGruppe };

export type Udtraek = {
  selskab: string;
  periode: { fra: string; til: string };
  resultatlinjer: UdtraekLinje[];
  balancelinjer: BalanceUdtraekLinje[];
  noter: string[];
};

export function bygUdtraek(input: { selskab: string; fra: string; til: string; rapport: Rapport }): Udtraek {
  const { rapport } = input;
  const kopi = (linje: RapportLinje): UdtraekLinje => {
    const ud: UdtraekLinje = { tekst: linje.tekst, beloeb: linje.beloeb };
    if (rapport.sammenligning && linje.sidsteAar !== undefined) ud.sidsteAar = linje.sidsteAar;
    return ud;
  };
  const gruppe = (navn: BalanceGruppe, linjer: RapportLinje[]): BalanceUdtraekLinje[] =>
    linjer.map((linje) => ({ ...kopi(linje), gruppe: navn }));
  return {
    selskab: input.selskab,
    periode: { fra: input.fra, til: input.til },
    resultatlinjer: rapport.resultat.map(kopi),
    balancelinjer: [
      ...gruppe('Aktiver', rapport.balanceAktiver),
      ...gruppe('Egenkapital', rapport.egenkapital),
      ...gruppe('Gæld', rapport.gaeld),
    ],
    noter: [...rapport.noter],
  };
}

export function alleKontrollerOk(linjer: KontrolLinje[]): boolean {
  return linjer.length > 0 && linjer.every((linje) => linje.ok);
}

export function kanIndsende(kontrolOk: boolean, aarLaast = false): boolean {
  return kontrolOk === true && aarLaast === true;
}

export function udtraekSomTekst(udtraek: Udtraek): string {
  return JSON.stringify(udtraek, null, 2);
}

export function indsendelsesTekst(kontrolErOk: boolean, aarLaast = false): string {
  return kanIndsende(kontrolErOk, aarLaast)
    ? 'Filen er klar til et menneske. Programmet har ikke sendt den.'
    : 'Filen kan først gøres klar, når året er låst, og kontrollerne er grønne. Programmet har ikke sendt den.';
}
