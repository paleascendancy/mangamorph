import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');
const PALE_GUILD_ID = '1513757281311916042';

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './suggestions.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupSuggestions, handleSuggestionInteraction } from './suggestions.js';"
  );
  changed = true;
}

if (!source.includes('guild.id !== PALE_GUILD_ID) {\n    await setupSuggestions')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  if (guild.id !== PALE_GUILD_ID) {\n    await setupSuggestions(guild, client).catch((error) => {\n      console.error(`Falha ao preparar sugestões em ${guild.name}:`, error);\n    });\n  }\n"
  );
  changed = true;
}

if (!source.includes('interaction.guildId !== PALE_GUILD_ID && await handleSuggestionInteraction')) {
  source = source.replace(
    "    if (!interaction.inGuild()) return;",
    "    if (!interaction.inGuild()) return;\n\n    if (interaction.guildId !== PALE_GUILD_ID && await handleSuggestionInteraction(interaction)) return;"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source);
  console.log('Suggestions integration: MangaMorph preservado; Pale usa somente sugestões PA.');
} else {
  console.log('Suggestions integration: já aplicada.');
}
