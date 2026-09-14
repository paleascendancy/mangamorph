import { ChannelType } from 'discord.js';
import { setupPaleWelcome } from './pale.js';
import { setupPaleCommunity } from './pale-community.js';

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export async function setupPaleRuntime(guild) {
  const me = await guild.members.fetchMe().catch(() => null);
  if (me?.manageable && me.nickname !== 'rimuru-bot') {
    await me.setNickname('rimuru-bot', 'Identidade visual do assistente da Pale Ascendancy').catch(() => {});
  }

  await setupPaleWelcome(guild).catch((error) => {
    console.error('[PA-WELCOME] Falha ao preparar boas-vindas:', error);
  });

  const roles = await guild.roles.fetch().catch(() => null);
  const channels = await guild.channels.fetch().catch(() => null);
  if (!roles || !channels) return;

  const memberRole = roles.find((role) => normalize(role.name) === 'membro') || null;
  const suggestions = channels.find((channel) =>
    channel?.type === ChannelType.GuildText && normalize(channel.name) === 'sugestoes'
  ) || null;

  if (suggestions && memberRole) {
    await suggestions.permissionOverwrites.edit(memberRole.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
      SendMessagesInThreads: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      AddReactions: true
    }).catch(() => {});
  }

  await setupPaleCommunity(guild).catch((error) => {
    console.error('[Pale Ascendancy] Falha ao preparar comunidade:', error);
  });

  console.log(`[Pale Ascendancy] Runtime preparado com rimuru-bot.`);
}
