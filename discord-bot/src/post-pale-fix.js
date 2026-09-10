import 'dotenv/config';
import { ChannelType, Client, GatewayIntentBits } from 'discord.js';

const { DISCORD_TOKEN } = process.env;
const PALE_GUILD_ID = '1513757281311916042';

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(PALE_GUILD_ID).catch(() => null);
    if (!guild) return;

    const me = await guild.members.fetchMe().catch(() => null);
    if (me?.manageable) {
      await me.setNickname('Pale Ascendancy', 'Identidade visual do bot neste servidor').catch(() => {});
    }

    const roles = await guild.roles.fetch();
    const memberRole = roles.find((role) => normalize(role.name) === 'membro') || null;
    const channels = await guild.channels.fetch();

    const suggestions = channels.find((channel) =>
      channel?.type === ChannelType.GuildText && normalize(channel.name) === 'sugestoes'
    ) || null;

    if (suggestions && memberRole) {
      await suggestions.permissionOverwrites.edit(memberRole.id, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
        SendMessagesInThreads: true,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        AddReactions: true
      }).catch(() => {});
    }

    const humanRoles = [...roles.values()]
      .filter((role) => role && !role.managed && role.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map((role) => `${role.position}:${role.name}`)
      .join(' | ');

    const categories = [...channels.values()]
      .filter((channel) => channel?.type === ChannelType.GuildCategory)
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map((channel) => `${channel.rawPosition}:${channel.name}`)
      .join(' | ');

    console.log(`[PA-VERIFY] CATEGORIES ${categories}`);
    console.log(`[PA-VERIFY] HUMAN_ROLES ${humanRoles}`);
    console.log('[PA-VERIFY] Ajustes finais aplicados.');
  } catch (error) {
    console.error('[PA-VERIFY] Falha:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
