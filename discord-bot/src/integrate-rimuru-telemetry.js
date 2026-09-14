import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('./index.js', import.meta.url);
let source = await readFile(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './rimuru-telemetry.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { installRimuruTelemetry } from './rimuru-telemetry.js';"
  );
  changed = true;
}

if (!source.includes('installRimuruTelemetry(client);')) {
  const marker = 'const client = new Client({';
  const start = source.indexOf(marker);
  if (start === -1) throw new Error('[RIMURU-TELEMETRY] criação do Client não encontrada.');
  const end = source.indexOf('\n});', start);
  if (end === -1) throw new Error('[RIMURU-TELEMETRY] fim da criação do Client não encontrado.');
  const insertAt = end + 4;
  source = `${source.slice(0, insertAt)}\n\ninstallRimuruTelemetry(client);${source.slice(insertAt)}`;
  changed = true;
}

if (changed) {
  await writeFile(indexPath, source, 'utf8');
  console.log('[RIMURU-TELEMETRY] integração aplicada ao runtime.');
} else {
  console.log('[RIMURU-TELEMETRY] integração já presente.');
}
