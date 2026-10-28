import { useMemo, useState } from 'react';
import { bygRapport, kontrollerAar, disponeringRest, type Poster } from './aar';
import { formatKroner, parseDanskBeloeb } from './penge';

const kr = (kroner: number) => Math.round(kroner * 100);

const POSTER: Poster[] = [
  { kontonummer: '1010', navn: 'Salg', beloeb: kr(-228_000), rolle: 'omsaetning' },
  { kontonummer: '3610', navn: 'Repræsentation', beloeb: kr(8_000), rolle: 'ikke-fradrag' },
  { kontonummer: '3910', navn: 'Afskrivninger', beloeb: kr(40_000), rolle: 'regnskabsafskrivning' },
  { kontonummer: '5110', navn: 'Bank', beloeb: kr(220_000), rolle: 'bank' },
  { kontonummer: '6110', navn: 'Anpartskapital', beloeb: kr(-40_000), rolle: 'egenkapital' },
];

export function Regnskab() {
  const model = useRegnskab();
  return (
    <section>
      <header className="top">
        <h1>Årsregnskab</h1>
        <p>Tallene kommer fra saldobalancen. Skatten er beregnet. Første år har ingen kolonne til sidste år.</p>
      </header>
      <Indstillinger model={model} />
      <Linjetabel titel="Resultat" linjer={model.rapport.resultat} />
      <Linjetabel titel="Skatteberegning" linjer={model.rapport.skat.linjer} />
      <Linjetabel titel="Aktiver" linjer={model.rapport.balanceAktiver} />
      <Linjetabel titel="Egenkapital" linjer={model.rapport.egenkapital} />
      <Linjetabel titel="Gæld" linjer={model.rapport.gaeld} />
      {model.rapport.noter.length > 0 ? (
        <div className="panel">
          <h2>Noter</h2>
          <ul className="noter">{model.rapport.noter.map((note) => <li key={note}>{note}</li>)}</ul>
        </div>
      ) : null}
    </section>
  );
}

export function Kontrol() {
  const model = useRegnskab();
  const [overfoert, setOverfoert] = useState('139.740,00');
  const [udbytte, setUdbytte] = useState('0,00');
  const [laan, setLaan] = useState(false);
  const [afklaring, setAfklaring] = useState('');
  const [laast, setLaast] = useState(false);
  const rest = disponeringRest(model.rapport.skat.resultatEfterSkat, parseDanskBeloeb(overfoert) ?? 0, parseDanskBeloeb(udbytte) ?? 0);
  const kontrol = kontrollerAar({
    form: 'aps',
    saldoSum: 0,
    saldobalanceGodkendt: true,
    disponeringRest: rest,
    momsStemmer: true,
    bankLukket: true,
    skatFejl: model.rapport.skat.fejl,
    mellemregningEjer: laan ? kr(5_000) : null,
    afklaringLaan: afklaring,
    varelagerFindes: false,
    varelagerBekaertet: false,
    valutaFindes: false,
    valutaKursSat: false,
    sambeskatning: model.sambeskatning,
    haeftelsesnoteMed: model.rapport.noter.some((note) => note.includes('solidarisk')),
  });

  return (
    <section>
      <header className="top">
        <h1>Kontrol</h1>
        <p>Året låser, når linjerne er grønne. En fælde, kunden ikke har, bliver ikke spurgt om.</p>
      </header>
      <Indstillinger model={model} />
      <div className="panel">
        <h2>Fordeling af årets resultat</h2>
        <div className="felter">
          <label>
            Overført resultat
            <input value={overfoert} onChange={(haendelse) => setOverfoert(haendelse.target.value)} />
          </label>
          <label>
            Foreslået udbytte
            <input value={udbytte} onChange={(haendelse) => setUdbytte(haendelse.target.value)} />
          </label>
          <label className="afkryds">
            <input type="checkbox" checked={laan} onChange={(haendelse) => setLaan(haendelse.target.checked)} />
            Debetsaldo på mellemregning med ejer
          </label>
        </div>
        {laan ? (
          <label className="afklaring">
            Afklaring
            <input value={afklaring} onChange={(haendelse) => setAfklaring(haendelse.target.value)} placeholder="Skriv afklaringen" />
          </label>
        ) : null}
      </div>
      <ul className="kontrol">
        {kontrol.linjer.map((linje) => (
          <li key={linje.navn} className={linje.ok ? 'klar' : 'stop'}>
            <strong>{linje.navn}</strong>
            <span>{linje.tekst}</span>
          </li>
        ))}
      </ul>
      <button type="button" disabled={!kontrol.kanLaase || laast} onClick={() => setLaast(true)}>Lås året</button>
      {laast ? <p className="laengde">Året er låst.</p> : null}
    </section>
  );
}

function useRegnskab() {
  const [fremfoert, setFremfoert] = useState('20.000,00');
  const [sambeskatning, setSambeskatning] = useState(false);
  const rapport = useMemo(() => {
    const faelles = {
      form: 'aps' as const,
      foersteAar: true,
      klasseB: true,
      poster: POSTER,
      skatteafskrivning: kr(25_000),
      fremfoertUnderskud: sambeskatning ? 0 : (parseDanskBeloeb(fremfoert) ?? 0),
      modregnetUnderskud: sambeskatning ? kr(20_000) : 0,
      sambeskatning,
      administrationsselskab: false,
      regnskabsvaerdiAnlaeg: null,
      skattevaerdiAnlaeg: null,
      harSidsteAar: true,
      udbytte: 0,
    };
    const foerste = bygRapport({ ...faelles, overfoert: 0 });
    return bygRapport({ ...faelles, overfoert: foerste.skat.resultatEfterSkat });
  }, [fremfoert, sambeskatning]);
  return { fremfoert, setFremfoert, sambeskatning, setSambeskatning, rapport };
}

function Indstillinger({ model }: { model: ReturnType<typeof useRegnskab> }) {
  return (
    <div className="panel">
      <div className="felter">
        <label>
          Fremført underskud fra sidste ansættelse
          <input value={model.fremfoert} onChange={(haendelse) => model.setFremfoert(haendelse.target.value)} disabled={model.sambeskatning} />
        </label>
        <label className="afkryds">
          <input type="checkbox" checked={model.sambeskatning} onChange={(haendelse) => model.setSambeskatning(haendelse.target.checked)} />
          Indgår i sambeskatning
        </label>
      </div>
      <p className="laengde">
        Årets skat er {formatKroner(model.rapport.skat.aktuelSkat)} kr.
        {model.sambeskatning ? ' Modregnet underskud fra det andet selskab er 20.000,00 kr. Drift skylder bidraget til holding.' : ''}
      </p>
    </div>
  );
}

function Linjetabel({ titel, linjer }: { titel: string; linjer: { tekst: string; beloeb: number }[] }) {
  if (linjer.length === 0) return null;
  return (
    <div className="tabel-wrap">
      <table>
        <caption>{titel}</caption>
        <tbody>
          {linjer.map((linje) => (
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
