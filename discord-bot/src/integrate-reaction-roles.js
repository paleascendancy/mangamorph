import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');
const PALE_GUILD_ID = '1513757281311916042';

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './reaction-roles.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupReactionRoles, handleReactionRoleAdd, handleReactionRoleRemove } from './reaction-roles.js';"
  );
  changed = true;
}

if (!source.includes('GatewayIntentBits.GuildMessageReactions')) {
  source = source.replace(
    'intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],',
    'intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessageReactions],'
  );
  changed = true;
}

if (!source.includes('Partials.Reaction')) {
  source = source.replace(
    'partials: [Partials.GuildMember]',
    'partials: [Partials.GuildMember, Partials.Message, Partials.Channel, Partials.Reaction]'
  );
  changed = true;
}

if (!source.includes('guild.id !== PALE_GUILD_ID && setupReactionRoles')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  if (guild.id !== PALE_GUILD_ID) {\n    await setupReactionRoles(guild, client).catch((error) => {\n      console.error(`Falha ao preparar cargos em ${guild.name}:`, error);\n    });\n  }\n"
  );
  changed = true;
}

if (!source.includes('reaction.message.guildId !== PALE_GUILD_ID')) {
  const handlers = [
    "client.on(Events.MessageReactionAdd, async (reaction, user) => {",
    "  try {",
    "    if (reaction.message.guildId !== PALE_GUILD_ID) await handleReactionRoleAdd(reaction, user);",
    "  } catch (error) {",
    "    console.error('Falha ao processar adição de cargo por reação:', error);",
    "  }",
    "});",
    "",
    "client.on(Events.MessageReactionRemove, async (reaction, user) => {",
    "  try {",
    "    if (reaction.message.guildId !== PALE_GUILD_ID) await handleReactionRoleRemove(reaction, user);",
    "  } catch (error) {",
    "    console.error('Falha ao processar remoção de cargo por reação:', error);",
    "  }",
    "});",
    "",
    ""
  ].join('\n');

  if (!source.includes('Events.MessageReactionAdd')) {
    source = source.replace('client.on(Events.Error, (error) => {', handlers + 'client.on(Events.Error, (error) => {');
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(indexPath, source);
  console.log('Reaction roles integration: MangaMorph preservado; Pale usa somente cargos PA.');
} else {
  console.log('Reaction roles integration: já aplicada.');
}
