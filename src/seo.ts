const SITE = "https://www.aplusrevision.dk";

export type SeoSide = {
  title: string;
  description: string;
  robots: "index,follow" | "noindex,follow";
};

const da: Record<string, SeoSide> = {
  "/": {
    title: "Bogføring og årsregnskab i København | A+ Revision",
    description:
      "Løbende bogføring fra 895 kr. om måneden. Årsregnskab fra 4.995 kr. Skat og moms. Én kontaktperson. Ring 50 29 51 59.",
    robots: "index,follow",
  },
  "/services": {
    title: "Bogføring, årsregnskab, skat og moms | A+ Revision",
    description:
      "Vi overtager bogføringen i Dinero, Billy eller e-conomic. Årsregnskab, selvangivelse, moms og rådgivning. Prisen står på siden.",
    robots: "index,follow",
  },
  "/services/bookkeeping": {
    title: "Løbende bogføring fra 895 kr. | A+ Revision",
    description:
      "Vi overtager bogføringen i Dinero, Billy eller e-conomic. Bankafstemning og moms hver måned. Fra 895 kr.",
    robots: "index,follow",
  },
  "/services/annual-accounts": {
    title: "Årsregnskab fra 4.995 kr. | A+ Revision",
    description:
      "Vi laver årsregnskabet og gør det klar til indsendelse. Du får et tydeligt tilbud, før vi starter. Fra 4.995 kr.",
    robots: "index,follow",
  },
  "/services/tax-returns": {
    title: "Selvangivelse for virksomheden | A+ Revision",
    description:
      "Hjælp til selvangivelsen. Vi gennemgår forholdene og sørger for, at den bliver sendt til tiden.",
    robots: "index,follow",
  },
  "/services/vat": {
    title: "Momsindberetning og momsregnskab | A+ Revision",
    description:
      "Momsopgørelse og indberetning. Det indgår i bogføringen eller aftales for sig. Ring 50 29 51 59.",
    robots: "index,follow",
  },
  "/services/advisory": {
    title: "Rådgivning fra 495 kr. i timen | A+ Revision",
    description:
      "Økonomisk rådgivning og sparring fra erfarne regnskabsfolk. Fra 495 kr. i timen. Man–fre kl. 9–16.",
    robots: "index,follow",
  },
  "/services/salary": {
    title: "Lønadministration og eIndkomst | A+ Revision",
    description:
      "Lønkørsel, lønsedler og indberetning til eIndkomst. Du leverer timerne, vi kører lønnen.",
    robots: "index,follow",
  },
  "/pricing": {
    title: "Priser på bogføring og årsregnskab | A+ Revision",
    description:
      "Bogføring fra 895 kr. om måneden. Årsregnskab fra 4.995 kr. Rådgivning fra 495 kr. i timen. Prisen aftales, før vi starter.",
    robots: "index,follow",
  },
  "/about": {
    title: "Om A+ Revision ApS | Bogføring i København",
    description:
      "Erfarne regnskabsfolk. Bogføring, årsregnskab, skat og moms. Ikke lovpligtig revision. Én kontaktperson.",
    robots: "index,follow",
  },
  "/contact": {
    title: "Kontakt A+ Revision | Ring 50 29 51 59",
    description:
      "Ring 50 29 51 59 eller skriv til revisor@aplusrevision.dk. Man–fre kl. 9–16. Vi svarer inden 24 timer.",
    robots: "index,follow",
  },
  "/skat-deadlines": {
    title: "Frister for moms, skat og årsrapport | A+ Revision",
    description:
      "Frister for moms, A-skat, selvangivelse og årsrapport. Vi holder styr på datoerne, når vi fører bogføringen.",
    robots: "index,follow",
  },
};

const en: Record<string, SeoSide> = {
  "/": {
    title: "Bookkeeping and annual accounts in Copenhagen | A+",
    description:
      "Monthly bookkeeping from DKK 895. Annual accounts from DKK 4,995. Tax and VAT. One contact person. Call +45 50 29 51 59.",
    robots: "index,follow",
  },
  "/services": {
    title: "Bookkeeping, annual accounts, tax and VAT | A+",
    description:
      "We take over the books in Dinero, Billy or e-conomic. Annual accounts, tax returns, VAT and advice. Prices are on the page.",
    robots: "index,follow",
  },
  "/services/bookkeeping": {
    title: "Monthly bookkeeping from DKK 895 | A+ Revision",
    description:
      "We take over the bookkeeping in Dinero, Billy or e-conomic. Bank reconciliation and VAT every month. From DKK 895.",
    robots: "index,follow",
  },
  "/services/annual-accounts": {
    title: "Annual accounts from DKK 4,995 | A+ Revision",
    description:
      "We prepare the annual accounts and make them ready to file. You get a clear price before we start. From DKK 4,995.",
    robots: "index,follow",
  },
  "/services/tax-returns": {
    title: "Tax return for your business | A+ Revision",
    description:
      "Help with the tax return. We review the figures and file it on time.",
    robots: "index,follow",
  },
  "/services/vat": {
    title: "VAT returns and VAT accounts | A+ Revision",
    description:
      "VAT calculation and filing. Included in the bookkeeping, or agreed separately. Call +45 50 29 51 59.",
    robots: "index,follow",
  },
  "/services/advisory": {
    title: "Advice from DKK 495 an hour | A+ Revision",
    description:
      "Financial advice from experienced bookkeepers. From DKK 495 an hour. Monday to Friday, 9–16.",
    robots: "index,follow",
  },
  "/services/salary": {
    title: "Payroll and eIndkomst | A+ Revision",
    description:
      "Payroll, payslips and filing to eIndkomst. You send the hours, we run the payroll.",
    robots: "index,follow",
  },
  "/pricing": {
    title: "Prices for bookkeeping and accounts | A+ Revision",
    description:
      "Bookkeeping from DKK 895 a month. Annual accounts from DKK 4,995. Advice from DKK 495 an hour. The price is agreed first.",
    robots: "index,follow",
  },
  "/about": {
    title: "About A+ Revision ApS | Bookkeeping in Copenhagen",
    description:
      "Experienced bookkeepers. Bookkeeping, annual accounts, tax and VAT. Not statutory audit. One contact person.",
    robots: "index,follow",
  },
  "/contact": {
    title: "Contact A+ Revision | Call +45 50 29 51 59",
    description:
      "Call +45 50 29 51 59 or email revisor@aplusrevision.dk. Monday to Friday, 9–16. We reply within 24 hours.",
    robots: "index,follow",
  },
  "/skat-deadlines": {
    title: "Deadlines for VAT, tax and accounts | A+ Revision",
    description:
      "Deadlines for VAT, A-tax, the tax return and the annual accounts. We track the dates when we keep the books.",
    robots: "index,follow",
  },
};

const mangler: Record<"da" | "en", SeoSide> = {
  da: {
    title: "Siden findes ikke | A+ Revision",
    description: "Siden findes ikke. Se ydelser, priser og kontakt på aplusrevision.dk.",
    robots: "noindex,follow",
  },
  en: {
    title: "Page not found | A+ Revision",
    description: "This page does not exist. See services, prices and contact at aplusrevision.dk.",
    robots: "noindex,follow",
  },
};

export function seoFor(pathname: string, language: "da" | "en"): SeoSide & { canonical: string } {
  const sti = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname || "/";
  const tabel = language === "en" ? en : da;
  const side = tabel[sti] ?? mangler[language];
  const synlig = sti === "/" ? "/" : `${sti}/`;
  return { ...side, canonical: `${SITE}${synlig}` };
}
