import 'dotenv/config';
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits
} from 'discord.js';

const { DISCORD_TOKEN, WELCOME_CHANNEL_ID, MEMBER_ROLE_ID } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember]
});

async function findWelcomeChannel(guild) {
  if (WELCOME_CHANNEL_ID) {
    const byId = await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
    if (byId?.type === ChannelType.GuildText) return byId;
  }

  const channels = await guild.channels.fetch();
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildText &&
    ['boasvindas', 'bemvindo', 'welcome'].includes(normalize(channel.name))
  ) || null;
}

async function findMemberRole(guild) {
  if (MEMBER_ROLE_ID) {
    const byId = await guild.roles.fetch(MEMBER_ROLE_ID).catch(() => null);
    if (byId) return byId;
  }

  const roles = await guild.roles.fetch();
  return roles.find((role) => normalize(role.name) === 'membro') || null;
}

async function setupWelcome(guild) {
  const channels = await guild.channels.fetch();
  let startCategory = channels.find((channel) =>
    channel?.type === ChannelType.GuildCategory && normalize(channel.name).includes('inicio')
  ) || null;

  if (!startCategory) {
    startCategory = await guild.channels.create({
      name: '「 MM 」 INÍCIO',
      type: ChannelType.GuildCategory,
      reason: 'Estrutura inicial do MangaMorph'
    });
  }

  let welcome = await findWelcomeChannel(guild);
  if (!welcome) {
    welcome = await guild.channels.create({
      name: '👋・boas-vindas',
      type: ChannelType.GuildText,
      parent: startCategory.id,
      topic: 'Novos membros do MangaMorph • canal somente leitura',
      reason: 'Canal oficial de boas-vindas do MangaMorph'
    });
    console.log(`[${guild.name}] Canal de boas-vindas criado.`);
  } else {
    if (welcome.parentId !== startCategory.id) {
      await welcome.setParent(startCategory.id, { lockPermissions: false });
    }
    await welcome.setTopic('Novos membros do MangaMorph • canal somente leitura').catch(() => {});
  }

  const memberRole = await findMemberRole(guild);

  const denyInteraction = {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    AddReactions: false
  };

  await welcome.permissionOverwrites.edit(
    guild.roles.everyone.id,
    denyInteraction,
    { reason: 'Boas-vindas somente leitura' }
  );

  if (memberRole) {
    await welcome.permissionOverwrites.edit(
      memberRole.id,
      {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: false,
        SendMessagesInThreads: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        AddReactions: false
      },
      { reason: 'Bloquear mensagens de membros em boas-vindas' }
    );
  }

  await welcome.permissionOverwrites.edit(
    client.user.id,
    {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      EmbedLinks: true,
      AttachFiles: true,
      ManageMessages: true
    },
    { reason: 'Permitir mensagens automáticas do bot em boas-vindas' }
  );

  console.log(`[${guild.name}] Boas-vindas configurado como canal somente leitura.`);
}

client.once('ready', async () => {
  try {
    for (const guild of client.guilds.cache.values()) {
      await setupWelcome(guild);
    }
    await client.destroy();
    process.exit(0);
  } catch (error) {
    console.error('Falha ao configurar boas-vindas:', error);
    await client.destroy().catch(() => {});
    process.exit(1);
  }
});

client.login(DISCORD_TOKEN);
