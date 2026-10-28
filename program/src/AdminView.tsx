import { useMemo, useState } from 'react';
import {
  BOGFOERING_PRIS,
  KILDER,
  aftalebrev,
  kanStarte,
  kunderFor,
  mangler,
  naeste30,
  nyKunde,
  opkraevning,
  type Frist,
  type Kunde,
  type KundeKilde,
} from './kunde';
import { formatDato, formatKroner, parseDanskBeloeb } from './penge';

const MEDARBEJDERE = [
  { id: 'm1', navn: 'Medarbejder 1' },
  { id: 'm2', navn: 'Medarbejder 2' },
];

const KILDETEKST: Record<KundeKilde, string> = {
  dinero: 'Dinero',
  billy: 'Billy',
  economic: 'e-conomic',
  excel: 'Excel',
  saft: 'SAF-T',
};

const START: Kunde[] = [
  {
    navn: 'Eksempel Drift ApS',
    pris: BOGFOERING_PRIS,
    omfang: 'Bogføring og årsrapport klasse B',
    kilde: 'economic',
    klasse: 'B',
    foersteAar: true,
    sambeskatningskreds: '',
    bilagsloft: 80,
    aftaleGemt: true,
    medarbejderId: 'm1',
  },
  {
    navn: 'Nyt Holding ApS',
    pris: null,
    omfang: '',
    kilde: 'dinero',
    klasse: 'B',
    foersteAar: false,
    sambeskatningskreds: 'Eksempel-kreds',
    bilagsloft: null,
    aftaleGemt: false,
    medarbejderId: 'm1',
  },
  {
    navn: 'Andersen Handel ApS',
    pris: BOGFOERING_PRIS,
    omfang: 'Bogføring',
    kilde: 'billy',
    klasse: 'B',
    foersteAar: false,
    sambeskatningskreds: '',
    bilagsloft: 50,
    aftaleGemt: true,
    medarbejderId: 'm2',
  },
];

export function AdminSkærm() {
  const iDag = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [medarbejder, setMedarbejder] = useState('m1');
  const [alle, setAlle] = useState<Kunde[]>(START);
  const [valgt, setValgt] = useState(0);
  const [igang, setIgang] = useState<number[]>([]);
  const [aarsrapport, setAarsrapport] = useState(false);
  const [timer, setTimer] = useState('0');
  const [prisTekst, setPrisTekst] = useState<Record<number, string>>({});

  const mine = kunderFor(alle.map((post, indeks) => ({ ...post, indeks })), medarbejder);
  const kunde = mine.find((post) => post.indeks === valgt) ?? null;
  const frister = useMemo(() => eksempelFrister(iDag, alle.map((post) => post.navn)), [iDag, alle]);
  const naeste = kunde ? naeste30(iDag, frister.filter((frist) => frist.kunde === kunde.navn)) : [];
  const regning = opkraevning({ maaned: true, aarsrapport, timer: Number(timer.replace(',', '.')) || 0 });

  function ret(aendring: Partial<Kunde>, nulstilAftale = false) {
    if (!kunde) return;
    const { indeks, ...kort } = kunde;
    const ny: Kunde = { ...kort, ...aendring, ...(nulstilAftale ? { aftaleGemt: false, aftaletekst: undefined } : {}) };
    setAlle((nu) => nu.map((post, plads) => (plads === indeks ? ny : post)));
    if (!kanStarte(ny)) setIgang((nu) => nu.filter((plads) => plads !== indeks));
  }

  function skiftMedarbejder(id: string) {
    setMedarbejder(id);
    setValgt(alle.findIndex((post) => post.medarbejderId === id));
  }

  function tilfoej() {
    setAlle((nu) => [...nu, { ...nyKunde(medarbejder), navn: `Ny kunde ${nu.length + 1}` }]);
    setValgt(alle.length);
  }

  const kanGemme = kunde !== null && kunde.navn.trim() !== '' && kunde.pris !== null && kunde.pris > 0 && kunde.omfang.trim() !== '';
  const mangel = kunde ? mangler(kunde) : [];
  const erIgang = kunde ? igang.includes(kunde.indeks) && kanStarte(kunde) : false;

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Admin</h1>
        <p>Kundekort, frister og opkrævning. En kunde kan først sættes i gang, når prisen og omfanget er skrevet, og aftalen er gemt.</p>
      </header>

      <div className="panel">
        <h2>Medarbejder</h2>
        <label>
          Du ser kunder for
          <select value={medarbejder} onChange={(haendelse) => skiftMedarbejder(haendelse.target.value)}>
            {MEDARBEJDERE.map((post) => <option key={post.id} value={post.id}>{post.navn}</option>)}
          </select>
        </label>
        <p className="hint">Hver medarbejder ser kun sine egne kunder.</p>
      </div>

      <div className="panel">
        <h2>Kunder</h2>
        <div className="filer" role="group" aria-label="Kunder">
          {mine.map((post) => (
            <button key={post.indeks} type="button" className={post.indeks === valgt ? 'primaer' : ''} aria-pressed={post.indeks === valgt} onClick={() => setValgt(post.indeks)}>
              {post.navn.trim() || 'Uden navn'}{igang.includes(post.indeks) && kanStarte(post) ? ' · i gang' : ''}
            </button>
          ))}
          <button type="button" onClick={tilfoej}>Ny kunde</button>
        </div>
        {mine.length === 0 ? <p className="laengde">Ingen kunder endnu.</p> : null}
      </div>

      {kunde ? (
        <>
          <div className="panel">
            <h2>Kundekort</h2>
            <div className="felter to">
              <label>
                Navn
                <input value={kunde.navn} onChange={(haendelse) => ret({ navn: haendelse.target.value }, true)} />
              </label>
              <label>
                Pris om måneden, kr.
                <input
                  inputMode="decimal"
                  value={prisTekst[kunde.indeks] ?? (kunde.pris === null ? '' : formatKroner(kunde.pris))}
                  placeholder="Skriv prisen"
                  onChange={(haendelse) => {
                    setPrisTekst((nu) => ({ ...nu, [kunde.indeks]: haendelse.target.value }));
                    ret({ pris: parseDanskBeloeb(haendelse.target.value) }, true);
                  }}
                />
              </label>
              <label>
                Omfang
                <input value={kunde.omfang} placeholder="Skriv omfanget" onChange={(haendelse) => ret({ omfang: haendelse.target.value }, true)} />
              </label>
              <label>
                Kilde
                <select value={kunde.kilde} onChange={(haendelse) => ret({ kilde: haendelse.target.value as KundeKilde })}>
                  {KILDER.map((post) => <option key={post} value={post}>{KILDETEKST[post]}</option>)}
                </select>
              </label>
              <label>
                Klasse
                <select value={kunde.klasse} onChange={(haendelse) => ret({ klasse: haendelse.target.value as 'B' | 'C' })}>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </label>
              <label>
                Sambeskatningskreds
                <input value={kunde.sambeskatningskreds} placeholder="Tom, hvis ingen" onChange={(haendelse) => ret({ sambeskatningskreds: haendelse.target.value })} />
              </label>
              <label>
                Loft for bilag i 895-kroners pakken, pr. måned
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={kunde.bilagsloft ?? ''}
                  placeholder="Skriv tallet"
                  onChange={(haendelse) => ret({ bilagsloft: haendelse.target.value === '' ? null : Math.max(0, Math.floor(Number(haendelse.target.value))) }, true)}
                />
              </label>
              <label className="afkryds">
                <input type="checkbox" checked={kunde.foersteAar} onChange={(haendelse) => ret({ foersteAar: haendelse.target.checked })} />
                Første regnskabsår
              </label>
            </div>
            <div className="filer">
              <button type="button" onClick={() => { setPrisTekst((nu) => { const kopi = { ...nu }; delete kopi[kunde.indeks]; return kopi; }); ret({ pris: BOGFOERING_PRIS }, true); }}>
                Brug standardprisen {formatKroner(BOGFOERING_PRIS)} kr.
              </button>
            </div>
            <p className="hint">Loftet er et tal, du selv skriver. Programmet gætter ikke på det. Medarbejder: {MEDARBEJDERE.find((post) => post.id === kunde.medarbejderId)?.navn ?? kunde.medarbejderId}.</p>
          </div>

          <div className="panel">
            <h2>Aftale</h2>
            <pre className="aftale">{kunde.aftaleGemt && kunde.aftaletekst ? kunde.aftaletekst : aftalebrev(kunde)}</pre>
            <div className="filer">
              <button
                type="button"
                className={kunde.aftaleGemt ? '' : 'primaer'}
                disabled={!kanGemme || kunde.aftaleGemt}
                onClick={() => ret({ aftaleGemt: true, aftaletekst: aftalebrev(kunde) })}
              >
                {kunde.aftaleGemt ? 'Aftalen er gemt på kortet' : 'Gem aftalen på kortet'}
              </button>
            </div>
            {!kanGemme ? <p className="hint">Skriv navn, pris og omfang, før aftalen kan gemmes.</p> : null}
          </div>

          <div className="panel">
            <h2>Sæt i gang</h2>
            {mangel.length > 0 ? <ul className="noter">{mangel.map((tekst) => <li key={tekst}>{tekst}</li>)}</ul> : <p className="laengde">Kortet er klart.</p>}
            <div className="filer">
              <button type="button" className="primaer" disabled={!kanStarte(kunde) || erIgang} onClick={() => setIgang((nu) => [...nu, kunde.indeks])}>
                {erIgang ? 'Kunden er i gang' : 'Sæt kunden i gang'}
              </button>
            </div>
          </div>

          <div className="tabel-wrap">
            <table>
              <caption>Næste 30 dage for {kunde.navn}. {naeste.length === 0 ? 'Ingen frister.' : `${naeste.length} ${naeste.length === 1 ? 'frist' : 'frister'}.`}</caption>
              <thead>
                <tr><th>Dato</th><th>Frist</th></tr>
              </thead>
              <tbody>
                {naeste.length === 0 ? <tr><td colSpan={2}>Ingen frister de næste 30 dage.</td></tr> : naeste.map((frist) => (
                  <tr key={`${frist.dato}-${frist.tekst}`}>
                    <td>{formatDato(frist.dato)}</td>
                    <td>{frist.tekst}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h2>Opkrævning</h2>
            <div className="felter to">
              <label className="afkryds">
                <input type="checkbox" checked={aarsrapport} onChange={(haendelse) => setAarsrapport(haendelse.target.checked)} />
                Årsrapport klasse B er med
              </label>
              <label>
                Timer ud over pakken
                <input type="number" min={0} step="0.5" inputMode="decimal" value={timer} onChange={(haendelse) => setTimer(haendelse.target.value)} />
              </label>
            </div>
            <div className="tabel-wrap">
              <table>
                <caption>Beløb i kroner.</caption>
                <thead>
                  <tr><th>Linje</th><th className="tal">Kroner</th></tr>
                </thead>
                <tbody>
                  {regning.linjer.map((linje) => (
                    <tr key={linje.tekst}>
                      <td>{linje.tekst}</td>
                      <td className="tal">{formatKroner(linje.beloeb)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Sum</td>
                    <td className="tal">{formatKroner(regning.sum)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      ) : (
        <p className="laengde">Vælg en kunde eller opret en ny.</p>
      )}
    </section>
  );
}

function eksempelFrister(iDag: string, navne: string[]): Frist[] {
  const frister: Frist[] = [];
  navne.forEach((navn, indeks) => {
    frister.push(
      { kunde: navn, tekst: 'Momsangivelse', dato: plusDage(iDag, 6 + indeks) },
      { kunde: navn, tekst: 'Bankmåned lukkes', dato: plusDage(iDag, 14 + indeks) },
      { kunde: navn, tekst: 'Årsrapport til underskrift', dato: plusDage(iDag, 45) },
      { kunde: navn, tekst: 'Sidste måneds moms', dato: plusDage(iDag, -4) },
    );
  });
  return frister;
}

function plusDage(iso: string, dage: number): string {
  const [aar, maaned, dag] = iso.split('-').map(Number);
  const dato = new Date(Date.UTC(aar, maaned - 1, dag));
  dato.setUTCDate(dato.getUTCDate() + dage);
  return dato.toISOString().slice(0, 10);
}
