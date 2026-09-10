import 'dotenv/config';
import { ChannelType, Client, GatewayIntentBits } from 'discord.js';

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

function channelTypeName(type) {
  const entries = Object.entries(ChannelType);
  const found = entries.find(([, value]) => value === type);
  return found?.[0] || String(type);
}

client.once('ready', async () => {
  try {
    const guild = client.guilds.cache.find((item) => normalize(item.name) === 'paleascendancy');

    if (!guild) {
      console.log('[PA-AUDIT] Servidor Pale Ascendancy não encontrado entre os servidores do bot.');
      return;
    }

    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();

    console.log(`[PA-AUDIT] START guild=${guild.name} id=${guild.id} members=${guild.memberCount}`);
    console.log('[PA-AUDIT] ROLES_START');

    [...roles.values()]
      .filter(Boolean)
      .sort((a, b) => b.position - a.position)
      .forEach((role) => {
        console.log(
          `[PA-AUDIT][ROLE] pos=${role.position} id=${role.id} name=${JSON.stringify(role.name)} managed=${role.managed} hoist=${role.hoist} mentionable=${role.mentionable} color=${role.hexColor} perms=${role.permissions.bitfield.toString()}`
        );
      });

    console.log('[PA-AUDIT] ROLES_END');
    console.log('[PA-AUDIT] CHANNELS_START');

    const categories = [...channels.values()]
      .filter((channel) => channel?.type === ChannelType.GuildCategory)
      .sort((a, b) => a.rawPosition - b.rawPosition);

    for (const category of categories) {
      console.log(`[PA-AUDIT][CATEGORY] pos=${category.rawPosition} id=${category.id} name=${JSON.stringify(category.name)}`);
      const children = [...channels.values()]
        .filter((channel) => channel && channel.parentId === category.id)
        .sort((a, b) => a.rawPosition - b.rawPosition);

      for (const channel of children) {
        console.log(
          `[PA-AUDIT][CHANNEL] pos=${channel.rawPosition} id=${channel.id} parent=${category.id} type=${channelTypeName(channel.type)} name=${JSON.stringify(channel.name)} topic=${JSON.stringify(channel.topic || '')}`
        );
      }
    }

    const uncategorized = [...channels.values()]
      .filter((channel) => channel && channel.type !== ChannelType.GuildCategory && !channel.parentId)
      .sort((a, b) => a.rawPosition - b.rawPosition);

    if (uncategorized.length) {
      console.log('[PA-AUDIT][UNCATEGORIZED]');
      for (const channel of uncategorized) {
        console.log(
          `[PA-AUDIT][CHANNEL] pos=${channel.rawPosition} id=${channel.id} parent=null type=${channelTypeName(channel.type)} name=${JSON.stringify(channel.name)} topic=${JSON.stringify(channel.topic || '')}`
        );
      }
    }

    console.log('[PA-AUDIT] CHANNELS_END');
    console.log('[PA-AUDIT] END');
  } catch (error) {
    console.error('[PA-AUDIT] Falha:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
