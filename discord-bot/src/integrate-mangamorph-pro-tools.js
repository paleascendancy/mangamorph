import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');
const PALE_GUILD_ID = '1513757281311916042';

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './mangamorph-pro-tools.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupMangaMorphProTools, handleMangaMorphProToolsInteraction } from './mangamorph-pro-tools.js';"
  );
  changed = true;
}

const setupMarker = `guild.id !== '${PALE_GUILD_ID}'`;
if (!source.includes(`${setupMarker}) {\n    await setupMangaMorphProTools`)) {
  const proBlock = `  if (guild.id !== '${PALE_GUILD_ID}') {\n    await setupMangaMorphProTools(guild).catch((error) => {\n      console.error(\`Falha ao registrar ferramentas avançadas em \${guild.name}:\`, error);\n    });\n  }\n`;
  source = source.replace('async function setupGuild(guild) {', `async function setupGuild(guild) {\n${proBlock}`);
  changed = true;
}

const handlerMarker = `interaction.guildId !== '${PALE_GUILD_ID}' && await handleMangaMorphProToolsInteraction`;
if (!source.includes(handlerMarker)) {
  source = source.replace(
    '    if (!interaction.inGuild()) return;',
    `    if (!interaction.inGuild()) return;\n\n    if (interaction.guildId !== '${PALE_GUILD_ID}' && await handleMangaMorphProToolsInteraction(interaction, client)) return;`
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[MM-PRO] Ferramentas avançadas preservadas fora da Pale.');
} else {
  console.log('[MM-PRO] Ferramentas avançadas já integradas.');
}
