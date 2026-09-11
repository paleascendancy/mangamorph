import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './pale-professional-services.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupPaleProfessionalServices, handlePaleProfessionalInteraction } from './pale-professional-services.js';"
  );
  changed = true;
}

if (!source.includes('await setupPaleProfessionalServices(guild)')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  await setupPaleProfessionalServices(guild).catch((error) => {\n    console.error('[PA-PRO] Falha ao configurar área profissional:', error);\n  });"
  );
  changed = true;
}

if (!source.includes('await handlePaleProfessionalInteraction(interaction)')) {
  source = source.replace(
    '    if (!interaction.inGuild()) return;',
    '    if (!interaction.inGuild()) return;\n\n    if (await handlePaleProfessionalInteraction(interaction)) return;'
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[PA-PRO] Sistema profissional integrado ao index.js.');
} else {
  console.log('[PA-PRO] Sistema profissional já integrado.');
}
