import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './pale.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { PALE_GUILD_ID, handlePaleInteraction, handlePaleMemberAdd } from './pale.js';"
  );
  changed = true;
}

if (!source.includes('if (guild.id === PALE_GUILD_ID) return;')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    'async function setupGuild(guild) {\n  if (guild.id === PALE_GUILD_ID) return;'
  );
  changed = true;
}

if (!source.includes('await handlePaleMemberAdd(member)')) {
  source = source.replace(
    'client.on(Events.GuildMemberAdd, async (member) => {\n  try {',
    "client.on(Events.GuildMemberAdd, async (member) => {\n  try {\n    if (member.guild.id === PALE_GUILD_ID) {\n      await handlePaleMemberAdd(member);\n      return;\n    }"
  );
  changed = true;
}

if (!source.includes('await handlePaleInteraction(interaction)')) {
  source = source.replace(
    '    if (!interaction.inGuild()) return;',
    '    if (!interaction.inGuild()) return;\n\n    if (await handlePaleInteraction(interaction)) return;'
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source);
  console.log('Pale Ascendancy integration: index.js preparado.');
} else {
  console.log('Pale Ascendancy integration: já aplicada.');
}
