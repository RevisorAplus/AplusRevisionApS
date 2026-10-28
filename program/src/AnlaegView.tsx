import { afskrivningStemmer, kontrollerAnlaeg } from './anlaeg';
import { anlaegsnote } from './noter';
import { formatDato, formatKroner } from './penge';
import type { RegnskabModel } from './RegnskabView';

export function AnlaegSkærm({ model, aarLaast = false }: { model: RegnskabModel; aarLaast?: boolean }) {
  const { kartotek, bogfoertAfskrivning, periode } = model;
  const stemmer = afskrivningStemmer(kartotek.aaretsAfskrivning, bogfoertAfskrivning);
  const note = anlaegsnote(kartotek);
  const fejl = model.anlaeg.flatMap(kontrollerAnlaeg);

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Anlæg</h1>
        <p>
          Kartoteket regner afskrivningen ud for {formatDato(periode.fra)}–{formatDato(periode.til)}. Brugstid og restværdi er de eneste skøn.
          Afskrivningen i resultatet skal være lig med kartotekets kørsel.
        </p>
      </header>

      <div className={`banner ${stemmer ? 'klar' : 'stop'}`} role="status">
        <strong>
          {stemmer
            ? 'Afskrivningen i resultatet er lig med kartotekets kørsel.'
            : 'Afskrivningen i resultatet er ikke lig med kartotekets kørsel.'}
        </strong>
        <p>
          Kartoteket {formatKroner(kartotek.aaretsAfskrivning)} kr. Resultatet {formatKroner(bogfoertAfskrivning)} kr.
          {stemmer ? '' : ` Forskel ${formatKroner(bogfoertAfskrivning - kartotek.aaretsAfskrivning)} kr. Kontrollen er rød, og året kan ikke låses.`}
        </p>
      </div>

      {fejl.length > 0 ? (
        <div className="banner stop" role="alert">
          <ul>{fejl.map((tekst) => <li key={tekst}>{tekst}</li>)}</ul>
        </div>
      ) : null}

      <div className="panel">
        <label className="afkryds">
          <input type="checkbox" checked={model.afviger} disabled={aarLaast} onChange={(haendelse) => model.setAfviger(haendelse.target.checked)} />
          Vis, hvad der sker, når resultatets afskrivning afviger
        </label>
      </div>

      <div className="tabel-wrap">
        <table>
          <caption>
            Kartotek. Bogført værdi ultimo {formatKroner(kartotek.ultimo)} kr. Skattemæssig værdi {formatKroner(kartotek.skattemaessigVaerdi)} kr.
            Udskudt skat {formatKroner(kartotek.udskudtSkat)} kr.
          </caption>
          <thead>
            <tr>
              <th>Anlæg</th>
              <th className="tal">Kostpris</th>
              <th className="tal">Afskrevet primo</th>
              <th className="tal">Årets afskrivning</th>
              <th className="tal">Afskrevet ultimo</th>
              <th className="tal">Bogført værdi</th>
              <th className="tal">Skattemæssig værdi</th>
              <th className="tal">Udskudt skat</th>
            </tr>
          </thead>
          <tbody>
            {kartotek.linjer.map((linje) => (
              <tr key={linje.navn}>
                <td>{linje.navn}{linje.tilgang ? <span className="filnavn"> · tilgang</span> : null}</td>
                <td className="tal">{formatKroner(linje.kostpris)}</td>
                <td className="tal">{formatKroner(linje.afskrevetPrimo)}</td>
                <td className="tal">{formatKroner(linje.aaretsAfskrivning)}</td>
                <td className="tal">{formatKroner(linje.afskrevetUltimo)}</td>
                <td className="tal">{formatKroner(linje.regnskabsmaessigVaerdi)}</td>
                <td className="tal">{formatKroner(linje.skattemaessigVaerdi)}</td>
                <td className="tal">{formatKroner(linje.udskudtSkat)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Sum</td>
              <td className="tal">{formatKroner(kartotek.kostprisUltimo)}</td>
              <td className="tal">{formatKroner(kartotek.afskrevetPrimo)}</td>
              <td className="tal">{formatKroner(kartotek.aaretsAfskrivning)}</td>
              <td className="tal">{formatKroner(kartotek.afskrevetUltimo)}</td>
              <td className="tal">{formatKroner(kartotek.ultimo)}</td>
              <td className="tal">{formatKroner(kartotek.skattemaessigVaerdi)}</td>
              <td className="tal">{formatKroner(kartotek.udskudtSkat)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="tabel-wrap">
        <table>
          <caption>{note.titel}. {note.tekst}</caption>
          <tbody>
            {(note.linjer ?? []).map((linje) => (
              <tr key={linje.tekst}>
                <td>{linje.tekst}</td>
                <td className="tal">{formatKroner(linje.beloeb)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
