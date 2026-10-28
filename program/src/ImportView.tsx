import { useState } from 'react';
import { indlaesKilde, setBilag, type KildeImport, type KildeLinje, type KildeNavn, type Undtagelse } from './kilde';
import { konto } from './kontoplan';
import { proevBilag, type LaastPeriode } from './laas';
import { formatDato, formatKroner } from './penge';
import { indlaesSaft } from './saft';

type Mapping = { kildeKonto: string; konto: string }[];

type CsvKilde = Exclude<KildeNavn, 'saft'>;

type Proeve = { navn: string; tekst: string; mapping: Mapping };

const CSV_PROEVER: Record<CsvKilde, Proeve> = {
  dinero: {
    navn: 'Dinero',
    tekst: [
      'Bilagsnr;Dato;Tekst;Kontonr;Beløb',
      'D-104;15.09.2024;Salg til kunde;1000;12.500,00',
      'D-105;16.09.2024;Husleje;2100;-6.250,00',
      'D-106;17.09.2024;Gave;9999;-400,00',
    ].join('\n'),
    mapping: [
      { kildeKonto: '1000', konto: '1010' },
      { kildeKonto: '2100', konto: '3410' },
    ],
  },
  billy: {
    navn: 'Billy',
    tekst: [
      'Voucher;Date;Description;Account;Amount',
      'B-31;2024-09-15;Salg til kunde;4000;12500.00',
      'B-32;2024-09-16;Husleje;5200;-6250.00',
      'B-33;2024-09-17;Kontingent;8800;-150.00',
    ].join('\n'),
    mapping: [
      { kildeKonto: '4000', konto: '1010' },
      { kildeKonto: '5200', konto: '3410' },
    ],
  },
  economic: {
    navn: 'e-conomic',
    tekst: [
      'Bilagsnummer;Bogføringsdato;Tekst;Kontonummer;Beløb',
      '104;15.09.2024;Salg;1000;12.500,00',
      '105;16.09.2024;Husleje;2000;-6.250,00',
      '106;17.09.2024;Ukendt;9999;-400,00',
    ].join('\n'),
    mapping: [
      { kildeKonto: '1000', konto: '1010' },
      { kildeKonto: '2000', konto: '3410' },
    ],
  },
  excel: {
    navn: 'Excel',
    tekst: [
      'Bilag;Dato;Tekst;Konto;Beløb',
      '1;15.09.2024;Salg;100;12.500,00',
      '2;16.09.2024;Husleje;200;-6.250,00',
      '3;30.09.2024;Løn;300;-80.000,00',
      '4;30.09.2024;Rejse;777;-1.200,00',
    ].join('\n'),
    mapping: [
      { kildeKonto: '100', konto: '1010' },
      { kildeKonto: '200', konto: '3410' },
      { kildeKonto: '300', konto: '2210' },
    ],
  },
};

const SAFT_PROEVE: Proeve = {
  navn: 'SAF-T',
  tekst: `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:StandardAuditFile-Taxation-Financial:DK">
  <GeneralLedgerEntries>
    <Journal>
      <Transaction>
        <TransactionID>SAFT-104</TransactionID>
        <TransactionDate>2024-09-15</TransactionDate>
        <Description>Salg &amp; levering</Description>
        <Line><AccountID>1000</AccountID><CreditAmount>12.500,00</CreditAmount></Line>
      </Transaction>
      <Transaction>
        <TransactionID>SAFT-105</TransactionID>
        <TransactionDate>2024-09-16</TransactionDate>
        <Description>Husleje</Description>
        <Line><AccountID>2000</AccountID><DebitAmount>6.250,00</DebitAmount></Line>
      </Transaction>
      <Transaction>
        <TransactionID>SAFT-106</TransactionID>
        <TransactionDate>2024-09-17</TransactionDate>
        <Description>Konto uden mapping</Description>
        <Line><AccountID>9999</AccountID><DebitAmount>400,00</DebitAmount></Line>
      </Transaction>
    </Journal>
  </GeneralLedgerEntries>
</AuditFile>`,
  mapping: [
    { kildeKonto: '1000', konto: '1010' },
    { kildeKonto: '2000', konto: '3410' },
  ],
};

type Stand = { linjer: KildeLinje[]; undtagelser: Undtagelse[]; seneste: string; uaendret: boolean; afvist: string | null };

const TOM: Stand = { linjer: [], undtagelser: [], seneste: '', uaendret: false, afvist: null };

export function ImportSkærm({ laaste = [] }: { laaste?: LaastPeriode[] }) {
  return (
    <section className="skaerm">
      <header className="top">
        <h1>Import</h1>
        <p>
          Prøv en indlæsning fra hver kilde. Første gang tages bilagene med. Kører du den samme fil igen, er antallet uændret.
          En konto, der ikke er mappet, bliver ikke gættet og ikke til en post. Den står for sig som en undtagelse.
        </p>
      </header>
      <ProeveBoks<CsvKilde>
        laaste={laaste}
        titel="Regnskabsprogram og regneark"
        kilder={CSV_PROEVER}
        laes={(kilde, tekst, mapping, allerede) => indlaesKilde(tekst, kilde, mapping, allerede)}
      />
      <ProeveBoks<'saft'>
        laaste={laaste}
        titel="SAF-T"
        kilder={{ saft: SAFT_PROEVE }}
        laes={(_kilde, tekst, mapping, allerede) => indlaesSaft(tekst, mapping, allerede)}
      />
    </section>
  );
}

function ProeveBoks<K extends KildeNavn>({
  titel,
  kilder,
  laes,
  laaste,
}: {
  laaste: LaastPeriode[];
  titel: string;
  kilder: Record<K, Proeve>;
  laes: (kilde: K, tekst: string, mapping: Mapping, allerede: { kilde: KildeNavn; bilagsnummer: string }[]) => KildeImport;
}) {
  const navne = Object.keys(kilder) as K[];
  const [valgt, setValgt] = useState<K>(navne[0]);
  const [stand, setStand] = useState<Partial<Record<K, Stand>>>({});
  const nu = stand[valgt] ?? TOM;
  const proeve = kilder[valgt];

  function koer() {
    const allerede = [
      ...nu.linjer.map((linje) => ({ kilde: linje.kilde, bilagsnummer: linje.bilagsnummer })),
      ...nu.undtagelser.map((linje) => ({ kilde: linje.kilde, bilagsnummer: linje.bilagsnummer })),
    ];
    const laest = laes(valgt, proeve.tekst, proeve.mapping, allerede);
    const afvisteLinjer = laest.nye.filter((linje) => proevBilag(laaste, linje) !== null);
    const afvist = afvisteLinjer.length > 0 ? `${antal(afvisteLinjer.length, 'linje er', 'linjer er')} afvist. ${proevBilag(laaste, afvisteLinjer[0])}` : null;
    const resultat: KildeImport = { ...laest, nye: laest.nye.filter((linje) => proevBilag(laaste, linje) === null) };
    const samlet = setBilag(nu.linjer, nu.undtagelser, resultat);
    const uaendret = resultat.nye.length === 0 && samlet.undtagelser.length === nu.undtagelser.length && resultat.sprungetOver > 0;
    const seneste = uaendret
      ? `Samme fil igen. Antallet er uændret: ${antal(samlet.linjer.length, 'bogført linje', 'bogførte linjer')} og ${antal(samlet.undtagelser.length, 'undtagelse', 'undtagelser')}.`
      : `${antal(resultat.nye.length, 'ny linje', 'nye linjer')} bogført. ${resultat.sprungetOver} var der i forvejen. ${antal(samlet.undtagelser.length - nu.undtagelser.length, 'ny undtagelse', 'nye undtagelser')}.`;
    setStand((tidligere) => ({ ...tidligere, [valgt]: { linjer: samlet.linjer, undtagelser: samlet.undtagelser, seneste, uaendret, afvist } }));
  }

  return (
    <div className="panel">
      <h2>{titel}</h2>
      {navne.length > 1 ? (
        <div className="filer" role="group" aria-label="Kilde">
          {navne.map((navn) => (
            <button key={navn} type="button" className={navn === valgt ? 'primaer' : ''} aria-pressed={navn === valgt} onClick={() => setValgt(navn)}>
              {kilder[navn].navn}
            </button>
          ))}
        </div>
      ) : null}
      <div className="filer">
        <button type="button" className={nu.seneste ? '' : 'primaer'} onClick={koer}>
          {nu.seneste ? `Indlæs ${proeve.navn}-prøven igen` : `Indlæs ${proeve.navn}-prøve`}
        </button>
      </div>
      {nu.afvist ? <p className="banner stop" role="alert">{nu.afvist}</p> : null}
      <p className={`laengde ${nu.uaendret ? 'banner klar' : ''}`} role="status">
        {nu.seneste || `Ingen ${proeve.navn}-fil er indlæst.`}
      </p>

      <div className="tabel-wrap">
        <table>
          <caption>Bogført fra {proeve.navn}. {antal(nu.linjer.length, 'linje', 'linjer')}.</caption>
          <thead>
            <tr>
              <th>Bilag</th>
              <th>Dato</th>
              <th>Tekst</th>
              <th>Konto</th>
              <th className="tal">Beløb</th>
            </tr>
          </thead>
          <tbody>
            {nu.linjer.length === 0 ? <tr><td colSpan={5}>Ingen linjer endnu.</td></tr> : nu.linjer.map((linje) => (
              <tr key={`${linje.kilde}-${linje.bilagsnummer}`}>
                <td>{linje.bilagsnummer}</td>
                <td>{formatDato(linje.dato)}</td>
                <td>{linje.tekst}</td>
                <td>{linje.konto} {konto(linje.konto)?.navn ?? ''}</td>
                <td className="tal">{formatKroner(linje.beloeb)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="tabel-wrap">
        <table>
          <caption>Undtagelser. Ikke mappet og ikke bogført. {antal(nu.undtagelser.length, 'linje', 'linjer')}.</caption>
          <thead>
            <tr>
              <th>Bilag</th>
              <th>Kildekonto</th>
              <th className="tal">Beløb</th>
              <th>Årsag</th>
            </tr>
          </thead>
          <tbody>
            {nu.undtagelser.length === 0 ? <tr><td colSpan={4}>Ingen ukendte konti.</td></tr> : nu.undtagelser.map((linje) => (
              <tr key={`${linje.kilde}-${linje.bilagsnummer}`}>
                <td>{linje.bilagsnummer}</td>
                <td>{linje.kildeKonto || '—'}</td>
                <td className="tal">{linje.beloeb === null ? '—' : formatKroner(linje.beloeb)}</td>
                <td className="bryd">{linje.aarsag}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function antal(tal: number, en: string, flere: string): string {
  return tal === 1 ? `1 ${en}` : `${tal} ${flere}`;
}
