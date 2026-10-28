import { useState } from 'react';
import { indlaesKilde, setBilag, type KildeLinje, type Undtagelse } from './kilde';
import { formatKroner } from './penge';

const foersteFil = [
  'Bilag;Dato;Tekst;Konto;Beløb',
  '104;15.09.2024;Salg;1000;12.500,00',
  '105;16.09.2024;Husleje;2000;-6.250,00',
  '106;17.09.2024;Ukendt;9999;-400,00',
].join('\n');

const mapping = [
  { kildeKonto: '1000', konto: '1010' },
  { kildeKonto: '2000', konto: '3410' },
];

const nytBilag = [
  'Bilag;Dato;Tekst;Konto;Beløb',
  '104;15.09.2024;Salg;1000;12.500,00',
  '107;18.09.2024;Nyt salg;1000;2.000,00',
].join('\n');

export function ImportSkærm() {
  const [linjer, setLinjer] = useState<KildeLinje[]>([]);
  const [undtagelser, setUndtagelser] = useState<Undtagelse[]>([]);
  const [seneste, setSeneste] = useState('');

  function koer(tekst: string) {
    const allerede = [
      ...linjer.map((linje) => ({ kilde: linje.kilde, bilagsnummer: linje.bilagsnummer })),
      ...undtagelser.map((linje) => ({ kilde: linje.kilde, bilagsnummer: linje.bilagsnummer })),
    ];
    const resultat = indlaesKilde(tekst, 'economic', mapping, allerede);
    const samlet = setBilag(linjer, undtagelser, resultat);
    setLinjer(samlet.linjer);
    setUndtagelser(samlet.undtagelser);
    setSeneste(`${antal(resultat.nye.length, 'ny linje', 'nye linjer')}. ${resultat.sprungetOver} var der i forvejen. ${antal(resultat.undtagelser.length, 'konto er ikke mappet', 'konti er ikke mappet')}.`);
  }

  return (
    <section>
      <header className="top">
        <h1>Import</h1>
        <p>Første indlæsning tager bilagene med. Næste gang kommer kun de nye. En ukendt konto gættes ikke.</p>
      </header>
      <div className="panel">
        <div className="filer">
          <button type="button" onClick={() => koer(foersteFil)}>Indlæs e-conomic</button>
          <button type="button" onClick={() => koer(foersteFil)}>Kør samme fil igen</button>
          <button type="button" onClick={() => koer(nytBilag)}>Indlæs nyt bilag</button>
        </div>
        {seneste ? <p className="laengde">{seneste}</p> : <p className="laengde">Ingen fil er indlæst.</p>}
      </div>
      {tabel({ titel: 'Bogført', tom: 'Ingen linjer endnu.', raekker: linjer.map((linje) => `${linje.bilagsnummer} ${linje.tekst} konto ${linje.konto}`), beloeb: linjer.map((linje) => linje.beloeb) })}
      {tabel({ titel: 'Ikke mappet', tom: 'Ingen ukendte konti.', raekker: undtagelser.map((linje) => `${linje.bilagsnummer} konto ${linje.kildeKonto}. ${linje.aarsag}`), beloeb: undtagelser.map((linje) => linje.beloeb) })}
    </section>
  );
}

function antal(tal: number, en: string, flere: string): string {
  return tal === 1 ? `1 ${en}` : `${tal} ${flere}`;
}

function tabel({ titel, tom, raekker, beloeb }: { titel: string; tom: string; raekker: string[]; beloeb: (number | null)[] }) {
  return (
    <div className="tabel-wrap">
      <table>
        <caption>{titel}. {antal(raekker.length, 'linje', 'linjer')}.</caption>
        <tbody>
          {raekker.length === 0 ? <tr><td>{tom}</td></tr> : raekker.map((tekst, indeks) => (
            <tr key={`${tekst}-${indeks}`}>
              <td>{tekst}</td>
              <td className="tal">{beloeb[indeks] === null || beloeb[indeks] === undefined ? '—' : formatKroner(beloeb[indeks] as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
