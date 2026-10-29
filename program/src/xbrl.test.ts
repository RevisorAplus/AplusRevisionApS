import { describe, expect, it } from 'vitest';
import { CVR_SCHEME, NAVNERUM, SCHEMA_REF, bygIxbrl, kronerFraOere, type IxbrlInput } from './xbrl';

const kr = (kroner: number) => Math.round(kroner * 100);

function input(over: Partial<IxbrlInput> = {}): IxbrlInput {
  return {
    selskab: 'Eksempel ApS',
    cvr: '12345678',
    fra: '2025-01-01',
    til: '2025-12-31',
    foersteAar: true,
    profitLossOere: 15_032_001,
    assetsOere: kr(400_000),
    equityOere: kr(190_320.01),
    liabilitiesAndEquityOere: kr(400_000),
    ...over,
  };
}

const sidsteAar = { profitLossOere: kr(-12_500), assetsOere: kr(250_000), equityOere: kr(40_000), liabilitiesAndEquityOere: kr(250_000) };

describe('inline XBRL', () => {
  it('afviser et CVR-nummer på 7 cifre og giver intet dokument', () => {
    const resultat = bygIxbrl(input({ cvr: '1234567' }));
    expect(resultat.xml).toBeNull();
    expect(resultat.fejl).toContain('CVR');
    expect(bygIxbrl(input({ cvr: '1234567A' })).xml).toBeNull();
    expect(bygIxbrl(input({ cvr: '123456789' })).xml).toBeNull();
  });

  it('laver et dokument med schemaRef, cvr-scheme, ProfitLoss og Ingen bistand, når året stemmer', () => {
    const { xml, fejl } = bygIxbrl(input());
    expect(fejl).toBeNull();
    expect(xml).not.toBeNull();
    const dokument = xml ?? '';
    expect(dokument).toContain(`xlink:href="${SCHEMA_REF}"`);
    expect(dokument.match(/<link:schemaRef\b[^>]*xlink:href="([^"]+)"/)?.[1]).toBe(
      'http://archprod.service.eogs.dk/taxonomy/20241001/entryDanishGAAPBalanceSheetAccountFormIncomeStatementByNatureIncludingManagementsReview20241001.xsd',
    );
    expect(dokument.match(/<link:schemaRef\b/g)).toHaveLength(1);
    expect(dokument).not.toContain('linkbaseRef');
    expect(dokument).toContain(`<xbrli:identifier scheme="${CVR_SCHEME}">12345678</xbrli:identifier>`);
    expect(CVR_SCHEME).toBe('http://www.dcca.dk/cvr');
    expect(dokument).toContain('name="fsa:ProfitLoss"');
    expect(dokument).toContain('Ingen bistand');
    for (const navn of [
      'gsd:NameOfReportingEntity',
      'gsd:IdentificationNumberCvrOfReportingEntity',
      'gsd:InformationOnTypeOfSubmittedReport',
      'gsd:ReportingPeriodStartDate',
      'gsd:ReportingPeriodEndDate',
      'fsa:ClassOfReportingEntity',
      'cmn:TypeOfAuditorAssistance',
      'fsa:Assets',
      'fsa:Equity',
      'fsa:LiabilitiesAndEquity',
    ]) {
      expect(dokument).toContain(`name="${navn}"`);
    }
    expect(dokument).toContain('>Årsrapport</ix:nonNumeric>');
    expect(dokument).toContain('>Regnskabsklasse B</ix:nonNumeric>');
    for (const [praefiks, uri] of Object.entries(NAVNERUM)) expect(dokument).toContain(`xmlns:${praefiks}="${uri}"`);
    expect(dokument).toContain('<xbrli:measure>iso4217:DKK</xbrli:measure>');
    expect(dokument).toContain('<xbrli:startDate>2025-01-01</xbrli:startDate><xbrli:endDate>2025-12-31</xbrli:endDate>');
    expect(dokument).toContain('<xbrli:instant>2025-12-31</xbrli:instant>');
  });

  it('skriver beløb i kroner med to decimaler uden at tabe en øre', () => {
    expect(kronerFraOere(15_032_001)).toBe('150320.01');
    expect(kronerFraOere(5)).toBe('0.05');
    expect(kronerFraOere(-1_250_000)).toBe('12500.00');
    const dokument = bygIxbrl(input()).xml ?? '';
    expect(dokument).toMatch(/name="fsa:ProfitLoss"[^>]*>150320\.01</);
    expect(dokument).toMatch(/name="fsa:Equity"[^>]*>190320\.01</);
  });

  it('markerer et negativt resultat med fortegn', () => {
    const dokument = bygIxbrl(input({ profitLossOere: kr(-12_500) })).xml ?? '';
    expect(dokument).toMatch(/name="fsa:ProfitLoss"[^>]*sign="-"[^>]*>12500\.00</);
  });

  it('afviser en rapport, hvor aktiver og passiver ikke er det samme tal', () => {
    const resultat = bygIxbrl(input({ assetsOere: kr(400_000) + 1 }));
    expect(resultat.xml).toBeNull();
    expect(resultat.fejl).toContain('Aktiver og passiver');
    const negativ = bygIxbrl(input({ assetsOere: kr(-1_000), liabilitiesAndEquityOere: kr(-1_000) }));
    expect(negativ.xml).toBeNull();
    expect(negativ.fejl).toContain('negative');
  });

  it('har ingen forrige periode i første år', () => {
    const dokument = bygIxbrl(input()).xml ?? '';
    expect(dokument).not.toContain('contextRef="forrige');
    expect(dokument).not.toContain('id="forrige');
    expect(dokument.match(/<xbrli:context /g)).toHaveLength(2);
    expect(dokument.match(/name="fsa:ProfitLoss"/g)).toHaveLength(1);
    const medTal = bygIxbrl(input({ sidsteAar }));
    expect(medTal.xml).toBeNull();
    expect(medTal.fejl).toContain('Første regnskabsår');
  });

  it('har de fire tal for forrige periode i et senere år', () => {
    const { xml, fejl } = bygIxbrl(input({ foersteAar: false, sidsteAar }));
    expect(fejl).toBeNull();
    const dokument = xml ?? '';
    expect(dokument).toContain('<xbrli:startDate>2024-01-01</xbrli:startDate><xbrli:endDate>2024-12-31</xbrli:endDate>');
    expect(dokument).toContain('<xbrli:instant>2024-12-31</xbrli:instant>');
    for (const navn of ['fsa:ProfitLoss', 'fsa:Assets', 'fsa:Equity', 'fsa:LiabilitiesAndEquity']) {
      expect(dokument.match(new RegExp(`name="${navn}"`, 'g'))).toHaveLength(2);
    }
    expect(dokument).toMatch(/name="fsa:Assets" contextRef="forrigeSlut"[^>]*>250000\.00</);
    expect(bygIxbrl(input({ foersteAar: false })).xml).not.toContain('id="forrige');
    expect(bygIxbrl(input({ foersteAar: false, sidsteAar: { ...sidsteAar, assetsOere: kr(1) } })).fejl).toContain('sidste års');
  });

  it('afviser ugyldige datoer og escaper selskabets navn', () => {
    expect(bygIxbrl(input({ fra: '2025-02-30' })).xml).toBeNull();
    expect(bygIxbrl(input({ fra: '2026-01-01' })).xml).toBeNull();
    expect(bygIxbrl(input({ selskab: 'Hansen & Søn <ApS>' })).xml).toContain('Hansen &amp; Søn &lt;ApS&gt;');
  });
});
