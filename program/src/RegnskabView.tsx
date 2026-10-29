import { useMemo, useState } from 'react';
import {
  bygRapport,
  kanSende,
  erKapitalejerlaan,
  kontiUdenLinje,
  kontrollerAar,
  medtagLedelsespateegning,
  postFindes,
  posterFraSaldobalance,
  type Poster,
  type Rapport,
  type RapportLinje,
} from './aar';
import { koerKartotek, afskrivningStemmer, type Anlaeg, type Kartotek } from './anlaeg';
import { alleKontrollerOk, indsendelsesTekst, kanIndsende } from './indsendelse';
import { bygIxbrl } from './xbrl';
import { PLIGTIGE_NOTER, bygNoter, manglendeNoter, type Note } from './noter';
import { formatDato, formatKroner, parseDanskBeloeb } from './penge';
import { BRO, HAEFTELSESTEKST, beregnSambeskatning, kontrollerSkattebro, type SambeskatningResultat, type SkatGrundlag } from './skat';
import { kontrollerRegnskabsaar, type ImportResultat, type Regnskabsaar } from './saldobalance';

const kr = (kroner: number) => Math.round(kroner * 100);

const SELSKAB = 'Eksempel Drift ApS';
const STIFTET = '2024-06-07';
const HOLDING = 'Holding';

const AAR = {
  foerste: { fra: '2024-06-07', til: '2025-08-31' },
  andet: { fra: '2025-09-01', til: '2026-08-31' },
};

const ANLAEG: Anlaeg[] = [
  { navn: 'Maskine', kostpris: kr(100_000), brugstidAar: 5, restvaerdi: 0, anskaffet: '2024-07-01', skatteafskrivning: kr(25_000) },
  { navn: 'Varebil', kostpris: kr(120_000), brugstidAar: 5, restvaerdi: kr(20_000), anskaffet: '2024-07-01', skatteafskrivning: kr(30_000) },
];

const SKAT_AAR2 = [kr(20_000), kr(24_000)];

function anlaegFor(foersteAar: boolean): Anlaeg[] {
  return foersteAar ? ANLAEG : ANLAEG.map((post, indeks) => ({ ...post, skatteafskrivning: post.skatteafskrivning + SKAT_AAR2[indeks] }));
}

function skatteafskrivningIAaret(foersteAar: boolean): number {
  return foersteAar ? ANLAEG.reduce((acc, post) => acc + post.skatteafskrivning, 0) : SKAT_AAR2.reduce((acc, tal) => acc + tal, 0);
}

export type Valg = {
  foersteAar: boolean;
  sambeskatning: boolean;
  laan: boolean;
  varelager: boolean;
  valuta: boolean;
  afviger: boolean;
  fremfoert: number;
  udbytte: number;
  overfoertManuel: number | null;
  holding: number;
  saldo: ImportResultat | null;
  saldoAar: Regnskabsaar | null;
};

type Eksempel = {
  poster: Poster[];
  anlaeg: Anlaeg[];
  kartotek: Kartotek;
  rapport: Rapport;
  noter: { noter: Note[]; fejl: string[] };
  manglende: string[];
  bogfoertAfskrivning: number;
  periode: { fra: string; til: string };
  forrigePeriode: { fra: string; til: string } | null;
  forrigeRapport: Rapport | null;
  kilde: 'eksempel' | 'saldobalance';
  foersteAarIBrug: boolean;
  stiftet: string;
  umappede: string[];
  sambeskatningResultat: SambeskatningResultat | null;
  sambeskatningFejl: string | null;
};

function byggPoster(valg: Valg, kartotek: Kartotek, forrige: Eksempel | null): Poster[] {
  const bogfoert = kartotek.aaretsAfskrivning - (valg.afviger ? kr(5_000) : 0);
  const uden: Poster[] = [
    { kontonummer: '1010', navn: 'Salg', beloeb: kr(-360_000), rolle: 'omsaetning' },
    { kontonummer: '2210', navn: 'Lønninger', beloeb: kr(80_000), rolle: 'personale' },
    { kontonummer: '3410', navn: 'Lokale', beloeb: kr(36_000), rolle: 'andre-omkostninger' },
    { kontonummer: '3610', navn: 'Stiftelsesomkostninger', beloeb: valg.foersteAar ? kr(8_000) : 0, rolle: 'stiftelse' },
    { kontonummer: '3910', navn: 'Afskrivninger', beloeb: bogfoert, rolle: 'regnskabsafskrivning' },
    { kontonummer: '5100', navn: 'Anlægsaktiver', beloeb: kartotek.ultimo, rolle: 'anlaeg' },
    { kontonummer: '7410', navn: 'Selskabskapital', beloeb: kr(-40_000), rolle: 'egenkapital' },
  ];
  if (forrige) {
    uden.push({ kontonummer: '7510', navn: 'Overført resultat', beloeb: -forrige.rapport.aaretsResultat, rolle: 'overfoert-resultat' });
    const udskudt = forrige.rapport.skat.udskudtSkat ?? 0;
    if (udskudt !== 0) uden.push({ kontonummer: '6710', navn: 'Udskudt skat', beloeb: -udskudt, rolle: 'udskudt-skat' });
  }
  if (valg.varelager) uden.push({ kontonummer: '6110', navn: 'Varelager', beloeb: kr(30_000), rolle: 'varelager' });
  if (valg.valuta) uden.push({ kontonummer: '5510', navn: 'Bank i fremmed valuta', beloeb: kr(10_000), rolle: 'valuta' });
  if (valg.laan) uden.push({ kontonummer: '6310', navn: 'Mellemregning ejer', beloeb: kr(5_000), rolle: 'mellemregning-ejer' });
  const saldo = uden.reduce((acc, post) => acc + post.beloeb, 0);
  return [...uden, { kontonummer: '5500', navn: 'Bank', beloeb: -saldo, rolle: 'bank' }];
}

export function byggEksempel(valg: Valg): Eksempel {
  const fil = valg.saldo !== null && valg.saldo.status === 'klar' ? valg.saldo : null;
  const fraFil = fil
    ? posterFraSaldobalance(fil.linjer.map((linje) => ({ kontonummer: linje.kontonummer, navn: linje.navn, beloeb: linje.beloeb ?? 0 })))
    : null;
  const aarFraFil = fil && valg.saldoAar && valg.saldoAar.fra !== '' && valg.saldoAar.til !== '' ? valg.saldoAar : null;
  const foersteAar = aarFraFil ? aarFraFil.foersteAar : valg.foersteAar;
  const stiftet = aarFraFil && aarFraFil.stiftet !== '' ? aarFraFil.stiftet : STIFTET;
  const periode = aarFraFil
    ? { fra: aarFraFil.fra, til: aarFraFil.til }
    : (fil?.filPeriode ?? (valg.foersteAar ? AAR.foerste : AAR.andet));
  const anlaeg = fil ? [] : anlaegFor(valg.foersteAar);
  const kartotek = koerKartotek(anlaeg, periode.fra, periode.til);
  const forrige = foersteAar || fil
    ? null
    : byggEksempel({ ...valg, foersteAar: true, afviger: false, laan: false, varelager: false, valuta: false, udbytte: 0, overfoertManuel: null, saldo: null });
  const poster = fraFil ? fraFil.poster : byggPoster(valg, kartotek, forrige);
  const sum = (rolle: Poster['rolle']) => poster.filter((post) => post.rolle === rolle).reduce((acc, post) => acc + post.beloeb, 0);
  const indkomstAar = Number(periode.til.slice(0, 4));
  const faelles = {
    form: 'aps' as const,
    foersteAar,
    klasseB: true,
    poster,
    skatteafskrivning: fil ? 0 : skatteafskrivningIAaret(valg.foersteAar),
    fremfoertUnderskud: valg.fremfoert,
    modregnetUnderskud: 0,
    sambeskatning: valg.sambeskatning,
    administrationsselskab: false,
    regnskabsvaerdiAnlaeg: fil ? null : kartotek.ultimo,
    skattevaerdiAnlaeg: fil ? null : kartotek.skattemaessigVaerdi,
    harSidsteAar: forrige !== null,
    udbytte: valg.udbytte,
    sidsteAarsRapport: forrige?.rapport,
    indkomstAar,
  };

  let modregnet = 0;
  let sambeskatningResultat: SambeskatningResultat | null = null;
  if (valg.sambeskatning) {
    const grundUdkast = bygRapport({ ...faelles, overfoert: 0 });
    const drift: SkatGrundlag = {
      form: 'aps',
      resultatFoerSkat: grundUdkast.skat.linjer.find((linje) => linje.tekst === BRO.resultat)?.beloeb ?? 0,
      ikkeFradrag: sum('ikke-fradrag'),
      stiftelse: sum('stiftelse'),
      skattekontoRente: sum('skattekonto-rente'),
      regnskabsafskrivning: sum('regnskabsafskrivning'),
      skatteafskrivning: faelles.skatteafskrivning,
      fremfoertUnderskud: valg.fremfoert,
      modregnetUnderskud: 0,
      sambeskatning: true,
      administrationsselskab: false,
      regnskabsvaerdiAnlaeg: faelles.regnskabsvaerdiAnlaeg,
      skattevaerdiAnlaeg: faelles.skattevaerdiAnlaeg,
      indkomstAar,
    };
    const holding: SkatGrundlag = {
      form: 'aps',
      resultatFoerSkat: valg.holding,
      ikkeFradrag: 0,
      stiftelse: 0,
      skattekontoRente: 0,
      regnskabsafskrivning: 0,
      skatteafskrivning: 0,
      fremfoertUnderskud: 0,
      modregnetUnderskud: 0,
      sambeskatning: true,
      administrationsselskab: true,
      regnskabsvaerdiAnlaeg: null,
      skattevaerdiAnlaeg: null,
      indkomstAar,
    };
    sambeskatningResultat = beregnSambeskatning([
      { navn: SELSKAB, grundlag: drift },
      { navn: HOLDING, grundlag: holding },
    ]);
    if (sambeskatningResultat.fejl === null) {
      const egen = sambeskatningResultat.selskaber.find((selskab) => !selskab.administrationsselskab);
      const modregnetLinje = egen?.linjer.find((linje) => linje.tekst === BRO.modregnet);
      const afgivetLinje = egen?.linjer.find((linje) => linje.tekst === BRO.afgivet);
      modregnet = modregnetLinje ? -modregnetLinje.beloeb : (afgivetLinje?.beloeb ?? 0);
    }
  }

  const udkast = bygRapport({ ...faelles, modregnetUnderskud: modregnet, overfoert: 0 });
  const overfoert = valg.overfoertManuel ?? udkast.aaretsResultat - valg.udbytte;
  const rapport = bygRapport({ ...faelles, modregnetUnderskud: modregnet, overfoert });

  const mellemregning = sum('mellemregning-ejer');
  const egenkapitalUltimo = rapport.egenkapital.reduce((acc, linje) => acc + linje.beloeb, 0);
  const noter = bygNoter({
    personale: sum('personale'),
    anlaegIBalancen: sum('anlaeg'),
    anlaegIKartotek: kartotek.ultimo,
    sambeskatning: valg.sambeskatning,
    form: 'aps',
    kartotek,
    udskudtSkat: rapport.skat.udskudtSkat,
    kapitalejerlaan: mellemregning > 0 ? mellemregning : 0,
    egenkapital: {
      primo: -(sum('egenkapital') + sum('overfoert-resultat')),
      bevaegelser: [{ tekst: 'Årets resultat', beloeb: rapport.aaretsResultat }],
      ultimo: egenkapitalUltimo,
    },
  });
  return {
    poster,
    anlaeg,
    kartotek,
    rapport,
    noter,
    manglende: manglendeNoter(rapport.notePoster, noter.noter),
    bogfoertAfskrivning: sum('regnskabsafskrivning'),
    periode,
    forrigePeriode: forrige ? forrige.periode : null,
    forrigeRapport: forrige ? forrige.rapport : null,
    kilde: fil ? 'saldobalance' : 'eksempel',
    foersteAarIBrug: foersteAar,
    stiftet,
    umappede: fraFil ? fraFil.umappede : [],
    sambeskatningResultat,
    sambeskatningFejl: sambeskatningResultat?.fejl ?? null,
  };
}

export type RegnskabModel = ReturnType<typeof useRegnskab>;

export function useRegnskab(aarLaast = false, saldo: ImportResultat | null = null, saldoAar: Regnskabsaar | null = null) {
  const [foersteAar, setFoersteAar] = useState(true);
  const [sambeskatning, setSambeskatning] = useState(false);
  const [laan, setLaan] = useState(false);
  const [varelager, setVarelager] = useState(false);
  const [valuta, setValuta] = useState(false);
  const [afviger, setAfviger] = useState(false);
  const [fremfoert, setFremfoert] = useState('0,00');
  const [udbytte, setUdbytte] = useState('0,00');
  const [overfoert, setOverfoert] = useState<string | null>(null);
  const [afklaring, setAfklaring] = useState('');
  const [varelagerBekaertet, setVarelagerBekaertet] = useState(false);
  const [valutaKursSat, setValutaKursSat] = useState(false);
  const [holdingResultat, setHoldingResultat] = useState('0,00');

  const eksempel = useMemo(
    () =>
      byggEksempel({
        foersteAar,
        sambeskatning,
        laan,
        varelager,
        valuta,
        afviger,
        fremfoert: parseDanskBeloeb(fremfoert) ?? 0,
        udbytte: parseDanskBeloeb(udbytte) ?? 0,
        overfoertManuel: overfoert === null ? null : (parseDanskBeloeb(overfoert) ?? 0),
        holding: parseDanskBeloeb(holdingResultat) ?? 0,
        saldo,
        saldoAar,
      }),
    [foersteAar, sambeskatning, laan, varelager, valuta, afviger, fremfoert, udbytte, overfoert, holdingResultat, saldo, saldoAar],
  );

  const medLaas = <T,>(saet: (vaerdi: T) => void) => (vaerdi: T) => {
    if (!aarLaast) saet(vaerdi);
  };

  return {
    ...eksempel,
    udbytteOere: parseDanskBeloeb(udbytte) ?? 0,
    foersteAar: eksempel.foersteAarIBrug, setFoersteAar: medLaas(setFoersteAar),
    sambeskatning, setSambeskatning: medLaas(setSambeskatning),
    laan, setLaan: medLaas(setLaan),
    varelager, setVarelager: medLaas(setVarelager),
    valuta, setValuta: medLaas(setValuta),
    afviger, setAfviger: medLaas(setAfviger),
    fremfoert, setFremfoert: medLaas(setFremfoert),
    udbytte, setUdbytte: medLaas(setUdbytte),
    overfoert, setOverfoert: medLaas(setOverfoert),
    afklaring, setAfklaring: medLaas(setAfklaring),
    varelagerBekaertet, setVarelagerBekaertet: medLaas(setVarelagerBekaertet),
    valutaKursSat, setValutaKursSat: medLaas(setValutaKursSat),
    holdingResultat, setHoldingResultat: medLaas(setHoldingResultat),
  };
}

const BERETNING_UDKAST = [
  'Selskabets hovedaktivitet er bogføring og rådgivning.',
  'Året har udviklet sig som forventet. Resultatet er fordelt som vist i årsregnskabet.',
  'Der er ikke indtruffet forhold efter balancedagen, som ændrer vurderingen af årsrapporten.',
].join('\n');

export type KontrolResultat = ReturnType<typeof kontrollerAar>;

export function beregnKontrol(
  model: RegnskabModel,
  udefra: { bankLukket: boolean; momsStemmer: boolean; saldo: ImportResultat | null },
): KontrolResultat {
  const { rapport, poster } = model;
  const eksempelSum = poster.reduce((acc, post) => acc + post.beloeb, 0);
  const mellemregning = poster.filter((post) => post.rolle === 'mellemregning-ejer').reduce((acc, post) => acc + post.beloeb, 0);
  const brodfejl = kontrollerSkattebro(rapport.skat);
  const aar: Regnskabsaar = { stiftet: model.stiftet, fra: model.periode.fra, til: model.periode.til, foersteAar: model.foersteAar };
  return kontrollerAar({
    form: 'aps',
    saldoSum: udefra.saldo?.sum ?? eksempelSum,
    saldobalanceGodkendt: udefra.saldo ? udefra.saldo.status === 'klar' : eksempelSum === 0,
    disponeringRest: rapport.disponeringRest,
    udbytte: model.udbytteOere,
    momsStemmer: udefra.momsStemmer,
    bankLukket: udefra.bankLukket,
    skatFejl: model.sambeskatningFejl ?? rapport.skat.fejl ?? (brodfejl.length > 0 ? brodfejl.join(' ') : null),
    mellemregningEjer: mellemregning,
    afklaring: model.afklaring,
    varelagerFindes: postFindes(poster, 'varelager'),
    varelagerBekaertet: model.varelagerBekaertet,
    valutaFindes: postFindes(poster, 'valuta'),
    valutaKursSat: model.valutaKursSat,
    sambeskatning: model.sambeskatning,
    haeftelsesnoteMed: model.noter.noter.some((note) => note.titel === PLIGTIGE_NOTER.sambeskatning && note.tekst === HAEFTELSESTEKST),
    anlaegFindes: model.kartotek.linjer.length > 0 || poster.some((post) => post.rolle === 'anlaeg' || post.rolle === 'regnskabsafskrivning'),
    afskrivningStemmer: afskrivningStemmer(model.kartotek.aaretsAfskrivning, model.bogfoertAfskrivning),
    balanceForskel: rapport.balanceForskel,
    manglendeNoter: model.manglende,
    regnskabsaarFejl: kontrollerRegnskabsaar(aar),
    kontiUdenLinje: [...kontiUdenLinje(rapport, poster), ...model.umappede],
  });
}

export function Regnskab({ model, kontrol, aarLaast }: { model: RegnskabModel; kontrol: KontrolResultat; aarLaast: boolean }) {
  const { rapport } = model;
  const [beretning, setBeretning] = useState(BERETNING_UDKAST);
  const [godkendt, setGodkendt] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [ledelse, setLedelse] = useState(1);
  const brodfejl = kontrollerSkattebro(rapport.skat);
  const maaSende = kanSende(godkendt) && alleKontrollerOk(kontrol.linjer) && aarLaast;

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Årsregnskab</h1>
        <p>
          {SELSKAB} · {formatDato(model.periode.fra)}–{formatDato(model.periode.til)}.{' '}
          {model.kilde === 'saldobalance'
            ? 'Tallene kommer fra den godkendte saldobalance og er regnet ud.'
            : 'Tallene er et eksempel. Godkend en saldobalance under Saldobalance for at bruge egne tal.'}
          {rapport.sammenligning ? ' Sidste år står i egen kolonne.' : ' Det er første år, så der er ingen kolonne til sidste år.'}
        </p>
      </header>

      {aarLaast ? <p className="banner klar" role="status">Året er låst. Tallene kan ikke rettes.</p> : null}

      <fieldset disabled={aarLaast}>
        <Indstillinger model={model} />
      </fieldset>

      {rapport.fejl.length > 0 ? (
        <div className="banner stop" role="alert">
          <ul>{rapport.fejl.map((fejl) => <li key={fejl}>{fejl}</li>)}</ul>
        </div>
      ) : null}

      <Linjetabel titel="Resultat" linjer={rapport.resultat} sammenligning={rapport.sammenligning} />
      <Skattebro model={model} fejl={brodfejl} />
      <Sambeskatning model={model} />
      <Linjetabel titel="Aktiver" linjer={rapport.balanceAktiver} sammenligning={rapport.sammenligning} />
      <Linjetabel titel="Egenkapital" linjer={rapport.egenkapital} sammenligning={rapport.sammenligning} />
      <Linjetabel titel="Gæld" linjer={rapport.gaeld} sammenligning={rapport.sammenligning} />

      <div className="panel">
        <h2>Noter</h2>
        {model.noter.noter.length === 0 ? <p className="laengde">Ingen noter er pligtige endnu.</p> : model.noter.noter.map((note) => (
          <NoteVisning key={note.titel} note={note} />
        ))}
        {model.noter.fejl.length > 0 ? (
          <ul className="noter">{model.noter.fejl.map((fejl) => <li key={fejl}>{fejl}</li>)}</ul>
        ) : null}
      </div>

      <div className="panel">
        <h2>Ledelsesberetning</h2>
        <p className="hint">Udkast. Ledelsen læser og godkender teksten, før den bruges.</p>
        <label>
          Udkast til tekst
          <textarea
            rows={5}
            value={beretning}
            onChange={(haendelse) => {
              setBeretning(haendelse.target.value);
              setGodkendt(false);
              setSendt(false);
            }}
          />
        </label>
        <label className="afkryds">
          <input type="checkbox" checked={godkendt} onChange={(haendelse) => { setGodkendt(haendelse.target.checked); setSendt(false); }} />
          Ledelsen har godkendt udkastet
        </label>
        <div className="filer">
          <button type="button" className="primaer" disabled={!maaSende} onClick={() => setSendt(true)}>Send</button>
        </div>
        {!maaSende ? <p className="hint">Send er slukket, til ledelsen har godkendt udkastet, kontrollerne er grønne, og året er låst.</p> : null}
        {sendt ? <p className="banner klar" role="status">Udkastet er sendt videre til underskrift. Programmet har ikke indberettet noget.</p> : null}
      </div>

      <div className="panel">
        <h2>Ledelsen</h2>
        <label>
          Antal medlemmer af ledelsen
          <input
            type="number"
            min={1}
            value={ledelse}
            onChange={(haendelse) => setLedelse(Math.max(1, Math.floor(Number(haendelse.target.value) || 1)))}
          />
        </label>
        {medtagLedelsespateegning(ledelse) ? (
          <div>
            <h3>Ledelsespåtegning</h3>
            <p className="laengde">
              Direktionen og bestyrelsen har dags dato behandlet og godkendt årsrapporten for {SELSKAB} for perioden{' '}
              {formatDato(model.periode.fra)}–{formatDato(model.periode.til)}. Årsrapporten er aflagt i overensstemmelse med årsregnskabsloven.
            </p>
          </div>
        ) : (
          <p className="hint">Med ét medlem er der ingen ledelsespåtegning.</p>
        )}
      </div>
    </section>
  );
}

export function Kontrol({
  model,
  kontrol,
  aarLaast,
  onLaas,
}: {
  model: RegnskabModel;
  kontrol: KontrolResultat;
  aarLaast: boolean;
  onLaas: () => void;
}) {
  const { rapport } = model;
  const [cvr, setCvr] = useState('');
  const [bedt, setBedt] = useState(false);
  const mellemregning = model.poster.filter((post) => post.rolle === 'mellemregning-ejer').reduce((acc, post) => acc + post.beloeb, 0);
  const udenLinje = [...kontiUdenLinje(rapport, model.poster), ...model.umappede];
  const alleOk = alleKontrollerOk(kontrol.linjer);
  const erLaan = erKapitalejerlaan('aps', mellemregning);
  const klarTilFil = kanIndsende(alleOk, aarLaast);
  const ixbrl = useMemo(() => {
    if (!bedt || !klarTilFil) return null;
    const sum = (linjer: RapportLinje[]) => linjer.reduce((acc, linje) => acc + linje.beloeb, 0);
    const forrige = model.forrigeRapport;
    const egenkapital = sum(rapport.egenkapital);
    return bygIxbrl({
      selskab: SELSKAB,
      cvr,
      fra: model.periode.fra,
      til: model.periode.til,
      foersteAar: model.foersteAar,
      profitLossOere: rapport.aaretsResultat,
      assetsOere: sum(rapport.balanceAktiver),
      equityOere: egenkapital,
      liabilitiesAndEquityOere: egenkapital + sum(rapport.gaeld),
      ...(rapport.sammenligning && forrige && model.forrigePeriode
        ? {
            sidsteAar: {
              fra: model.forrigePeriode.fra,
              til: model.forrigePeriode.til,
              profitLossOere: forrige.aaretsResultat,
              assetsOere: sum(forrige.balanceAktiver),
              equityOere: sum(forrige.egenkapital),
              liabilitiesAndEquityOere: sum(forrige.egenkapital) + sum(forrige.gaeld),
            },
          }
        : {}),
    });
  }, [bedt, klarTilFil, cvr, model.periode, model.foersteAar, model.forrigePeriode, model.forrigeRapport, rapport]);

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Kontrol</h1>
        <p>Året låser, når alle linjer er grønne. En rød linje slukker for låsen. En fælde, kunden ikke har, bliver ikke spurgt om.</p>
      </header>

      {aarLaast ? <p className="banner klar" role="status">Året er låst. Tallene kan ikke rettes.</p> : null}

      <fieldset disabled={aarLaast}>
      <Indstillinger model={model} />

      <div className="panel">
        <h2>Fordeling af årets resultat</h2>
        <p className="hint">Årets resultat er {formatKroner(rapport.aaretsResultat)} kr. Det skal fordeles helt på overført resultat og foreslået udbytte.</p>
        <div className="felter to">
          <label>
            Overført resultat
            <input value={model.overfoert ?? formatKroner(rapport.aaretsResultat - (parseDanskBeloeb(model.udbytte) ?? 0))} onChange={(haendelse) => model.setOverfoert(haendelse.target.value)} inputMode="decimal" />
          </label>
          <label>
            Foreslået udbytte
            <input value={model.udbytte} onChange={(haendelse) => model.setUdbytte(haendelse.target.value)} inputMode="decimal" />
          </label>
        </div>
        <div className="filer">
          <button type="button" onClick={() => model.setOverfoert(null)} disabled={model.overfoert === null}>Fordel resten på overført resultat</button>
        </div>
      </div>

      <div className="panel">
        <h2>Det, kunden har</h2>
        <p className="hint">
          {model.kilde === 'saldobalance'
            ? 'Med en godkendt saldobalance kommer varelager, valuta og lån fra kontiene i filen. Valgene her er kun til eksemplet.'
            : 'Kun det, der findes, får en kontrollinje.'}
        </p>
        <fieldset disabled={model.kilde === 'saldobalance'} className="uden-ramme">
        <div className="felter tre">
          <label className="afkryds">
            <input type="checkbox" checked={model.laan} onChange={(haendelse) => model.setLaan(haendelse.target.checked)} />
            Debetsaldo på mellemregning med ejer
          </label>
          <label className="afkryds">
            <input type="checkbox" checked={model.varelager} onChange={(haendelse) => model.setVarelager(haendelse.target.checked)} />
            Varelager
          </label>
          <label className="afkryds">
            <input type="checkbox" checked={model.valuta} onChange={(haendelse) => model.setValuta(haendelse.target.checked)} />
            Konto i fremmed valuta
          </label>
        </div>
        </fieldset>
        {erLaan ? (
          <label className="afklaring">
            Afklaring af kapitalejerlånet
            <textarea value={model.afklaring} onChange={(haendelse) => model.setAfklaring(haendelse.target.value)} placeholder="Skriv afklaringen" />
          </label>
        ) : null}
        {postFindes(model.poster, 'varelager') ? (
          <label className="afkryds">
            <input type="checkbox" checked={model.varelagerBekaertet} onChange={(haendelse) => model.setVarelagerBekaertet(haendelse.target.checked)} />
            Varelageret er talt op og passer
          </label>
        ) : null}
        {postFindes(model.poster, 'valuta') ? (
          <label className="afkryds">
            <input type="checkbox" checked={model.valutaKursSat} onChange={(haendelse) => model.setValutaKursSat(haendelse.target.checked)} />
            Lukkekursen på balancedagen er sat
          </label>
        ) : null}
      </div>
      </fieldset>

      <ul className="kontrol" aria-label="Kontrollinjer">
        {kontrol.linjer.map((linje) => (
          <li key={linje.navn} className={linje.ok ? 'klar' : 'stop'}>
            <strong>{linje.ok ? '✓' : '✕'} {linje.navn}</strong>
            <span>{linje.tekst}</span>
          </li>
        ))}
      </ul>
      {udenLinje.length > 0 ? <p className="banner stop">Konti uden linje i rapporten: {udenLinje.join(', ')}.</p> : null}
      <p className="hint">Bank og moms følger Bogføring. Lukkes måneden dér, bliver de to linjer grønne.</p>

      <div className="filer">
        <button type="button" className="primaer" disabled={!kontrol.kanLaase || aarLaast} onClick={onLaas}>Lås året</button>
      </div>
      {aarLaast ? <p className="laengde">Året er låst.</p> : null}

      <div className="panel">
        <h2>Fil til indsendelse</h2>
        <p className="laengde">{indsendelsesTekst(alleOk, aarLaast)}</p>
        <p className="hint">Filen er et udtræk til Erhvervsstyrelsen. Et menneske sender den. Programmet har ikke sendt den.</p>
        <label>
          CVR-nummer (8 cifre)
          <input
            value={cvr}
            onChange={(haendelse) => { setCvr(haendelse.target.value.replace(/[^\d\s]/g, '').slice(0, 11)); setBedt(false); }}
            inputMode="numeric"
            autoComplete="off"
            aria-label="CVR-nummer"
          />
        </label>
        <div className="filer">
          <button type="button" className="primaer" disabled={!kanIndsende(alleOk, aarLaast)} onClick={() => setBedt(true)}>
            Gør filen klar
          </button>
        </div>
        {ixbrl && ixbrl.fejl ? <p className="banner stop" role="alert">{ixbrl.fejl}</p> : null}
        {ixbrl && ixbrl.xml ? (
          <>
            <p className="banner klar" role="status">Filen er klar til et menneske. Programmet har ikke sendt den.</p>
            <div className="filer">
              <a className="filknap primaer" href={`data:application/xhtml+xml;charset=utf-8,${encodeURIComponent(ixbrl.xml)}`} download="aarsrapport.xhtml">
                Hent aarsrapport.xhtml
              </a>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}

function Indstillinger({ model }: { model: RegnskabModel }) {
  return (
    <div className="panel">
      <h2>Regnskabsår</h2>
      <div className="felter to">
        <label className="afkryds">
          <input type="checkbox" checked={model.foersteAar} disabled={model.kilde === 'saldobalance'} onChange={(haendelse) => model.setFoersteAar(haendelse.target.checked)} />
          Første regnskabsår
        </label>
        <label className="afkryds">
          <input type="checkbox" checked={model.sambeskatning} onChange={(haendelse) => model.setSambeskatning(haendelse.target.checked)} />
          Indgår i sambeskatning
        </label>
        <label>
          Fremført underskud fra tidligere år
          <input value={model.fremfoert} onChange={(haendelse) => model.setFremfoert(haendelse.target.value)} inputMode="decimal" />
        </label>
      </div>
      {model.sambeskatning ? (
        <label>
          Holdingens resultat før skat
          <input value={model.holdingResultat} onChange={(haendelse) => model.setHoldingResultat(haendelse.target.value)} inputMode="decimal" />
          <span className="hint">Det regnskabsmæssige tal fra holdingens egen bogføring. Det er ikke et skattemæssigt tal.</span>
        </label>
      ) : null}
      <p className="laengde">
        {formatDato(model.periode.fra)}–{formatDato(model.periode.til)}. Skat, udskudt skat og sambeskatningsbidrag bliver regnet ud. De kan ikke tastes. Modregnet underskud ved sambeskatning kommer af selskabernes resultater.
      </p>
    </div>
  );
}

function Sambeskatning({ model }: { model: RegnskabModel }) {
  if (!model.sambeskatning) return null;
  if (model.sambeskatningFejl !== null) {
    return <p className="banner stop" role="alert">{model.sambeskatningFejl} Året kan ikke låses.</p>;
  }
  const resultat = model.sambeskatningResultat;
  if (resultat === null) return null;
  const poster = resultat.selskaber.flatMap((selskab) => selskab.balanceposter.map((post) => ({ ...post, selskab: selskab.navn })));
  return (
    <div className="tabel-wrap">
      <table>
        <caption>Balanceposter fra sambeskatningen. Beløbene er regnet ud og kan ikke tastes.</caption>
        <thead>
          <tr><th>Selskab</th><th>Post</th><th>Modpart</th><th className="tal">Kroner</th></tr>
        </thead>
        <tbody>
          {poster.length === 0 ? (
            <tr><td colSpan={4}>Ingen skat at betale i kredsen.</td></tr>
          ) : poster.map((post) => (
            <tr key={`${post.selskab}-${post.tekst}-${post.modpart}`}>
              <td>{post.selskab}</td>
              <td>{post.tekst}</td>
              <td>{post.modpart}</td>
              <td className="tal">{formatKroner(post.beloeb)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Skattebro({ model, fejl }: { model: RegnskabModel; fejl: string[] }) {
  const { skat } = model.rapport;
  if (skat.linjer.length === 0) return null;
  const udskudt = skat.udskudtSkat;
  return (
    <div className="tabel-wrap">
      <table>
        <caption>
          Skattebroen er regnet ud af resultatet. {fejl.length === 0 ? 'Trinene går op.' : fejl.join(' ')}
          {udskudt !== null && udskudt !== 0 ? ` Udskudt skat ${formatKroner(udskudt)} kr. kommer af forskellen mellem bogført og skattemæssig værdi.` : ''}
          {model.sambeskatning ? ' Bidraget til administrationsselskabet står som en beregnet linje i resultatet.' : ''}
        </caption>
        <thead>
          <tr><th>Skattebro</th><th className="tal">Kroner</th></tr>
        </thead>
        <tbody>
          {skat.linjer.map((linje) => (
            <tr key={linje.tekst}>
              <td>{linje.tekst}</td>
              <td className="tal">{formatKroner(linje.beloeb)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Linjetabel({ titel, linjer, sammenligning }: { titel: string; linjer: RapportLinje[]; sammenligning: boolean }) {
  if (linjer.length === 0) return null;
  return (
    <div className="tabel-wrap">
      <table>
        <thead>
          <tr>
            <th>{titel}</th>
            <th className="tal">Dette år</th>
            {sammenligning ? <th className="tal">Sidste år</th> : null}
          </tr>
        </thead>
        <tbody>
          {linjer.map((linje) => (
            <tr key={linje.tekst}>
              <td>{linje.tekst}{linje.beregnet ? <span className="filnavn"> · beregnet</span> : null}</td>
              <td className="tal">{formatKroner(linje.beloeb)}</td>
              {sammenligning ? <td className="tal">{linje.sidsteAar === undefined ? '—' : formatKroner(linje.sidsteAar)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NoteVisning({ note }: { note: Note }) {
  return (
    <div>
      <h3>{note.titel}</h3>
      <p className="laengde">{note.tekst}</p>
      {note.linjer && note.linjer.length > 0 ? (
        <div className="tabel-wrap">
          <table>
            <tbody>
              {note.linjer.map((linje) => (
                <tr key={linje.tekst}>
                  <td>{linje.tekst}</td>
                  <td className="tal">{formatKroner(linje.beloeb)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
