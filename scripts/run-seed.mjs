import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = resolve(root, 'node_modules/.cache/inventory-seed.mjs');
mkdirSync(dirname(outFile), { recursive: true });

const result = await build({
  entryPoints: [resolve(root, 'scripts/seed-inventory.mts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node18',
  alias: { '@': resolve(root, 'src') },
  write: false,
  logLevel: 'silent',
});

writeFileSync(outFile, result.outputFiles[0].text, 'utf8');
await import(pathToFileURL(outFile).href);