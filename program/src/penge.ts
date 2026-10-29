const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function erIsoDato(vaerdi: string): boolean {
  const match = ISO.exec(vaerdi);
  if (!match) return false;
  const aar = Number(match[1]);
  const maaned = Number(match[2]);
  const dag = Number(match[3]);
  const dato = new Date(Date.UTC(aar, maaned - 1, dag));
  return (
    dato.getUTCFullYear() === aar &&
    dato.getUTCMonth() === maaned - 1 &&
    dato.getUTCDate() === dag
  );
}

export function parseDato(raa: string): string | null {
  const tekst = raa.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tekst);
  if (iso) return erIsoDato(tekst) ? tekst : null;
  const dansk = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(tekst);
  if (!dansk) return null;
  const dag = dansk[1].padStart(2, '0');
  const maaned = dansk[2].padStart(2, '0');
  const kandidat = `${dansk[3]}-${maaned}-${dag}`;
  return erIsoDato(kandidat) ? kandidat : null;
}

export function formatDato(iso: string): string {
  const [aar, maaned, dag] = iso.split('-');
  return `${dag}.${maaned}.${aar}`;
}

function tilUtc(iso: string): Date {
  const [aar, maaned, dag] = iso.split('-').map(Number);
  return new Date(Date.UTC(aar, maaned - 1, dag));
}

function fraUtc(dato: Date): string {
  return dato.toISOString().slice(0, 10);
}

export function dagenFoer(iso: string): string {
  const dato = tilUtc(iso);
  dato.setUTCDate(dato.getUTCDate() - 1);
  return fraUtc(dato);
}

export function laegMaanederTil(iso: string, maaneder: number): string {
  const dato = tilUtc(iso);
  const dag = dato.getUTCDate();
  dato.setUTCDate(1);
  dato.setUTCMonth(dato.getUTCMonth() + maaneder);
  const sidste = new Date(Date.UTC(dato.getUTCFullYear(), dato.getUTCMonth() + 1, 0)).getUTCDate();
  dato.setUTCDate(Math.min(dag, sidste));
  return fraUtc(dato);
}

export function erForLang(fra: string, til: string, maxMaaneder: number): boolean {
  return til > dagenFoer(laegMaanederTil(fra, maxMaaneder));
}

export function kalenderMaaneder(fra: string, til: string): number {
  const start = tilUtc(fra);
  const slut = tilUtc(til);
  return (slut.getUTCFullYear() - start.getUTCFullYear()) * 12 + (slut.getUTCMonth() - start.getUTCMonth()) + 1;
}

export function parseDanskBeloeb(raa: string): number | null {
  let tekst = raa.trim().replace(/[\s\u00a0]/g, '').replace(/kr\.?|dkk/gi, '');
  if (!tekst || tekst === '-' || tekst === '–' || tekst === '—') return null;

  let negativ = false;
  if (tekst.startsWith('(') && tekst.endsWith(')')) {
    negativ = true;
    tekst = tekst.slice(1, -1);
  }
  if (tekst.endsWith('-')) {
    negativ = true;
    tekst = tekst.slice(0, -1);
  }
  if (tekst.startsWith('-') || tekst.startsWith('−')) {
    negativ = true;
    tekst = tekst.slice(1);
  }
  if (!tekst) return null;

  let kroner: number;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(tekst)) {
    const [hel, dec = ''] = tekst.replace(/\./g, '').split(',');
    kroner = Number(hel) + Number(dec.padEnd(2, '0')) / 100;
  } else if (/^\d+(,\d{1,2})$/.test(tekst)) {
    const [hel, dec] = tekst.split(',');
    kroner = Number(hel) + Number(dec.padEnd(2, '0')) / 100;
  } else if (/^\d+\.\d{1,2}$/.test(tekst)) {
    kroner = Number(tekst);
  } else if (/^\d+$/.test(tekst)) {
    kroner = Number(tekst);
  } else {
    return null;
  }

  const oere = Math.round(kroner * 100);
  return negativ ? -oere : oere;
}

export function formatKroner(oere: number): string {
  const negativ = oere < 0;
  const abs = Math.abs(oere);
  const kroner = Math.floor(abs / 100);
  const dec = String(abs % 100).padStart(2, '0');
  const hel = String(kroner).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${negativ ? '-' : ''}${hel},${dec}`;
}
