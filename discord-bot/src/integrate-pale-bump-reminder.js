import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './pale-bump-reminder.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupPaleBumpReminder } from './pale-bump-reminder.js';"
  );
  changed = true;
}

if (!source.includes('await setupPaleBumpReminder(guild)')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  await setupPaleBumpReminder(guild).catch((error) => {\n    console.error('[PA-BUMP] Falha ao configurar lembrete:', error);\n  });"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[PA-BUMP] Integração de lembrete aplicada ao index.js.');
} else {
  console.log('[PA-BUMP] Integração de lembrete já aplicada.');
}
