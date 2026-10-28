import { describe, expect, it } from 'vitest';
import { indlaesSaft } from './saft';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:StandardAuditFile-Taxation-Financial:DK">
  <GeneralLedgerEntries>
    <Journal>
      <Transaction>
        <TransactionID>SAFT-104</TransactionID>
        <TransactionDate>2024-09-15</TransactionDate>
        <Description>Salg &amp; levering</Description>
        <Line>
          <AccountID>1000</AccountID>
          <DebitAmount>1.250,00</DebitAmount>
        </Line>
        <Line>
          <Description>Modpost</Description>
          <AccountID>2000</AccountID>
          <CreditAmount>1.250,00</CreditAmount>
        </Line>
      </Transaction>
    </Journal>
  </GeneralLedgerEntries>
</AuditFile>`;

describe('SAF-T-import', () => {
  it('indlæser alle linjer på samme transaktion, men kun ved første indlæsning', () => {
    const mapping = [
      { kildeKonto: '1000', konto: '1010' },
      { kildeKonto: '2000', konto: '5820' },
    ];
    const foerste = indlaesSaft(xml, mapping);

    expect(foerste.nye).toHaveLength(2);
    expect(foerste.nye[0]).toMatchObject({
      kilde: 'saft',
      bilagsnummer: 'SAFT-104',
      dato: '2024-09-15',
      tekst: 'Salg & levering',
      kildeKonto: '1000',
      konto: '1010',
      beloeb: 125_000,
    });
    expect(foerste.nye[1]).toMatchObject({
      kilde: 'saft',
      bilagsnummer: 'SAFT-104',
      tekst: 'Modpost',
      kildeKonto: '2000',
      konto: '5820',
      beloeb: -125_000,
    });

    const anden = indlaesSaft(
      xml,
      mapping,
      foerste.nye.map(({ kilde, bilagsnummer }) => ({ kilde, bilagsnummer })),
    );
    expect(anden.nye).toHaveLength(0);
    expect(anden.sprungetOver).toBe(2);
  });

  it('bogfører ikke en konto, der ikke er mappet', () => {
    const resultat = indlaesSaft(xml);
    expect(resultat.nye).toEqual([]);
    expect(resultat.undtagelser).toHaveLength(2);
    expect(resultat.undtagelser[0]).toMatchObject({
      kilde: 'saft',
      bilagsnummer: 'SAFT-104',
      kildeKonto: '1000',
    });
    expect(resultat.undtagelser[0].aarsag).toContain('ikke mappet');
  });
});
