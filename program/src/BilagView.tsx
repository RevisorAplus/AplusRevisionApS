import { useMemo, useState } from 'react';
import { indlaesLoenfil, sletBilag, soegBilag, tilbagefoer, type BilagPost } from './bilag';
import { konto } from './kontoplan';
import { proevBilag, type LaastPeriode } from './laas';
import { formatDato, formatKroner } from './penge';
import { registrerBogfoering, registrerTilbagefoering, type SporLinje } from './spor';

const LOEN = [
  'Type;Beløb',
  'Bruttoløn;80.000,00',
  'A-skat;-28.000,00',
  'AM-bidrag;-6.400,00',
  'Nettoløn;-45.600,00',
].join('\n');

function foersteLedigeLoennr(poster: BilagPost[]): number {
  let nr = 1;
  while (poster.some((post) => post.id.startsWith(`loen${nr}-`) || post.bilagsnummer === `L${nr}` || post.bilagsnummer.startsWith(`L${nr}-`))) nr += 1;
  return nr;
}

export function BilagSkærm({ laaste = [] }: { laaste?: LaastPeriode[] }) {
  const [poster, setPoster] = useState<BilagPost[]>([]);
  const [spor, setSpor] = useState<SporLinje[]>([]);
  const [q, setQ] = useState('');
  const [tilbageDato, setTilbageDato] = useState('2024-10-01');
  const [besked, setBesked] = useState<{ art: 'ok' | 'fejl'; tekst: string } | null>(null);
  const [modpost, setModpost] = useState<BilagPost | null>(null);
  const personale = useMemo(() => poster.filter((post) => post.konto === '2210').reduce((acc, post) => acc + post.beloeb, 0), [poster]);
  const viste = useMemo(() => soegBilag(poster, q), [poster, q]);

  function laesLoen(tekst: string) {
    const loen = indlaesLoenfil(tekst);
    if (loen.fejl) {
      setBesked({ art: 'fejl', tekst: loen.fejl });
      return;
    }
    const spaerret = loen.poster.map((post) => proevBilag(laaste, post)).find((fejl) => fejl !== null);
    if (spaerret) {
      setBesked({ art: 'fejl', tekst: spaerret });
      return;
    }
    const nr = foersteLedigeLoennr(poster);
    const nye = loen.poster.map((post, indeks) => ({ ...post, id: `loen${nr}-${indeks + 1}`, bilagsnummer: `L${nr}` }));
    setPoster((nu) => [...nu, ...nye]);
    setSpor((nu) => nye.reduce<SporLinje[]>((acc, post) => registrerBogfoering(acc, post), nu));
    setModpost(null);
    setBesked({ art: 'ok', tekst: `Lønfilen er lagt oven i bilagene som L${nr}. ${nye.length} posteringer.` });
  }

  function foer(post: BilagPost) {
    const spaerret = proevBilag(laaste, post) ?? proevBilag(laaste, { dato: tilbageDato });
    if (spaerret) {
      setBesked({ art: 'fejl', tekst: spaerret });
      return;
    }
    const resultat = tilbagefoer(poster, post.id, tilbageDato);
    if (resultat.fejl) {
      setBesked({ art: 'fejl', tekst: resultat.fejl });
      return;
    }
    const ny = resultat.poster[resultat.poster.length - 1];
    setPoster(resultat.poster);
    setSpor((nu) => registrerTilbagefoering(nu, post, ny));
    setModpost(ny);
    setBesked({ art: 'ok', tekst: 'Bilaget er tilbageført. Modposteringen står nedenfor.' });
  }

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Bilag</h1>
        <p>Et bilag kan ikke slettes. Det kan kun tilbageføres, og så ligger både original og modpostering i sporet.</p>
      </header>

      <div className="panel">
        <h2>Lønfil</h2>
        <p className="laengde">Læg lønfilen ind, eller prøv eksemplet. Personaleomkostningen vises, når filen balancerer.</p>
        <div className="filer">
          <label className="filknap primaer">
            Vælg lønfil
            <input
              className="skjult"
              type="file"
              accept=".csv,text/csv,text/plain"
              onChange={(haendelse) => {
                const fil = haendelse.target.files?.[0];
                haendelse.target.value = '';
                if (fil) void fil.text().then(laesLoen);
              }}
            />
          </label>
          <button type="button" onClick={() => laesLoen(LOEN)}>Eksempel: lønkørsel</button>
        </div>
        {poster.some((post) => post.kilde === 'loen') ? (
          <p className="banner klar">Personaleomkostning: <strong>{formatKroner(personale)} kr.</strong></p>
        ) : null}
        {besked ? <p className={`banner ${besked.art === 'ok' ? 'klar' : 'stop'}`} role="status">{besked.tekst}</p> : null}
      </div>

      <div className="panel">
        <h2>Find bilag</h2>
        <div className="felter to">
          <label>
            Søg på beløb, tekst, bilag, konto eller kilde
            <input type="search" value={q} onChange={(haendelse) => setQ(haendelse.target.value)} />
          </label>
          <label>
            Dato for en tilbageførsel
            <input type="date" value={tilbageDato} onChange={(haendelse) => setTilbageDato(haendelse.target.value)} />
          </label>
        </div>
      </div>

      <div className="tabel-wrap">
        <table>
          <caption>{viste.length === 1 ? '1 bilag.' : `${viste.length} bilag.`}</caption>
          <thead>
            <tr>
              <th>Bilag</th>
              <th>Dato</th>
              <th>Tekst</th>
              <th>Konto</th>
              <th>Kilde</th>
              <th className="tal">Beløb</th>
              <th>Handling</th>
            </tr>
          </thead>
          <tbody>
            {viste.length === 0 ? <tr><td colSpan={7}>Ingen bilag endnu.</td></tr> : viste.map((post) => (
              <tr key={post.id}>
                <td>{post.bilagsnummer}</td>
                <td>{formatDato(post.dato)}</td>
                <td>{post.tekst}</td>
                <td>{post.konto} {konto(post.konto)?.navn ?? ''}</td>
                <td>{post.kilde === 'loen' ? 'Løn' : post.kilde}</td>
                <td className="tal">{formatKroner(post.beloeb)}</td>
                <td>
                  {post.stornoAf ? 'Tilbageførsel' : (
                    <span className="filer" style={{ marginTop: 0 }}>
                      <button type="button" onClick={() => foer(post)}>Tilbagefør</button>
                      <button type="button" onClick={() => setBesked({ art: 'fejl', tekst: sletBilag().fejl })}>Slet</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modpost ? (
        <div className="panel">
          <h2>Modpostering</h2>
          <p className="laengde">
            {modpost.bilagsnummer} · {formatDato(modpost.dato)} · {modpost.tekst} · konto {modpost.konto} ·{' '}
            <strong>{formatKroner(modpost.beloeb)} kr.</strong> Den ophæver {modpost.stornoAf ? `bilag ${poster.find((post) => post.id === modpost.stornoAf)?.bilagsnummer ?? ''}` : 'bilaget'}.
          </p>
        </div>
      ) : null}

      {spor.length > 0 ? (
        <div className="panel">
          <h2>Spor</h2>
          <ul className="noter">
            {spor.map((linje, indeks) => (
              <li key={`${linje.bilagsId}-${linje.handling}-${indeks}`}>
                {linje.handling === 'bogfoert' ? 'Bogført' : 'Tilbageført'}: {linje.tekst}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
