import type { BilagPost } from './bilag';

export type SporHandling = 'bogfoert' | 'tilbagefoert';

export type SporLinje = {
  tidspunkt: string;
  handling: SporHandling;
  bilagsId: string;
  tekst: string;
};

export function registrerBogfoering(spor: SporLinje[], bilag: BilagPost, tidspunkt?: string): SporLinje[] {
  return [
    ...spor,
    {
      tidspunkt: tidspunkt ?? new Date().toISOString(),
      handling: 'bogfoert',
      bilagsId: bilag.id,
      tekst: bilag.tekst,
    },
  ];
}

export function registrerTilbagefoering(
  spor: SporLinje[],
  original: BilagPost,
  modpost: BilagPost,
  tidspunkt?: string,
): SporLinje[] {
  return [
    ...spor,
    {
      tidspunkt: tidspunkt ?? new Date().toISOString(),
      handling: 'tilbagefoert',
      bilagsId: original.id,
      tekst: modpost.tekst,
    },
  ];
}

export function sporFor(bilagId: string, spor: SporLinje[]): SporLinje[] {
  return spor.filter((linje) => linje.bilagsId === bilagId);
}
