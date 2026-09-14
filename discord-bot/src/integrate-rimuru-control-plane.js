import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './rimuru-control-plane.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { installRimuruControlPlane, rimuruControlGate } from './rimuru-control-plane.js';"
  );
  changed = true;
}

if (!source.includes('installRimuruControlPlane(client);')) {
  const marker = 'const client = new Client({';
  const start = source.indexOf(marker);
  if (start !== -1) {
    const end = source.indexOf('});', start);
    if (end !== -1) {
      const pos = end + 3;
      source = source.slice(0, pos) + '\n\ninstallRimuruControlPlane(client);' + source.slice(pos);
      changed = true;
    }
  }
}

const guard = "if (!interaction.inGuild()) return;\n    if (!(await rimuruControlGate(interaction))) return;";
source = source.replace(/if \(!interaction\.inGuild\(\)\) return;(?!\n\s*if \(!\(await rimuruControlGate)/g, () => {
  changed = true;
  return guard;
});

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[RIMURU-CONTROL] integração aplicada ao runtime.');
} else {
  console.log('[RIMURU-CONTROL] integração já aplicada.');
}
