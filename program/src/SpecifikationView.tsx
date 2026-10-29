import { formatDato, formatKroner } from './penge';

type Bilagslinje = { dato: string; bilag: string; tekst: string; beloeb: number };

type Konto = { navn: string; konto: string; linjer: Bilagslinje[] };

const kr = (kroner: number) => Math.round(kroner * 100);

export const STOR_POST = kr(10_000);

const EKSEMPEL: Konto[] = [
  {
    navn: 'Debitorer',
    konto: '5300',
    linjer: [
      { dato: '2024-09-15', bilag: '104', tekst: 'Salgsfaktura 104', beloeb: kr(12_500) },
      { dato: '2024-09-28', bilag: '112', tekst: 'Salgsfaktura 112', beloeb: kr(8_750) },
      { dato: '2024-09-30', bilag: '118', tekst: 'Delbetaling fra kunde', beloeb: kr(-3_000) },
    ],
  },
  {
    navn: 'Kreditorer',
    konto: '7100',
    linjer: [
      { dato: '2024-09-16', bilag: '105', tekst: 'Husleje', beloeb: kr(-6_250) },
      { dato: '2024-09-20', bilag: '109', tekst: 'Leverandør A, faktura 3381', beloeb: kr(-14_200) },
      { dato: '2024-09-25', bilag: '115', tekst: 'Leverandør B, faktura 77', beloeb: kr(-2_100) },
    ],
  },
  {
    navn: 'Varelager',
    konto: '6110',
    linjer: [
      { dato: '2024-09-30', bilag: 'L-1', tekst: 'Optælling ved periodens slutning', beloeb: kr(28_400) },
      { dato: '2024-09-30', bilag: 'L-2', tekst: 'Regulering efter optælling', beloeb: kr(1_600) },
    ],
  },
  {
    navn: 'Egenkapital',
    konto: '7410',
    linjer: [
      { dato: '2024-06-07', bilag: 'S-1', tekst: 'Selskabskapital', beloeb: kr(-40_000) },
      { dato: '2024-09-30', bilag: 'S-2', tekst: 'Overført resultat fra sidste år', beloeb: kr(-12_000) },
      { dato: '2024-09-30', bilag: 'S-3', tekst: 'Årets resultat', beloeb: kr(-99_740) },
    ],
  },
  {
    navn: 'Skattebro',
    konto: 'Skat',
    linjer: [
      { dato: '2024-09-30', bilag: 'K-1', tekst: 'Resultat før skat', beloeb: kr(160_000) },
      { dato: '2024-09-30', bilag: 'K-2', tekst: 'Ikke fradragsberettigede omkostninger', beloeb: kr(8_000) },
      { dato: '2024-09-30', bilag: 'K-3', tekst: 'Skattemæssige afskrivninger', beloeb: kr(-25_000) },
      { dato: '2024-09-30', bilag: 'K-4', tekst: 'Fremført underskud', beloeb: kr(-20_000) },
    ],
  },
];

export function summerLinjer(linjer: Bilagslinje[]): number {
  return linjer.reduce((acc, linje) => acc + linje.beloeb, 0);
}

export function erStorPost(beloeb: number): boolean {
  return Math.abs(beloeb) >= STOR_POST;
}

export function SpecifikationSkærm() {
  const poster = EKSEMPEL.map((post) => ({ ...post, sum: summerLinjer(post.linjer) }));

  return (
    <section className="skaerm">
      <header className="top">
        <h1>Specifikation</h1>
        <p>
          Store poster kan foldes ud til de bilag, der ligger på kontoen. Beløbet på posten er summen af linjerne under den.
          Der står ingen tal ved siden af bilagene.
        </p>
      </header>

      <div className="panel">
        <h2>Fast eksempel</h2>
        <p className="hint">Poster fra {formatKroner(STOR_POST)} kr. og op kan foldes ud. Mindre poster står som en enkelt linje.</p>
        {poster.map((post) => (
          erStorPost(post.sum) ? (
            <details className="post" key={post.navn}>
              <summary>
                <span>{post.navn} <span className="filnavn">· konto {post.konto} · {post.linjer.length} bilag</span></span>
                <span className="sum">{formatKroner(post.sum)}</span>
              </summary>
              <div className="tabel-wrap" style={{ marginTop: 0, border: 0 }}>
                <table>
                  <caption>Summen {formatKroner(post.sum)} kr. er lagt sammen af linjerne.</caption>
                  <thead>
                    <tr>
                      <th>Dato</th>
                      <th>Bilag</th>
                      <th>Tekst</th>
                      <th className="tal">Beløb</th>
                    </tr>
                  </thead>
                  <tbody>
                    {post.linjer.map((linje) => (
                      <tr key={linje.bilag}>
                        <td>{formatDato(linje.dato)}</td>
                        <td>{linje.bilag}</td>
                        <td>{linje.tekst}</td>
                        <td className="tal">{formatKroner(linje.beloeb)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={3}>Sum</td>
                      <td className="tal">{formatKroner(post.sum)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </details>
          ) : (
            <div className="post lille" key={post.navn}>
              <span>{post.navn} <span className="filnavn">· konto {post.konto}</span></span>
              <span className="sum">{formatKroner(post.sum)}</span>
            </div>
          )
        ))}
      </div>
    </section>
  );
}
