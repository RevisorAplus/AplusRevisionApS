import { useEffect, useMemo, useState } from 'react';
import { AdminSkærm } from './AdminView';
import { AnlaegSkærm } from './AnlaegView';
import { BilagSkærm } from './BilagView';
import { Bogfoering, Moms, momsKontrol } from './BogfoeringView';
import { ImportSkærm } from './ImportView';
import { Kontrol, Regnskab, beregnKontrol, useRegnskab } from './RegnskabView';
import { SpecifikationSkærm } from './SpecifikationView';
import { formatDato, formatKroner, kalenderMaaneder } from './penge';
import { indlaesSaldobalance, kontrollerRegnskabsaar, type ImportResultat, type Regnskabsaar } from './saldobalance';
import type { Banklinje } from './bank';
import type { LaastPeriode } from './laas';

type Skærm =
  | 'bogfoering'
  | 'bilag'
  | 'import'
  | 'moms'
  | 'anlaeg'
  | 'aarsregnskab'
  | 'kontrol'
  | 'specifikation'
  | 'admin'
  | 'saldobalance';

const SKAERME: { id: Skærm; label: string }[] = [
  { id: 'bogfoering', label: 'Bogføring' },
  { id: 'bilag', label: 'Bilag' },
  { id: 'import', label: 'Import' },
  { id: 'moms', label: 'Moms' },
  { id: 'anlaeg', label: 'Anlæg' },
  { id: 'aarsregnskab', label: 'Årsregnskab' },
  { id: 'kontrol', label: 'Kontrol' },
  { id: 'specifikation', label: 'Specifikation' },
  { id: 'admin', label: 'Admin' },
  { id: 'saldobalance', label: 'Saldobalance' },
];

const TOM: Regnskabsaar = { stiftet: '', fra: '', til: '', foersteAar: true };

function laastePerioder(linjer: Banklinje[], laast: boolean): LaastPeriode[] {
  const datoer = linjer.map((linje) => linje.dato).filter((dato) => dato !== '').sort();
  if (!laast || datoer.length === 0) return [];
  const foerste = datoer[0];
  const sidste = datoer[datoer.length - 1];
  const [aar, maaned] = sidste.split('-').map(Number);
  const slut = new Date(Date.UTC(aar, maaned, 0)).getUTCDate();
  return [{ fra: `${foerste.slice(0, 7)}-01`, til: `${sidste.slice(0, 7)}-${String(slut).padStart(2, '0')}` }];
}

function App() {
  const [skaerm, setSkaerm] = useState<Skærm>('bogfoering');
  const [linjer, setLinjer] = useState<Banklinje[]>([]);
  const [maanedLaast, setMaanedLaast] = useState(false);
  const [momskonto, setMomskonto] = useState(0);
  const [aarLaast, setAarLaast] = useState(false);
  const [saldo, setSaldo] = useState<ImportResultat | null>(null);
  const model = useRegnskab(aarLaast);
  const laaste = useMemo<LaastPeriode[]>(
    () => [...laastePerioder(linjer, maanedLaast), ...(aarLaast ? [{ fra: model.periode.fra, til: model.periode.til }] : [])],
    [linjer, maanedLaast, aarLaast, model.periode.fra, model.periode.til],
  );
  const kontrol = beregnKontrol(model, { bankLukket: maanedLaast, momsStemmer: momsKontrol(linjer, momskonto), saldo });

  const vis = (id: Skærm) => ({ hidden: skaerm !== id });

  return (
    <main className="app">
      <div className="brand">
        <strong>Programmet</strong>
        <span>Bogføring og årsregnskab</span>
      </div>
      <nav className="menu" aria-label="Sektioner">
        {SKAERME.map((punkt) => (
          <button key={punkt.id} type="button" aria-current={skaerm === punkt.id ? 'page' : undefined} onClick={() => setSkaerm(punkt.id)}>
            {punkt.label}
          </button>
        ))}
      </nav>
      <div {...vis('bogfoering')}><Bogfoering linjer={linjer} laast={maanedLaast} momskonto={momskonto} onLinjer={setLinjer} onMomskonto={setMomskonto} onLaast={setMaanedLaast} /></div>
      <div {...vis('bilag')}><BilagSkærm laaste={laaste} /></div>
      <div {...vis('import')}><ImportSkærm laaste={laaste} /></div>
      <div {...vis('moms')}><Moms linjer={linjer} laast={maanedLaast} momskonto={momskonto} /></div>
      <div {...vis('anlaeg')}><AnlaegSkærm model={model} aarLaast={aarLaast} /></div>
      <div {...vis('aarsregnskab')}><Regnskab model={model} kontrol={kontrol} aarLaast={aarLaast} /></div>
      <div {...vis('kontrol')}><Kontrol model={model} kontrol={kontrol} aarLaast={aarLaast} onLaas={() => { if (kontrol.kanLaase) setAarLaast(true); }} /></div>
      <div {...vis('specifikation')}><SpecifikationSkærm /></div>
      <div {...vis('admin')}><AdminSkærm /></div>
      <div {...vis('saldobalance')}><SaldobalanceSkærm onResultat={setSaldo} /></div>
    </main>
  );
}

function SaldobalanceSkærm({ onResultat }: { onResultat: (resultat: ImportResultat | null) => void }) {
  const [aar, setAar] = useState<Regnskabsaar>(TOM);
  const [tekst, setTekst] = useState('');
  const [filnavn, setFilnavn] = useState('');

  const resultat = useMemo(() => (tekst.trim() ? indlaesSaldobalance(tekst, aar) : null), [tekst, aar]);
  useEffect(() => onResultat(resultat), [resultat, onResultat]);
  const aarFejl = aar.stiftet || aar.fra || aar.til ? kontrollerRegnskabsaar(aar) : [];
  const viserPrimos = resultat?.linjer.some((linje) => linje.primo !== null || linje.periode !== null || linje.ultimo !== null) ?? false;

  function saetDato(felt: 'stiftet' | 'fra' | 'til', vaerdi: string) {
    setAar((nu) => {
      const naeste = { ...nu, [felt]: vaerdi };
      if (naeste.foersteAar && felt === 'stiftet') naeste.fra = vaerdi;
      if (naeste.foersteAar && felt === 'fra') naeste.stiftet = vaerdi;
      return naeste;
    });
  }

  async function hentEksempel(fil: string) {
    const svar = await fetch(`/fixtures/${fil}`);
    const indhold = await svar.text();
    setAar({ stiftet: '2024-06-07', fra: '2024-06-07', til: '2025-08-31', foersteAar: true });
    setTekst(indhold);
    setFilnavn(fil);
  }

  async function laesFil(fil: File) {
    setTekst(await fil.text());
    setFilnavn(fil.name);
  }

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Saldobalance</h1>
        <p>
          Saldobalancen er årets tal. Udtrækket skal dække hele regnskabsåret, også når første år er længere end 12 måneder.
          Hver konto bliver stående, også når den ikke er placeret endnu.
        </p>
      </header>

      <section className="panel">
        <h2>Regnskabsår</h2>
        <div className="felter">
          <label>
            Stiftet
            <input type="date" value={aar.stiftet} onChange={(haendelse) => saetDato('stiftet', haendelse.target.value)} />
          </label>
          <label>
            Fra
            <input type="date" value={aar.fra} onChange={(haendelse) => saetDato('fra', haendelse.target.value)} />
          </label>
          <label>
            Til
            <input type="date" value={aar.til} onChange={(haendelse) => saetDato('til', haendelse.target.value)} />
          </label>
          <label className="afkryds">
            <input
              type="checkbox"
              checked={aar.foersteAar}
              onChange={(haendelse) => setAar((nu) => ({ ...nu, foersteAar: haendelse.target.checked, fra: haendelse.target.checked ? nu.stiftet || nu.fra : nu.fra }))}
            />
            Første år
          </label>
        </div>
        {aar.fra && aar.til && aar.fra <= aar.til ? (
          <p className="laengde">
            {formatDato(aar.fra)}–{formatDato(aar.til)} · {kalenderMaaneder(aar.fra, aar.til)} kalendermåneder
            {aar.foersteAar ? ' · første år kan vare op til 18 måneder' : ''}
          </p>
        ) : null}
        <div className="filer">
          <label className="filknap primaer">
            Vælg fil
            <input
              className="skjult"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(haendelse) => {
                const fil = haendelse.target.files?.[0];
                if (fil) void laesFil(fil);
              }}
            />
          </label>
          <span className="filnavn">{filnavn || 'Ingen fil valgt'}</span>
          <button type="button" onClick={() => void hentEksempel('hele-aaret.csv')}>Eksempel: hele året</button>
          <button type="button" onClick={() => void hentEksempel('for-kort-periode.csv')}>Eksempel: for kort udtræk</button>
        </div>
      </section>

      {!resultat && aarFejl.length > 0 ? (
        <section className="banner stop" aria-live="polite">
          <strong>Regnskabsåret kan ikke bruges.</strong>
          <ul>
            {aarFejl.map((fejl) => <li key={fejl}>{fejl}</li>)}
          </ul>
        </section>
      ) : null}

      {resultat ? <Resultat resultat={resultat} filnavn={filnavn} viserPrimos={viserPrimos} /> : null}
    </section>
  );
}

function Resultat({
  resultat,
  filnavn,
  viserPrimos,
}: {
  resultat: ReturnType<typeof indlaesSaldobalance>;
  filnavn: string;
  viserPrimos: boolean;
}) {
  const klar = resultat.status === 'klar';
  return (
    <>
      <section className={`banner ${klar ? 'klar' : 'stop'}`} aria-live="polite">
        <strong>
          {klar
            ? `Alle ${resultat.linjer.length} konti er med. Summen er 0,00 kr.`
            : 'Tallene er ikke godkendt som regnskabsåret.'}
        </strong>
        {resultat.aarsager.length > 0 ? (
          <ul>
            {resultat.aarsager.map((fejl) => <li key={fejl}>{fejl}</li>)}
          </ul>
        ) : (
          <p>Ingen konto er sprunget over.</p>
        )}
      </section>
      {resultat.noter.length > 0 ? (
        <ul className="noter">
          {resultat.noter.map((note) => <li key={note}>{note}</li>)}
        </ul>
      ) : null}
      <div className="tabel-wrap">
        <table>
          <caption>
            {filnavn ? `${filnavn}. ` : ''}
            {resultat.linjer.length} konti i filen.
            {resultat.sum === null ? '' : ` Sum ${formatKroner(resultat.sum)} kr.`}
            {klar ? ' Godkendt.' : ' Ikke godkendt.'}
          </caption>
          <thead>
            <tr>
              <th>Konto</th>
              <th>Navn</th>
              {viserPrimos ? <th className="tal">Primo</th> : null}
              {viserPrimos ? <th className="tal">Periode</th> : null}
              {viserPrimos ? <th className="tal">Ultimo</th> : null}
              <th className="tal">Beløb</th>
            </tr>
          </thead>
          <tbody>
            {resultat.linjer.map((linje) => (
              <tr key={`${linje.kildelinje}-${linje.kontonummer}`}>
                <td>{linje.kontonummer}</td>
                <td>{linje.navn}</td>
                {viserPrimos ? <td className="tal">{vis(linje.primo)}</td> : null}
                {viserPrimos ? <td className="tal">{vis(linje.periode)}</td> : null}
                {viserPrimos ? <td className="tal">{vis(linje.ultimo)}</td> : null}
                <td className="tal">{vis(linje.beloeb)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={viserPrimos ? 5 : 2}>Sum</td>
              <td className="tal">{resultat.sum === null ? '—' : formatKroner(resultat.sum)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function vis(oere: number | null): string {
  return oere === null ? '—' : formatKroner(oere);
}

export default App;
