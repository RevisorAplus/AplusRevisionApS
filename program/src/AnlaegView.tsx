import { useState } from 'react';
import { afskrivningIPerioden, afskrivningStemmer, bogfoertVaerdi, udskudtSkatAfAnlaeg, type Anlaeg } from './anlaeg';
import { bygNoter, egenkapitalforklaring } from './noter';
import { formatKroner } from './penge';

const kr = (kroner: number) => Math.round(kroner * 100);

const maskine: Anlaeg = {
  navn: 'Maskine',
  kostpris: kr(100_000),
  brugstidAar: 5,
  restvaerdi: 0,
  anskaffet: '2024-01-01',
  skatteafskrivning: kr(25_000),
};

export function AnlaegSkærm() {
  const [afviger, setAfviger] = useState(false);
  const afskrivning = afskrivningIPerioden(maskine, '2024-01-01', '2024-12-31');
  const iResultatet = afviger ? kr(15_000) : afskrivning;
  const vaerdi = bogfoertVaerdi(maskine, afskrivning);
  const skattemæssig = maskine.kostpris - maskine.skatteafskrivning;
  const udskudt = udskudtSkatAfAnlaeg(vaerdi, skattemæssig);
  const stemmer = afskrivningStemmer(afskrivning, iResultatet);
  const noter = bygNoter({ personale: 0, anlaegIBalancen: vaerdi, anlaegIKartotek: vaerdi, sambeskatning: false });
  const egenkapital = egenkapitalforklaring(kr(40_000), [{ tekst: 'Årets resultat', beloeb: kr(139_740) }], kr(179_740));

  return (
    <section>
      <header className="top">
        <h1>Anlæg</h1>
        <p>Afskrivningen kommer fra kartoteket. Brugstid og restværdi er de eneste skøn. Noten følger posten.</p>
      </header>
      <div className={`banner ${stemmer ? 'klar' : 'stop'}`}>
        <strong>{stemmer ? 'Afskrivningen i resultatet er lig med kartoteket.' : 'Afskrivningen i resultatet er ikke lig med kartoteket.'}</strong>
        <p>Kartotek {formatKroner(afskrivning)} kr. Resultat {formatKroner(iResultatet)} kr. Udskudt skat {formatKroner(udskudt)} kr.</p>
      </div>
      <label className="afkryds panel">
        <input type="checkbox" checked={afviger} onChange={(haendelse) => setAfviger(haendelse.target.checked)} />
        Lad resultatets afskrivning afvige
      </label>
      <div className="tabel-wrap">
        <table>
          <caption>{maskine.navn}. Bogført værdi {formatKroner(vaerdi)} kr.</caption>
          <tbody>
            <tr><td>Kostpris</td><td className="tal">{formatKroner(maskine.kostpris)}</td></tr>
            <tr><td>Brugstid</td><td className="tal">{maskine.brugstidAar} år</td></tr>
            <tr><td>Årets afskrivning</td><td className="tal">{formatKroner(afskrivning)}</td></tr>
          </tbody>
        </table>
      </div>
      <div className="tabel-wrap">
        <table>
          <caption>Egenkapital. {egenkapital.stemmer ? 'Primo plus bevægelser er lig med ultimo.' : 'Egenkapitalen stemmer ikke.'}</caption>
          <tbody>
            {egenkapital.linjer.map((linje) => (
              <tr key={linje.tekst}><td>{linje.tekst}</td><td className="tal">{formatKroner(linje.beloeb)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <h2>Noter</h2>
        {noter.noter.length === 0 ? <p>Ingen tomme noter.</p> : (
          <ul className="noter">{noter.noter.map((note) => <li key={note.titel}>{note.titel}. {note.tekst}</li>)}</ul>
        )}
      </div>
    </section>
  );
}
