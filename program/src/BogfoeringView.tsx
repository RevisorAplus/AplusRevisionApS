import { useState } from 'react';
import { alleKonti } from './kontoplan';
import { formatDato, formatKroner } from './penge';
import { godkendLinje, indlaesBank, lukMaaned, momsAngivelse, proevPostering, type Banklinje, type Momskode } from './bank';
import { momsangivelse, momsStemmer, type MomsLinje } from './moms';

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
  momskonto,
  onLinjer,
  onMomskonto,
  onLaast,
}: {
  linjer: Banklinje[];
  laast: boolean;
  momskonto: number;
  onLinjer: (linjer: Banklinje[]) => void;
  onMomskonto: (saldo: number) => void;
  onLaast: (laast: boolean) => void;
}) {
  const [afvist, setAfvist] = useState<string | null>(null);
  const [filnavn, setFilnavn] = useState('');
  const harBank = linjer.length > 0;
  const aabne = linjer.filter((linje) => linje.status === 'afventer');
  const stemmer = linjer.length - aabne.length;
  const lukning = lukMaaned(linjer, momskonto);
  const trin = laast ? 4 : !harBank ? 1 : aabne.length > 0 ? 2 : 3;

  function laegInd(tekst: string, navn: string) {
    const spaerret = proevPostering(laast);
    if (spaerret) {
      setAfvist(spaerret);
      return;
    }
    setAfvist(null);
    setFilnavn(navn);
    const nye = indlaesBank(tekst, KENDTE);
    onLinjer(nye);
    onMomskonto(0 - momsAngivelse(nye).afgift);
  }

  function godkend(kildelinje: number, konto: string, momskode: Momskode) {
    const spaerret = proevPostering(laast);
    if (spaerret) {
      setAfvist(spaerret);
      return;
    }
    setAfvist(null);
    const nye = godkendLinje(linjer, kildelinje, konto, momskode);
    onLinjer(nye);
    onMomskonto(0 - momsAngivelse(nye).afgift);
  }

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Bogføring</h1>
        <p>Tre trin, én ting ad gangen. Inden banken er inde, er det kun det første trin, der er åbent.</p>
      </header>

      <ol className="trin" aria-label="Trin">
        <TrinPunkt nr={1} tekst="Upload bank" tilstand={trin === 1 ? 'nu' : 'faerdig'} />
        <TrinPunkt nr={2} tekst="Godkend linjer" tilstand={trin === 2 ? 'nu' : harBank ? 'faerdig' : 'lukket'} />
        <TrinPunkt nr={3} tekst="Luk måneden" tilstand={laast ? 'faerdig' : trin === 3 ? 'nu' : 'lukket'} />
      </ol>

      <div className="panel">
        <h2>1 Upload bank</h2>
        <p className="laengde">
          {harBank
            ? `Banken er inde${filnavn ? `: ${filnavn}` : ''}. ${linjer.length === 1 ? '1 linje' : `${linjer.length} linjer`}. Kendte linjer er godkendt. Ukendte venter på dig.`
            : 'Læg bankudtoget ind som en fil, eller prøv eksempelmåneden. Kendte linjer er godkendt. Ukendte venter.'}
        </p>
        <div className="filer">
          <label className={`filknap ${harBank ? '' : 'primaer'}`}>
            {harBank ? 'Skift bankfil' : 'Vælg bankfil'}
            <input
              className="skjult"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(haendelse) => {
                const fil = haendelse.target.files?.[0];
                haendelse.target.value = '';
                if (!fil) return;
                void fil.text().then((tekst) => laegInd(tekst, fil.name));
              }}
            />
          </label>
          <button type="button" onClick={() => laegInd(EKSEMPEL, 'Eksempel: september')}>Eksempelmåned: september</button>
        </div>
        {afvist ? <p className="banner stop" role="alert">{afvist}</p> : null}
      </div>

      <fieldset disabled={!harBank}>
        <div className={`panel ${harBank ? '' : 'lukket'}`}>
          <h2>2 Godkend linjer</h2>
          {!harBank ? <p className="laengde">Lukket. Åbner, når banken er inde.</p> : null}
          {harBank && aabne.length === 0 ? <p className="laengde">Ingen linjer venter.</p> : null}
          {aabne.map((linje) => (
            <LinjeFormular key={linje.kildelinje} linje={linje} onGodkend={(konto, momskode) => godkend(linje.kildelinje, konto, momskode)} />
          ))}
          {harBank ? (
            <p className="hint">
              {stemmer === 0
                ? 'Ingen linjer stemmer endnu.'
                : stemmer === 1
                  ? '1 linje stemmer og er godkendt.'
                  : `${stemmer} linjer stemmer og er godkendt.`}
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset disabled={!harBank}>
        <div className={`panel ${harBank ? '' : 'lukket'}`}>
          <h2>3 Luk måneden</h2>
          {!harBank ? <p className="laengde">Lukket. Åbner, når banken er inde, og linjerne er godkendt.</p> : null}
          {harBank && laast ? <p className="banner klar">Måneden er lukket. Nye posteringer afvises.</p> : null}
          {harBank && !laast && lukning.aarsager.length > 0 ? (
            <ul className="noter">
              {lukning.aarsager.map((aarsag) => <li key={aarsag}>{aarsag}</li>)}
            </ul>
          ) : null}
          {harBank && !laast && lukning.kanLukke ? <p className="laengde">Banken er inde, ingen linjer venter, og momsen stemmer.</p> : null}
          <div className="filer">
            <button type="button" className="primaer" disabled={!harBank || !lukning.kanLukke || laast} onClick={() => onLaast(true)}>
              Luk måneden
            </button>
          </div>
        </div>
      </fieldset>
    </section>
  );
}

export function Moms({ linjer, laast, momskonto }: { linjer: Banklinje[]; laast: boolean; momskonto: number }) {
  const godkendte = linjer.filter((linje) => linje.status === 'stemmer');
  const venter = linjer.length - godkendte.length;
  const udtraek = momsangivelse(tilMomsLinjer(godkendte));
  const stemmerMoms = momsKontrol(linjer, momskonto);
  const bank = momsAngivelse(linjer);

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Moms</h1>
        <p>
          Momsen er et udtræk af de godkendte linjer. Det er ikke et skema, du udfylder. Et menneske sender angivelsen til Skattestyrelsen.
          Programmet har ikke indberettet.
        </p>
      </header>

      {linjer.length === 0 ? (
        <div className="panel">
          <p className="laengde">Banken er ikke lagt ind. Momsen kommer fra Bogføring, så snart linjerne er inde.</p>
        </div>
      ) : (
        <>
          <div className={`banner ${stemmerMoms ? 'klar' : 'venter'}`}>
            <strong>
              {stemmerMoms
                ? 'Momsen stemmer med momskontoen.'
                : venter > 0
                  ? `${venter === 1 ? '1 linje venter' : `${venter} linjer venter`} og er ikke med i udtrækket.`
                  : 'Momsen stemmer ikke med momskontoen.'}
            </strong>
            <p>{laast ? 'Måneden er lukket.' : 'Måneden er stadig åben.'}</p>
          </div>
          <div className="tabel-wrap">
            <table>
              <caption>Udtræk af {godkendte.length === 1 ? '1 godkendt linje' : `${godkendte.length} godkendte linjer`}. Beløb i kroner.</caption>
              <thead>
                <tr><th>Felt</th><th className="tal">Kroner</th></tr>
              </thead>
              <tbody>
                <tr><td>Salgsmoms</td><td className="tal">{formatKroner(udtraek.salgsmoms)}</td></tr>
                <tr><td>Købsmoms</td><td className="tal">{formatKroner(udtraek.koebsmoms)}</td></tr>
                {udtraek.euErhvervelser !== 0 ? <tr><td>Moms af varekøb i udlandet</td><td className="tal">{formatKroner(udtraek.euErhvervelser)}</td></tr> : null}
                {udtraek.euYdelser !== 0 ? <tr><td>Moms af ydelseskøb i udlandet</td><td className="tal">{formatKroner(udtraek.euYdelser)}</td></tr> : null}
                {udtraek.rubrikAVarer !== 0 ? <tr><td>Rubrik A – varer</td><td className="tal">{formatKroner(udtraek.rubrikAVarer)}</td></tr> : null}
                {udtraek.rubrikAYdelser !== 0 ? <tr><td>Rubrik A – ydelser</td><td className="tal">{formatKroner(udtraek.rubrikAYdelser)}</td></tr> : null}
                <tr className="sum">
                  <td>{udtraek.afgift < 0 ? 'Afgift: moms til gode' : 'Afgift: moms til betaling'}</td>
                  <td className="tal">{formatKroner(Math.abs(udtraek.afgift))}</td>
                </tr>
                <tr>
                  <td>Momskontoens gemte saldo (debet er positiv)</td>
                  <td className="tal">{formatKroner(momskonto)}</td>
                </tr>
                <tr>
                  <td>Afgift efter bankens linjer</td>
                  <td className="tal">{formatKroner(bank.afgift)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {udtraek.fejl.length > 0 ? (
            <ul className="noter">{udtraek.fejl.map((fejl) => <li key={fejl}>{fejl}</li>)}</ul>
          ) : null}
          <p className="hint">Tallene er hentet fra bankens godkendte linjer. Rettes en linje, rettes udtrækket med.</p>
        </>
      )}
    </section>
  );
}

function TrinPunkt({ nr, tekst, tilstand }: { nr: number; tekst: string; tilstand: 'nu' | 'faerdig' | 'lukket' }) {
  return (
    <li className={tilstand} aria-current={tilstand === 'nu' ? 'step' : undefined}>
      <span className="nr">{tilstand === 'faerdig' ? '✓' : nr}</span>
      <span>{tekst}</span>
      {tilstand === 'lukket' ? <span className="filnavn"> · lukket</span> : null}
    </li>
  );
}

function LinjeFormular({ linje, onGodkend }: { linje: Banklinje; onGodkend: (konto: string, momskode: Momskode) => void }) {
  const [konto, setKonto] = useState('');
  const [momskode, setMomskode] = useState<Momskode>('ingen');
  const kanGodkendes = linje.beloeb !== null && linje.dato !== '';
  return (
    <form
      className="linje"
      onSubmit={(haendelse) => {
        haendelse.preventDefault();
        if (konto) onGodkend(konto, momskode);
      }}
    >
      <div className="tekst">
        <strong>{linje.tekst || 'Uden tekst'}</strong>
        <small>
          {linje.dato ? formatDato(linje.dato) : 'Ingen dato'} · linje {linje.kildelinje}
          {linje.fejl ? ` · ${linje.fejl}` : ''}
        </small>
      </div>
      <span className="tal">{linje.beloeb === null ? '—' : formatKroner(linje.beloeb)}</span>
      <label>
        Konto
        <select value={konto} onChange={(haendelse) => setKonto(haendelse.target.value)} disabled={!kanGodkendes}>
          <option value="">Vælg konto</option>
          {alleKonti().map((post) => <option key={post.nummer} value={post.nummer}>{post.nummer} {post.navn}</option>)}
        </select>
      </label>
      <label>
        Moms
        <select value={momskode} onChange={(haendelse) => setMomskode(haendelse.target.value as Momskode)} disabled={!kanGodkendes}>
          {(Object.keys(MOMSTEKST) as Momskode[]).map((kode) => <option key={kode} value={kode}>{MOMSTEKST[kode]}</option>)}
        </select>
      </label>
      <button type="submit" className="primaer" disabled={!kanGodkendes || !konto}>Godkend</button>
    </form>
  );
}

export function momsKontrol(linjer: Banklinje[], momskonto: number): boolean {
  const udtraek = momsangivelse(tilMomsLinjer(linjer.filter((linje) => linje.status === 'stemmer')));
  return lukMaaned(linjer, momskonto).kanLukke && momsStemmer(udtraek.afgift, 0 - momskonto);
}

/** Banken viser et køb som en udbetaling (negativt). moms.ts vil have købet positivt, så en kreditnota beholder sit modsatte fortegn. */
function tilMomsLinjer(linjer: Banklinje[]): MomsLinje[] {
  return linjer
    .filter((linje) => linje.beloeb !== null && linje.momskode !== null)
    .map((linje) => ({
      kode: linje.momskode as Momskode,
      beloeb: linje.momskode === 'koeb25' ? 0 - (linje.beloeb as number) : (linje.beloeb as number),
    }));
}
