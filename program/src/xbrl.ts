import { dagenFoer, erIsoDato, laegMaanederTil } from './penge';

export const SCHEMA_REF =
  'http://archprod.service.eogs.dk/taxonomy/20241001/entryDanishGAAPBalanceSheetAccountFormIncomeStatementByNatureIncludingManagementsReview20241001.xsd';

export const CVR_SCHEME = 'http://www.dcca.dk/cvr';

export const NAVNERUM = {
  ix: 'http://www.xbrl.org/2013/inlineXBRL',
  xbrli: 'http://www.xbrl.org/2003/instance',
  link: 'http://www.xbrl.org/2003/linkbase',
  xlink: 'http://www.w3.org/1999/xlink',
  iso4217: 'http://www.xbrl.org/2003/iso4217',
  fsa: 'http://xbrl.dcca.dk/fsa',
  gsd: 'http://xbrl.dcca.dk/gsd',
  cmn: 'http://xbrl.dcca.dk/cmn',
} as const;

export type IxbrlTal = {
  profitLossOere: number;
  assetsOere: number;
  equityOere: number;
  liabilitiesAndEquityOere: number;
};

export type IxbrlSidsteAar = IxbrlTal & { fra?: string; til?: string };

export type IxbrlInput = IxbrlTal & {
  selskab: string;
  cvr: string;
  fra: string;
  til: string;
  foersteAar: boolean;
  sidsteAar?: IxbrlSidsteAar;
};

export type IxbrlResultat = { xml: string | null; fejl: string | null };

export function kronerFraOere(oere: number): string {
  const absolut = Math.abs(oere);
  return `${Math.floor(absolut / 100)}.${String(absolut % 100).padStart(2, '0')}`;
}

export function bygIxbrl(input: IxbrlInput): IxbrlResultat {
  const afvist = (fejl: string): IxbrlResultat => ({ xml: null, fejl });

  const selskab = input.selskab.trim();
  if (selskab.length === 0) return afvist('Selskabets navn mangler.');
  const cvr = input.cvr.replace(/\s/g, '');
  if (!/^\d{8}$/.test(cvr)) return afvist('CVR-nummeret skal være 8 cifre.');
  const periodeFejl = kontrollerPeriode(input.fra, input.til, 'Regnskabsåret');
  if (periodeFejl) return afvist(periodeFejl);
  const talFejl = kontrollerTal(input, 'årets');
  if (talFejl) return afvist(talFejl);

  let forrige: { fra: string; til: string; tal: IxbrlTal } | null = null;
  if (input.sidsteAar !== undefined) {
    if (input.foersteAar) return afvist('Første regnskabsår har ingen sammenligningstal.');
    const til = input.sidsteAar.til ?? dagenFoer(input.fra);
    const fra = input.sidsteAar.fra ?? laegMaanederTil(input.fra, -12);
    const forrigeFejl = kontrollerPeriode(fra, til, 'Sidste regnskabsår') ?? kontrollerTal(input.sidsteAar, 'sidste års');
    if (forrigeFejl) return afvist(forrigeFejl);
    if (til >= input.fra) return afvist('Sidste regnskabsår skal slutte før årets regnskabsår.');
    forrige = { fra, til, tal: input.sidsteAar };
  }

  const kontekster = [
    kontekst('aar', cvr, { fra: input.fra, til: input.til }),
    kontekst('aarSlut', cvr, { dato: input.til }),
    ...(forrige ? [kontekst('forrige', cvr, { fra: forrige.fra, til: forrige.til }), kontekst('forrigeSlut', cvr, { dato: forrige.til })] : []),
  ];

  const navn = escape(selskab);
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<html xmlns="http://www.w3.org/1999/xhtml" ${Object.entries(NAVNERUM).map(([praefiks, uri]) => `xmlns:${praefiks}="${uri}"`).join(' ')} xml:lang="da">`,
    '<head>',
    '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>',
    `<title>Årsrapport ${navn} ${input.fra} – ${input.til}</title>`,
    '</head>',
    '<body>',
    '<div style="display:none">',
    '<ix:header>',
    '<ix:references>',
    `<link:schemaRef xlink:type="simple" xlink:href="${SCHEMA_REF}"/>`,
    '</ix:references>',
    '<ix:resources>',
    ...kontekster,
    '<xbrli:unit id="DKK"><xbrli:measure>iso4217:DKK</xbrli:measure></xbrli:unit>',
    '</ix:resources>',
    '</ix:header>',
    '</div>',
    `<h1>${tekstFakta('gsd:NameOfReportingEntity', 'aar', navn)}</h1>`,
    `<p>${tekstFakta('gsd:InformationOnTypeOfSubmittedReport', 'aar', 'Årsrapport')}</p>`,
    `<p>CVR-nummer: ${tekstFakta('gsd:IdentificationNumberCvrOfReportingEntity', 'aar', cvr)}</p>`,
    `<p>Regnskabsperiode: ${tekstFakta('gsd:ReportingPeriodStartDate', 'aar', input.fra)} – ${tekstFakta('gsd:ReportingPeriodEndDate', 'aar', input.til)}</p>`,
    `<p>${tekstFakta('fsa:ClassOfReportingEntity', 'aar', 'Regnskabsklasse B')}</p>`,
    `<p>Revisors bistand: ${tekstFakta('cmn:TypeOfAuditorAssistance', 'aar', 'Ingen bistand')}</p>`,
    '<h2>Resultatopgørelse</h2>',
    tabel([
      ['Årets resultat', talFakta('fsa:ProfitLoss', 'aar', input.profitLossOere), forrige && talFakta('fsa:ProfitLoss', 'forrige', forrige.tal.profitLossOere)],
    ], input, forrige),
    '<h2>Balance</h2>',
    tabel([
      ['Aktiver i alt', talFakta('fsa:Assets', 'aarSlut', input.assetsOere), forrige && talFakta('fsa:Assets', 'forrigeSlut', forrige.tal.assetsOere)],
      ['Egenkapital', talFakta('fsa:Equity', 'aarSlut', input.equityOere), forrige && talFakta('fsa:Equity', 'forrigeSlut', forrige.tal.equityOere)],
      ['Passiver i alt', talFakta('fsa:LiabilitiesAndEquity', 'aarSlut', input.liabilitiesAndEquityOere), forrige && talFakta('fsa:LiabilitiesAndEquity', 'forrigeSlut', forrige.tal.liabilitiesAndEquityOere)],
    ], input, forrige),
    '<p>Dokumentet er til gennemsyn og er ikke indberettet.</p>',
    '</body>',
    '</html>',
    '',
  ].join('\n');

  return { xml, fejl: null };
}

function kontrollerPeriode(fra: string, til: string, navn: string): string | null {
  if (!erIsoDato(fra) || !erIsoDato(til)) return `${navn} skal have gyldige datoer.`;
  if (fra > til) return `${navn} slutter før det starter.`;
  return null;
}

function kontrollerTal(tal: IxbrlTal, navn: string): string | null {
  const beloeb = [tal.profitLossOere, tal.assetsOere, tal.equityOere, tal.liabilitiesAndEquityOere];
  if (!beloeb.every((vaerdi) => Number.isSafeInteger(vaerdi))) return `Et af ${navn} beløb er ikke hele øre.`;
  if (tal.assetsOere < 0) return `Aktiverne i ${navn} balance kan ikke være negative.`;
  if (tal.assetsOere !== tal.liabilitiesAndEquityOere) return `Aktiver og passiver i ${navn} balance er ikke det samme tal.`;
  if (tal.equityOere > tal.liabilitiesAndEquityOere) return `Egenkapitalen i ${navn} balance er større end passiverne.`;
  return null;
}

function kontekst(id: string, cvr: string, periode: { fra: string; til: string } | { dato: string }): string {
  const tid = 'dato' in periode
    ? `<xbrli:instant>${periode.dato}</xbrli:instant>`
    : `<xbrli:startDate>${periode.fra}</xbrli:startDate><xbrli:endDate>${periode.til}</xbrli:endDate>`;
  return `<xbrli:context id="${id}"><xbrli:entity><xbrli:identifier scheme="${CVR_SCHEME}">${cvr}</xbrli:identifier></xbrli:entity><xbrli:period>${tid}</xbrli:period></xbrli:context>`;
}

function tekstFakta(navn: string, kontekstId: string, indhold: string): string {
  return `<ix:nonNumeric name="${navn}" contextRef="${kontekstId}">${indhold}</ix:nonNumeric>`;
}

function talFakta(navn: string, kontekstId: string, oere: number): string {
  const fortegn = oere < 0 ? ' sign="-"' : '';
  return `${oere < 0 ? '-' : ''}<ix:nonFraction name="${navn}" contextRef="${kontekstId}" unitRef="DKK" decimals="2"${fortegn}>${kronerFraOere(oere)}</ix:nonFraction>`;
}

function tabel(
  raekker: [string, string, string | null][],
  aar: { fra: string; til: string },
  forrige: { fra: string; til: string } | null,
): string {
  const hoved = `<tr><th>DKK</th><th>${aar.fra} – ${aar.til}</th>${forrige ? `<th>${forrige.fra} – ${forrige.til}</th>` : ''}</tr>`;
  const linjer = raekker.map(([tekst, iaar, sidste]) => `<tr><td>${tekst}</td><td>${iaar}</td>${forrige ? `<td>${sidste ?? ''}</td>` : ''}</tr>`);
  return ['<table>', hoved, ...linjer, '</table>'].join('\n');
}

function escape(tekst: string): string {
  return tekst.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
