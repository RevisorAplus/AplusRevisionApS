import type { BilagPost } from './bilag';

export type LaastPeriode = {
  fra: string;
  til: string;
};

export function periodeLaast(dato: string, laaste: LaastPeriode[]): boolean {
  return laaste.some((periode) => dato >= periode.fra && dato <= periode.til);
}

export function proevBilag(laaste: LaastPeriode[], post: Pick<BilagPost, 'dato'>): string | null {
  if (periodeLaast(post.dato, laaste)) {
    return 'Perioden er låst. Bilaget kan ikke bogføres eller tilbageføres.';
  }
  return null;
}
