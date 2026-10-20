import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { seoFor } from './src/seo';

const PUBLIC_ROUTES = [
  '/',
  '/services',
  '/services/bookkeeping',
  '/services/annual-accounts',
  '/services/tax-returns',
  '/services/vat',
  '/services/advisory',
  '/services/salary',
  '/pricing',
  '/about',
  '/contact',
  '/skat-deadlines',
];

function escapeAttr(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function erstat(html: string, monster: RegExp, til: string) {
  if (!monster.test(html)) {
    throw new Error(`Kunne ikke finde ${monster} i index.html`);
  }
  return html.replace(monster, til);
}

function medSide(html: string, sti: string) {
  const side = seoFor(sti, 'da');
  const title = escapeAttr(side.title);
  const description = escapeAttr(side.description);
  let out = html;
  out = erstat(out, /<title>[^<]*<\/title>/, `<title>${title}</title>`);
  out = erstat(
    out,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${description}" />`
  );
  out = erstat(
    out,
    /<meta name="robots" content="[^"]*"\s*\/?>/,
    `<meta name="robots" content="${side.robots}" />`
  );
  out = erstat(
    out,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${side.canonical}" />`
  );
  out = erstat(
    out,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${title}" />`
  );
  out = erstat(
    out,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${description}" />`
  );
  out = erstat(
    out,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${side.canonical}" />`
  );
  return out;
}

function githubPagesSpa(): Plugin {
  return {
    name: 'github-pages-spa',
    apply: 'build',
    closeBundle() {
      const dist = resolve(process.cwd(), 'dist');
      const index = resolve(dist, 'index.html');
      if (!existsSync(index)) return;
      const kilde = readFileSync(index, 'utf8');
      for (const sti of PUBLIC_ROUTES) {
        const html = medSide(kilde, sti);
        if (sti === '/') {
          writeFileSync(index, html);
          continue;
        }
        const dir = resolve(dist, sti.slice(1));
        mkdirSync(dir, { recursive: true });
        writeFileSync(resolve(dir, 'index.html'), html);
      }
      const mangler = seoFor('/findes-ikke', 'da');
      let ikkeFundet = medSide(kilde, '/');
      ikkeFundet = erstat(
        ikkeFundet,
        /<title>[^<]*<\/title>/,
        `<title>${escapeAttr(mangler.title)}</title>`
      );
      ikkeFundet = erstat(
        ikkeFundet,
        /<meta name="description" content="[^"]*"\s*\/?>/,
        `<meta name="description" content="${escapeAttr(mangler.description)}" />`
      );
      ikkeFundet = erstat(
        ikkeFundet,
        /<meta name="robots" content="[^"]*"\s*\/?>/,
        `<meta name="robots" content="noindex, follow" />`
      );
      ikkeFundet = erstat(
        ikkeFundet,
        /<link rel="canonical" href="[^"]*"\s*\/?>/,
        ''
      );
      writeFileSync(resolve(dist, '404.html'), ikkeFundet);
    },
  };
}

export default defineConfig({
  plugins: [react(), githubPagesSpa()],
  base: '/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
