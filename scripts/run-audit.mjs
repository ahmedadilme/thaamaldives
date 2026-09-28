import { build } from 'esbuild';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const outfile = resolve(root, 'node_modules/.cache/inventory-audit.mjs');

await build({
  entryPoints: [resolve(root, 'scripts/audit-mapping.mts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile,
  alias: {
    '@': resolve(root, 'src'),
  },
  logLevel: 'warning',
});

await import(pathToFileURL(outfile).href);
