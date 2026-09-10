import 'dotenv/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

const {
  DISCORD_TOKEN,
  WELCOME_CHANNEL_ID,
  MEMBER_ROLE_ID,
  LOG_CHANNEL_ID
} = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const TICKET_REASONS = {
  tecnico: { label: 'Problema técnico', emoji: '🛠️' },
  obra: { label: 'Obra ou capítulo', emoji: '📚' },
  parceria: { label: 'Parceria / Scan', emoji: '🤝' },
  candidatura: { label: 'Candidatura para equipe', emoji: '📨' },
  denuncia: { label: 'Denúncia', emoji: '🚨' }
};

const STAFF_ROLE_NAMES = new Set([
  'direcao',
  'administrador',
  'moderador',
  'equipemangamorph'
]);

async function findTextChannel(guild, configuredId, expectedNames) {
  if (configuredId) {
    const byId = await guild.channels.fetch(configuredId).catch(() => null);
    if (byId?.isTextBased()) return byId;
  }

  const channels = await guild.channels.fetch();
  const wanted = expectedNames.map(normalize);
  return channels.find((channel) =>
    channel?.isTextBased() && wanted.includes(normalize(channel.name))
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

async function findLogChannel(guild) {
  return findTextChannel(
    guild,
    LOG_CHANNEL_ID,
    ['📋・logs', 'logs', 'log']
  );
}

async function findTicketPanelChannel(guild) {
  return findTextChannel(
    guild,
    null,
    ['🎫・abrir-ticket', 'abrir-ticket', 'abrirticket']
  );
}

async function getGuildMember(guild, userId) {
  return guild.members.fetch(userId).catch(() => null);
}

function isStaff(member) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages)) return true;
  return member.roles.cache.some((role) => STAFF_ROLE_NAMES.has(normalize(role.name)));
}

function getTicketOwnerId(channel) {
  const match = channel.topic?.match(/MM_TICKET:(\d+)/);
  return match?.[1] || null;
}

function isTicketChannel(channel) {
  return channel?.type === ChannelType.GuildText && channel.topic?.startsWith('MM_TICKET:');
}

async function sendLog(guild, title, description, fields = []) {
  const logChannel = await findLogChannel(guild);
  if (!logChannel) return;

  const embed = new EmbedBuilder()
    .setColor(0x2b2f36)
    .setTitle(title)
    .setDescription(description)
    .addFields(fields)
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch((error) => {
    console.error('Falha ao enviar log:', error);
  });
}

function ticketPanelComponents() {
  const button = new ButtonBuilder()
    .setCustomId('mm_ticket_open')
    .setLabel('Abrir atendimento')
    .setEmoji('🎫')
    .setStyle(ButtonStyle.Primary);

  return [new ActionRowBuilder().addComponents(button)];
}

async function ensureTicketPanel(guild) {
  const channel = await findTicketPanelChannel(guild);
  if (!channel) {
    console.warn(`[${guild.name}] Canal abrir-ticket não encontrado.`);
    return;
  }

  const recent = await channel.messages.fetch({ limit: 30 }).catch(() => null);
  const existing = recent?.find((message) =>
    message.author.id === client.user.id &&
    message.embeds.some((embed) => embed.title === 'Central de atendimento MangaMorph')
  );

  if (existing) return;

  const embed = new EmbedBuilder()
    .setColor(0x111318)
    .setAuthor({ name: 'MangaMorph', iconURL: client.user.displayAvatarURL() })
    .setTitle('Central de atendimento MangaMorph')
    .setDescription(
      'Precisa falar com a equipe? Abra um atendimento privado.\n\n' +
      'Você poderá escolher entre **problema técnico**, **obra ou capítulo**, **parceria/scan**, **candidatura** e **denúncia**.\n\n' +
      'Clique no botão abaixo para começar.'
    )
    .setFooter({ text: 'MangaMorph • Suporte' });

  await channel.send({ embeds: [embed], components: ticketPanelComponents() });
}

async function createTicket(interaction, reasonKey) {
  const { guild, user } = interaction;
  const reason = TICKET_REASONS[reasonKey];

  if (!guild || !reason) {
    await interaction.reply({ content: 'Não foi possível abrir o ticket.', ephemeral: true });
    return;
  }

  const channels = await guild.channels.fetch();
  const alreadyOpen = channels.find((channel) =>
    isTicketChannel(channel) && getTicketOwnerId(channel) === user.id
  );

  if (alreadyOpen) {
    await interaction.reply({
      content: `Você já tem um ticket aberto: ${alreadyOpen}`,
      ephemeral: true
    });
    return;
  }

  const panelChannel = await findTicketPanelChannel(guild);
  const supportCategory = panelChannel?.parentId
    ? await guild.channels.fetch(panelChannel.parentId).catch(() => null)
    : channels.find((channel) =>
        channel?.type === ChannelType.GuildCategory && normalize(channel.name).includes('suporte')
      );

  const roles = await guild.roles.fetch();
  const staffRoles = roles.filter((role) => STAFF_ROLE_NAMES.has(normalize(role.name)));

  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    },
    {
      id: client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageChannels
      ]
    }
  ];

  for (const role of staffRoles.values()) {
    permissionOverwrites.push({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    });
  }

  const safeName = normalize(user.username).slice(0, 16) || 'membro';
  const channel = await guild.channels.create({
    name: `ticket-${safeName}-${user.id.slice(-4)}`,
    type: ChannelType.GuildText,
    parent: supportCategory?.id || null,
    topic: `MM_TICKET:${user.id}|TYPE:${reasonKey}|CLAIMED:`,
    permissionOverwrites
  });

  const actions = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('mm_ticket_claim')
      .setLabel('Assumir')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('mm_ticket_add')
      .setLabel('Adicionar membro')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('mm_ticket_close')
      .setLabel('Fechar ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
    .setColor(0x111318)
    .setTitle(`${reason.emoji} ${reason.label}`)
    .setDescription(
      `${user}, seu atendimento foi aberto. Explique o que aconteceu e envie as informações necessárias para a equipe analisar.\n\n` +
      'A conversa deste canal é privada entre você e a equipe do MangaMorph.'
    )
    .addFields(
      { name: 'Solicitante', value: `${user}`, inline: true },
      { name: 'Motivo', value: reason.label, inline: true }
    )
    .setFooter({ text: 'MangaMorph • Ticket' })
    .setTimestamp();

  await channel.send({ content: `${user}`, embeds: [embed], components: [actions] });

  await interaction.reply({ content: `Ticket criado: ${channel}`, ephemeral: true });

  await sendLog(
    guild,
    'Ticket aberto',
    `${user} abriu um novo atendimento.`,
    [
      { name: 'Motivo', value: reason.label, inline: true },
      { name: 'Canal', value: `${channel}`, inline: true }
    ]
  );
}

client.once(Events.ClientReady, async () => {
  console.log(`MangaMorph online como ${client.user.tag}`);
  client.user.setActivity('MangaMorph');

  for (const guild of client.guilds.cache.values()) {
    await ensureTicketPanel(guild).catch((error) => {
      console.error(`Falha ao preparar painel de tickets em ${guild.name}:`, error);
    });
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const role = await findMemberRole(member.guild);
    if (role) {
      await member.roles.add(role, 'Entrada automática no MangaMorph').catch((error) => {
        console.error('Não foi possível adicionar o cargo Membro:', error);
      });
    } else {
      console.warn('Cargo Membro não encontrado.');
    }

    const welcomeChannel = await findTextChannel(
      member.guild,
      WELCOME_CHANNEL_ID,
      ['👋・boas-vindas', 'boas-vindas', 'boasvindas']
    );

    if (welcomeChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x111318)
        .setAuthor({
          name: 'MangaMorph',
          iconURL: client.user.displayAvatarURL()
        })
        .setTitle('Bem-vindo ao MangaMorph')
        .setDescription(
          `Olá, ${member}. Você acaba de entrar na comunidade oficial do **MangaMorph**.\n\n` +
          'Descubra novas obras, acompanhe lançamentos, participe das discussões e ajude a construir a plataforma.\n\n' +
          '**Comece por aqui**\n' +
          '🧭・comece-aqui\n' +
          '📜・regras\n' +
          '💬・geral'
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: `Membro #${member.guild.memberCount} • MangaMorph` })
        .setTimestamp();

      await welcomeChannel.send({ embeds: [embed] });
    } else {
      console.warn('Canal de boas-vindas não encontrado.');
    }

    await sendLog(
      member.guild,
      'Novo membro',
      `${member} entrou no servidor.`,
      [
        { name: 'Usuário', value: `${member.user.tag}`, inline: true },
        { name: 'ID', value: member.id, inline: true },
        { name: 'Total', value: String(member.guild.memberCount), inline: true }
      ]
    );
  } catch (error) {
    console.error('Falha ao processar entrada de membro:', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (!interaction.inGuild()) return;

    if (interaction.isButton() && interaction.customId === 'mm_ticket_open') {
      const select = new StringSelectMenuBuilder()
        .setCustomId('mm_ticket_reason')
        .setPlaceholder('Escolha o motivo do atendimento')
        .addOptions(
          Object.entries(TICKET_REASONS).map(([value, reason]) => ({
            label: reason.label,
            value,
            emoji: reason.emoji
          }))
        );

      await interaction.reply({
        content: 'Qual é o motivo do seu atendimento?',
        components: [new ActionRowBuilder().addComponents(select)],
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'mm_ticket_reason') {
      await createTicket(interaction, interaction.values[0]);
      return;
    }

    if (!isTicketChannel(interaction.channel)) return;

    const actor = await getGuildMember(interaction.guild, interaction.user.id);
    const ownerId = getTicketOwnerId(interaction.channel);

    if (interaction.isButton() && interaction.customId === 'mm_ticket_claim') {
      if (!isStaff(actor)) {
        await interaction.reply({ content: 'Somente a equipe pode assumir tickets.', ephemeral: true });
        return;
      }

      const baseTopic = interaction.channel.topic?.replace(/\|CLAIMED:[^|]*/g, '') || `MM_TICKET:${ownerId}`;
      await interaction.channel.setTopic(`${baseTopic}|CLAIMED:${interaction.user.id}`);
      await interaction.reply({ content: `🛡️ Atendimento assumido por ${interaction.user}.` });

      await sendLog(
        interaction.guild,
        'Ticket assumido',
        `${interaction.user} assumiu ${interaction.channel}.`
      );
      return;
    }

    if (interaction.isButton() && interaction.customId === 'mm_ticket_add') {
      if (!isStaff(actor)) {
        await interaction.reply({ content: 'Somente a equipe pode adicionar membros.', ephemeral: true });
        return;
      }

      const input = new TextInputBuilder()
        .setCustomId('member')
        .setLabel('ID ou menção do membro')
        .setPlaceholder('Ex.: 123456789012345678')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const modal = new ModalBuilder()
        .setCustomId('mm_ticket_add_modal')
        .setTitle('Adicionar membro ao ticket')
        .addComponents(new ActionRowBuilder().addComponents(input));

      await interaction.showModal(modal);
      return;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'mm_ticket_add_modal') {
      if (!isStaff(actor)) {
        await interaction.reply({ content: 'Somente a equipe pode adicionar membros.', ephemeral: true });
        return;
      }

      const raw = interaction.fields.getTextInputValue('member');
      const memberId = raw.match(/\d{17,20}/)?.[0];
      const member = memberId ? await getGuildMember(interaction.guild, memberId) : null;

      if (!member) {
        await interaction.reply({ content: 'Não encontrei esse membro no servidor.', ephemeral: true });
        return;
      }

      await interaction.channel.permissionOverwrites.edit(member.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
        EmbedLinks: true
      });

      await interaction.reply({ content: `${member} foi adicionado ao ticket.` });

      await sendLog(
        interaction.guild,
        'Membro adicionado ao ticket',
        `${interaction.user} adicionou ${member} em ${interaction.channel}.`
      );
      return;
    }

    if (interaction.isButton() && interaction.customId === 'mm_ticket_close') {
      if (interaction.user.id !== ownerId && !isStaff(actor)) {
        await interaction.reply({ content: 'Você não pode fechar este ticket.', ephemeral: true });
        return;
      }

      await interaction.reply({ content: '🔒 Ticket encerrado. Este canal será removido em alguns segundos.' });

      await sendLog(
        interaction.guild,
        'Ticket fechado',
        `${interaction.user} fechou **#${interaction.channel.name}**.`,
        ownerId ? [{ name: 'Solicitante', value: `<@${ownerId}>`, inline: true }] : []
      );

      setTimeout(() => {
        interaction.channel.delete('Ticket encerrado').catch((error) => {
          console.error('Falha ao excluir ticket:', error);
        });
      }, 5000);
    }
  } catch (error) {
    console.error('Falha ao processar interação:', error);
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Ocorreu um erro ao processar essa ação.', ephemeral: true }).catch(() => {});
    }
  }
});

client.on(Events.Error, (error) => {
  console.error('Erro do cliente Discord:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado:', error);
});

client.login(DISCORD_TOKEN);
