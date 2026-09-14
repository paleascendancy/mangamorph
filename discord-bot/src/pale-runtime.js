import { ChannelType } from 'discord.js';
import { setupPaleWelcome } from './pale.js';
import { setupPaleCommunity } from './pale-community.js';
import { setupPaleGrowth } from './pale-growth.js';
import { setupPalePanelEditor } from './pale-panel-editor.js';

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export async function setupPaleRuntime(guild) {
  const botUser = guild.client.user;
  if (botUser?.username !== 'rimuru-bot') {
    await botUser.setUsername('rimuru-bot').catch((error) => {
      console.warn('[RIMURU] Não foi possível alterar o username global agora:', error?.message || error);
    });
  }
  botUser?.setActivity('Pale Ascendancy • editores & designers');

  const me = await guild.members.fetchMe().catch(() => null);
  if (me?.manageable && me.nickname !== 'rimuru-bot') {
    await me.setNickname('rimuru-bot', 'Identidade visual do assistente da Pale Ascendancy').catch(() => {});
  }

  await setupPaleGrowth(guild).catch((error) => {
    console.error('[PA-GROWTH] Falha ao sincronizar painéis públicos:', error);
  });

  await setupPalePanelEditor(guild).catch((error) => {
    console.error('[PA-PANEL] Falha ao preparar editor de painéis:', error);
  });

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

  console.log('[Pale Ascendancy] Runtime preparado com rimuru-bot.');
}
