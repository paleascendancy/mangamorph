import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './pale-recruitment.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupPaleRecruitment, handlePaleRecruitmentInteraction } from './pale-recruitment.js';"
  );
  changed = true;
}

if (!source.includes('await setupPaleRecruitment(guild)')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  await setupPaleRecruitment(guild).catch((error) => {\n    console.error('[PA-RECRUIT] Falha ao configurar recrutamento:', error);\n  });"
  );
  changed = true;
}

if (!source.includes('await handlePaleRecruitmentInteraction(interaction)')) {
  source = source.replace(
    '    if (!interaction.inGuild()) return;',
    '    if (!interaction.inGuild()) return;\n\n    if (await handlePaleRecruitmentInteraction(interaction)) return;'
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[PA-RECRUIT] Sistema de recrutamento integrado ao index.js.');
} else {
  console.log('[PA-RECRUIT] Sistema de recrutamento já integrado.');
}
