import { useState } from 'react';
import { formatKroner } from './penge';
import { godkendLinje, indlaesBank, lukMaaned, momsAngivelse, proevPostering, type Banklinje, type Momskode } from './bank';

const KENDTE = [
  { tekst: 'Salgsfaktura 104', konto: '1010', momskode: 'salg25' as const },
  { tekst: 'Husleje', konto: '3410', momskode: 'koeb25' as const },
];

const EKSEMPEL = [
  'Dato;Tekst;Beløb',
  '15.09.2024;Salgsfaktura 104;12.500,00',
  '16.09.2024;Husleje;-6.250,00',
  '17.09.2024;Ukendt betaling;-400,00',
].join('\n');

const MOMSTEKST: Record<Momskode, string> = {
  ingen: 'Ingen moms',
  salg25: 'Salg 25 %',
  koeb25: 'Køb 25 %',
};

export function Bogfoering({
  linjer,
  laast,
  onLinjer,
  onLaast,
}: {
  linjer: Banklinje[];
  laast: boolean;
  onLinjer: (linjer: Banklinje[]) => void;
  onLaast: (laast: boolean) => void;
}) {
  const [spærring, setSpaerring] = useState<string | null>(null);
  const harBank = linjer.length > 0;
  const aabne = linjer.filter((linje) => linje.status === 'afventer');
  const stemmer = linjer.length - aabne.length;
  const lukning = lukMaaned(linjer, momskonto(linjer));
  const trin = !harBank ? 1 : aabne.length > 0 ? 2 : 3;

  function laegInd(tekst: string) {
    const afvist = proevPostering(laast);
    if (afvist) {
      setSpaerring(afvist);
      return;
    }
    setSpaerring(null);
    onLaast(false);
    onLinjer(indlaesBank(tekst, KENDTE));
  }

  return (
    <section>
      <header className="top">
        <h1>Bogføring</h1>
        <p>Tre trin. Inden banken er inde, er det kun det første, der er åbent.</p>
      </header>
      <ol className="trin">
        <li className={trin === 1 ? 'nu' : ''}>1 Upload bank</li>
        <li className={trin === 2 ? 'nu' : harBank ? '' : 'lukket'}>2 Godkend linjer</li>
        <li className={trin === 3 && !laast ? 'nu' : harBank ? '' : 'lukket'}>3 Luk måneden</li>
      </ol>
      <div className="panel">
        <h2>1 Upload bank</h2>
        <div className="filer">
          <label className="filknap">
            Vælg fil
            <input
              className="skjult"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(haendelse) => {
                const fil = haendelse.target.files?.[0];
                if (!fil) return;
                void fil.text().then(laegInd);
              }}
            />
          </label>
          <button type="button" onClick={() => laegInd(EKSEMPEL)}>Eksempel: september</button>
        </div>
        {!harBank ? <p className="laengde">Læg bankudtoget ind. Godkendelse og lukning åbner først der.</p> : null}
        {spærring ? <p className="laengde">{spærring}</p> : null}
      </div>
      {harBank ? (
        <div className="panel">
          <h2>2 Godkend linjer</h2>
          {stemmer > 0 ? <p className="laengde">{stemmer === 1 ? '1 linje stemmer allerede.' : `${stemmer} linjer stemmer allerede.`}</p> : null}
          {aabne.length === 0 ? <p className="laengde">Ingen linjer venter.</p> : null}
          {aabne.map((linje) => (
            <LinjeFormular key={linje.kildelinje} linje={linje} onGodkend={(konto, momskode) => onLinjer(godkendLinje(linjer, linje.kildelinje, konto, momskode))} />
          ))}
        </div>
      ) : null}
      {harBank ? (
        <div className="panel">
          <h2>3 Luk måneden</h2>
          {laast ? <p className="laengde">Måneden er lukket.</p> : null}
          {!laast && lukning.aarsager.length > 0 ? (
            <ul className="noter">
              {lukning.aarsager.map((aarsag) => <li key={aarsag}>{aarsag}</li>)}
            </ul>
          ) : null}
          <button type="button" disabled={!lukning.kanLukke || laast} onClick={() => onLaast(true)}>Luk måneden</button>
        </div>
      ) : null}
    </section>
  );
}

export function Moms({ linjer }: { linjer: Banklinje[] }) {
  const tal = momsAngivelse(linjer);
  const angivelse = lukMaaned(linjer, tal.koebsmoms - tal.salgsmoms);
  return (
    <section>
      <header className="top">
        <h1>Moms</h1>
        <p>Angivelsen er et udtræk af de godkendte linjer. Et menneske sender den til Skattestyrelsen.</p>
      </header>
      {linjer.length === 0 ? <p className="laengde">Læg banken ind under Bogføring. Momsen kommer derfra.</p> : null}
      {linjer.length > 0 ? (
        <div className="tabel-wrap">
          <table>
            <caption>{angivelse.kanLukke ? 'Momsen stemmer med momskontoen.' : 'Momsen opdateres, når linjerne er godkendt.'}</caption>
            <tbody>
              <tr><td>Salgsmoms</td><td className="tal">{formatKroner(tal.salgsmoms)}</td></tr>
              <tr><td>Købsmoms</td><td className="tal">{formatKroner(tal.koebsmoms)}</td></tr>
              <tr><td>Afgift</td><td className="tal">{formatKroner(tal.afgift)}</td></tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function LinjeFormular({ linje, onGodkend }: { linje: Banklinje; onGodkend: (konto: string, momskode: Momskode) => void }) {
  const [konto, setKonto] = useState('');
  const [momskode, setMomskode] = useState<Momskode>('ingen');
  return (
    <form
      className="linje"
      onSubmit={(haendelse) => {
        haendelse.preventDefault();
        onGodkend(konto, momskode);
      }}
    >
      <span>{linje.tekst}</span>
      <span className="tal">{linje.beloeb === null ? '—' : formatKroner(linje.beloeb)}</span>
      <label>
        Konto
        <input value={konto} onChange={(haendelse) => setKonto(haendelse.target.value)} />
      </label>
      <label>
        Moms
        <select value={momskode} onChange={(haendelse) => setMomskode(haendelse.target.value as Momskode)}>
          {(Object.keys(MOMSTEKST) as Momskode[]).map((kode) => <option key={kode} value={kode}>{MOMSTEKST[kode]}</option>)}
        </select>
      </label>
      <button type="submit">Godkend</button>
    </form>
  );
}

function momskonto(linjer: Banklinje[]): number {
  const tal = momsAngivelse(linjer);
  return tal.koebsmoms - tal.salgsmoms;
}
