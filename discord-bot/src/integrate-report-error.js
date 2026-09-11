import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './report-error.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupReportError, handleReportErrorInteraction } from './report-error.js';"
  );
  changed = true;
}

if (!source.includes('await setupReportError(guild, client)')) {
  const marker = 'async function setupGuild(guild) {';
  if (!source.includes(marker)) throw new Error('setupGuild não encontrado em index.js.');
  source = source.replace(
    marker,
    `${marker}\n  await setupReportError(guild, client).catch((error) => {\n    console.error(\`Falha ao configurar reportar-erro em \${guild.name}:\`, error);\n  });`
  );
  changed = true;
}

if (!source.includes('await handleReportErrorInteraction(interaction)')) {
  const marker = '    if (!interaction.inGuild()) return;';
  if (!source.includes(marker)) throw new Error('Handler de interações não encontrado em index.js.');
  source = source.replace(
    marker,
    `${marker}\n\n    if (await handleReportErrorInteraction(interaction)) return;`
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[REPORT-ERROR] Sistema integrado ao index.js.');
} else {
  console.log('[REPORT-ERROR] Sistema já integrado.');
}
