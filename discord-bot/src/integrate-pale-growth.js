import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './pale-growth.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupPaleGrowth, handlePaleGrowthInteraction } from './pale-growth.js';"
  );
  changed = true;
}

if (!source.includes('await setupPaleGrowth(guild)')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  await setupPaleGrowth(guild).catch((error) => {\n    console.error('[PA-GROWTH] Falha ao preparar crescimento/onboarding:', error);\n  });"
  );
  changed = true;
}

if (!source.includes('await handlePaleGrowthInteraction(interaction)')) {
  source = source.replace(
    '    if (!interaction.inGuild()) return;',
    '    if (!interaction.inGuild()) return;\n\n    if (await handlePaleGrowthInteraction(interaction)) return;'
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[PA-GROWTH] Módulo de crescimento integrado ao runtime.');
} else {
  console.log('[PA-GROWTH] Integração já aplicada.');
}
