import { parseDato, parseDanskBeloeb } from './penge';
import type { KildeImport, KildeLinje, KildeNavn, Undtagelse } from './kilde';

export type SaftKontoMapping = {
  kildeKonto: string;
  konto: string;
};

export type SaftImport = KildeImport;

export function indlaesSaft(
  xml: string,
  mapping: SaftKontoMapping[] = [],
  allerede: { kilde: KildeNavn; bilagsnummer: string }[] = [],
): SaftImport {
  const kilde: KildeNavn = 'saft';
  const alleredeKendteBilag = new Set(
    allerede
      .filter((post) => post.kilde === kilde)
      .map((post) => post.bilagsnummer),
  );
  const nye: KildeLinje[] = [];
  const undtagelser: Undtagelse[] = [];
  let sprungetOver = 0;

  const transaktioner = hentElementer(xml.replace(/^\uFEFF/, ''), 'Transaction');
  const blokke = transaktioner.length > 0 ? transaktioner : [xml];
  let fundneLinjer = 0;

  for (const [transaktionsIndeks, transaktion] of blokke.entries()) {
    const transaktionsBilag = hentVaerdi(transaktion, [
      'TransactionID',
      'VoucherNumber',
      'DocumentNumber',
      'SourceID',
    ]);
    const transaktionsDato = hentVaerdi(transaktion, ['TransactionDate', 'GLPostingDate', 'Date']);
    const transaktionsTekst = hentVaerdi(transaktion, ['Description', 'TransactionText']);
    const linjer = hentElementer(transaktion, 'Line');

    for (const [linjeIndeks, linje] of linjer.entries()) {
      fundneLinjer += 1;
      const bilagsnummer = transaktionsBilag
        || hentVaerdi(linje, ['VoucherNumber', 'DocumentNumber', 'RecordID'])
        || `saft-${transaktionsIndeks + 1}-${linjeIndeks + 1}`;
      if (alleredeKendteBilag.has(bilagsnummer)) {
        sprungetOver += 1;
        continue;
      }

      const dato = parseDato(
        hentVaerdi(linje, ['TransactionDate', 'GLPostingDate', 'Date']) || transaktionsDato,
      ) ?? '';
      const tekst = hentVaerdi(linje, ['Description', 'LineText']) || transaktionsTekst;
      const kildeKonto = hentVaerdi(linje, ['AccountID', 'AccountNumber', 'GLAccountNumber']);
      const beloeb = hentLinjeBeloeb(linje);

      if (!dato || beloeb === null) {
        undtagelser.push({
          kilde,
          bilagsnummer,
          kildeKonto,
          beloeb,
          aarsag: 'Dato eller beløb kan ikke læses i SAF-T-filen. Linjen er beholdt.',
        });
        continue;
      }

      const konto = mapping.find((kandidat) => kandidat.kildeKonto === kildeKonto)?.konto;
      if (!konto) {
        undtagelser.push({
          kilde,
          bilagsnummer,
          kildeKonto,
          beloeb,
          aarsag: 'Kontoen fra SAF-T-filen er ikke mappet. Den er ikke gættet.',
        });
        continue;
      }

      nye.push({ kilde, bilagsnummer, dato, tekst, kildeKonto, konto, beloeb });
    }
  }

  if (fundneLinjer === 0) {
    undtagelser.push({
      kilde,
      bilagsnummer: '',
      kildeKonto: '',
      beloeb: null,
      aarsag: 'SAF-T-filen indeholder ingen læsbare transaktionslinjer.',
    });
  }

  return { nye, undtagelser, sprungetOver };
}

function hentLinjeBeloeb(linje: string): number | null {
  const debet = hentBeloeb(linje, 'DebitAmount');
  if (debet !== null) return Math.abs(debet);

  const kredit = hentBeloeb(linje, 'CreditAmount');
  if (kredit !== null) return -Math.abs(kredit);

  return hentBeloeb(linje, 'Amount');
}

function hentBeloeb(xml: string, navn: string): number | null {
  const element = hentElementer(xml, navn)[0];
  if (element === undefined) return null;
  const indlejret = navn === 'Amount' ? '' : hentVaerdi(element, ['Amount']);
  return parseDanskBeloeb(indlejret || tilTekst(element));
}

function hentVaerdi(xml: string, navne: string[]): string {
  for (const navn of navne) {
    const element = hentElementer(xml, navn)[0];
    if (element !== undefined) return tilTekst(element);
  }
  return '';
}

function hentElementer(xml: string, navn: string): string[] {
  const sikkertNavn = navn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const namespace = '(?:[A-Za-z_][\\w.-]*:)?';
  const udtryk = new RegExp(
    `<${namespace}${sikkertNavn}\\b[^>]*>([\\s\\S]*?)<\\/${namespace}${sikkertNavn}\\s*>`,
    'gi',
  );
  return [...xml.matchAll(udtryk)].map((match) => match[1]);
}

function tilTekst(xml: string): string {
  return afkodXml(
    xml
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim(),
  );
}

function afkodXml(tekst: string): string {
  return tekst
    .replace(/&#x([0-9a-f]+);/gi, (_, tal: string) => String.fromCodePoint(Number.parseInt(tal, 16)))
    .replace(/&#(\d+);/g, (_, tal: string) => String.fromCodePoint(Number.parseInt(tal, 10)))
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
