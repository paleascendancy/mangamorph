import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './pale-panel-editor.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupPalePanelEditor } from './pale-panel-editor.js';"
  );
  changed = true;
}

if (!source.includes("[PA-PANEL] Falha ao inicializar editor visual")) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  await setupPalePanelEditor(guild).catch((error) => {\n    console.error('[PA-PANEL] Falha ao inicializar editor visual:', error);\n  });"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[PA-PANEL] Integração garantida no início do setupGuild.');
} else {
  console.log('[PA-PANEL] Integração já garantida.');
}
