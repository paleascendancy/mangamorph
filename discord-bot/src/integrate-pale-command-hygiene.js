import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './pale-command-hygiene.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { sanitizePaleCommands } from './pale-command-hygiene.js';"
  );
  changed = true;
}

if (!source.includes('await sanitizePaleCommands(guild)')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  await sanitizePaleCommands(guild).catch((error) => {\n    console.error('[PA-COMMANDS] Falha na higiene de comandos:', error);\n  });"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[PA-COMMANDS] Higiene de comandos integrada.');
} else {
  console.log('[PA-COMMANDS] Higiene já integrada.');
}
