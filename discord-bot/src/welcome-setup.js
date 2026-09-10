import 'dotenv/config';
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  PermissionFlagsBits
} from 'discord.js';

const { DISCORD_TOKEN, WELCOME_CHANNEL_ID, MEMBER_ROLE_ID } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

async function configureWelcome(guild) {
  const channels = await guild.channels.fetch();

  const startCategory = channels.find((channel) =>
    channel?.type === ChannelType.GuildCategory && normalize(channel.name).includes('inicio')
  ) || null;

  let channel = null;

  if (WELCOME_CHANNEL_ID) {
    channel = await guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null);
  }

  if (!channel) {
    channel = channels.find((item) =>
      item?.type === ChannelType.GuildText &&
      ['boasvindas', 'boasvinda'].includes(normalize(item.name))
    ) || null;
  }

  if (!channel) {
    channel = await guild.channels.create({
      name: '👋・boas-vindas',
      type: ChannelType.GuildText,
      parent: startCategory?.id || null,
      topic: 'Novos membros do MangaMorph • canal automático • somente leitura',
      reason: 'Criar canal oficial de boas-vindas do MangaMorph'
    });
  } else {
    if (startCategory && channel.parentId !== startCategory.id) {
      await channel.setParent(startCategory.id, { lockPermissions: false }).catch(() => {});
    }
    await channel.setTopic('Novos membros do MangaMorph • canal automático • somente leitura').catch(() => {});
  }

  const locked = {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    AddReactions: false
  };

  await channel.permissionOverwrites.edit(
    guild.roles.everyone.id,
    locked,
    { reason: 'Boas-vindas somente leitura' }
  );

  let memberRole = null;
  if (MEMBER_ROLE_ID) {
    memberRole = await guild.roles.fetch(MEMBER_ROLE_ID).catch(() => null);
  }
  if (!memberRole) {
    const roles = await guild.roles.fetch();
    memberRole = roles.find((role) => normalize(role.name) === 'membro') || null;
  }

  if (memberRole) {
    await channel.permissionOverwrites.edit(
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
      { reason: 'Bloquear mensagens do cargo Membro em boas-vindas' }
    );
  }

  await channel.permissionOverwrites.edit(
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

  console.log(`[${guild.name}] 👋・boas-vindas configurado como somente leitura.`);
}

client.once('ready', async () => {
  try {
    for (const guild of client.guilds.cache.values()) {
      await configureWelcome(guild);
    }
  } catch (error) {
    console.error('Falha ao configurar boas-vindas:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
