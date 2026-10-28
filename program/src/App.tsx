import { useMemo, useState } from 'react';
import { AnlaegSkærm } from './AnlaegView';
import { Bogfoering, Moms } from './BogfoeringView';
import { ImportSkærm } from './ImportView';
import { Kontrol, Regnskab } from './RegnskabView';
import { formatDato, formatKroner, kalenderMaaneder } from './penge';
import { indlaesSaldobalance, kontrollerRegnskabsaar, type Regnskabsaar } from './saldobalance';
import type { Banklinje } from './bank';

type Skærm = 'bogfoering' | 'import' | 'moms' | 'anlaeg' | 'aarsregnskab' | 'kontrol' | 'saldobalance';

const SKAERME: { id: Skærm; label: string }[] = [
  { id: 'bogfoering', label: 'Bogføring' },
  { id: 'import', label: 'Import' },
  { id: 'moms', label: 'Moms' },
  { id: 'anlaeg', label: 'Anlæg' },
  { id: 'aarsregnskab', label: 'Årsregnskab' },
  { id: 'kontrol', label: 'Kontrol' },
  { id: 'saldobalance', label: 'Saldobalance' },
];

const TOM: Regnskabsaar = { stiftet: '', fra: '', til: '', foersteAar: true };

function App() {
  const [skaerm, setSkaerm] = useState<Skærm>('bogfoering');
  const [linjer, setLinjer] = useState<Banklinje[]>([]);
  const [maanedLaast, setMaanedLaast] = useState(false);

  return (
    <main className="app">
      <nav className="menu" aria-label="Sektioner">
        {SKAERME.map((punkt) => (
          <button key={punkt.id} type="button" aria-current={skaerm === punkt.id ? 'page' : undefined} onClick={() => setSkaerm(punkt.id)}>
            {punkt.label}
          </button>
        ))}
      </nav>
      {skaerm === 'bogfoering' ? <Bogfoering linjer={linjer} laast={maanedLaast} onLinjer={setLinjer} onLaast={setMaanedLaast} /> : null}
      {skaerm === 'import' ? <ImportSkærm /> : null}
      {skaerm === 'moms' ? <Moms linjer={linjer} /> : null}
      {skaerm === 'anlaeg' ? <AnlaegSkærm /> : null}
      {skaerm === 'aarsregnskab' ? <Regnskab /> : null}
      {skaerm === 'kontrol' ? <Kontrol /> : null}
      {skaerm === 'saldobalance' ? <SaldobalanceSkærm /> : null}
    </main>
  );
}

function SaldobalanceSkærm() {
  const [aar, setAar] = useState<Regnskabsaar>(TOM);
  const [tekst, setTekst] = useState('');
  const [filnavn, setFilnavn] = useState('');

  const resultat = useMemo(() => (tekst.trim() ? indlaesSaldobalance(tekst, aar) : null), [tekst, aar]);
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
    <section>
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
          <label className="filknap">
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
