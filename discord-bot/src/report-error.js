import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const PANEL_TITLE = '🐞 Central de Erros';
const PANEL_BUTTON_ID = 'mm_report_error_open';
const MODAL_ID = 'mm_report_error_modal';
const STATUS_PREFIX = 'mm_bug_status_';

function isMangaMorph(guild) {
  return normalize(guild?.name) === 'mangamorph';
}

async function findReportChannel(guild) {
  const channels = await guild.channels.fetch();
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildText &&
    ['reportarerro', 'reporterro', 'bugs', 'erros'].includes(normalize(channel.name))
  ) || null;
}

async function ensureReportChannel(guild) {
  let channel = await findReportChannel(guild);
  const channels = await guild.channels.fetch();
  const category = channels.find((item) =>
    item?.type === ChannelType.GuildCategory && normalize(item.name).includes('mangamorph')
  ) || null;

  if (!channel) {
    channel = await guild.channels.create({
      name: '🐞・reportar-erro',
      type: ChannelType.GuildText,
      parent: category?.id || null,
      topic: 'Reporte bugs do site, leitor, catálogo ou Discord • o bot organiza cada ocorrência',
      reason: 'Central oficial de erros do MangaMorph'
    });
  } else {
    await channel.setTopic('Reporte bugs do site, leitor, catálogo ou Discord • o bot organiza cada ocorrência').catch(() => {});
  }

  const publicPermissions = {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    SendMessagesInThreads: true,
    AttachFiles: true,
    EmbedLinks: true,
    AddReactions: false
  };

  await channel.permissionOverwrites.edit(
    guild.roles.everyone.id,
    publicPermissions,
    { reason: 'Central de erros organizada por formulário' }
  ).catch(() => {});

  const roles = await guild.roles.fetch();
  const memberRole = roles.find((role) => normalize(role.name) === 'membro');
  if (memberRole) {
    await channel.permissionOverwrites.edit(memberRole.id, publicPermissions, {
      reason: 'Permitir acompanhamento de bugs pelos membros'
    }).catch(() => {});
  }

  const me = guild.members.me;
  if (me) {
    await channel.permissionOverwrites.edit(me.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      SendMessagesInThreads: true,
      CreatePublicThreads: true,
      ManageThreads: true,
      ManageMessages: true,
      EmbedLinks: true,
      AttachFiles: true
    }, { reason: 'Permitir gerenciamento da central de erros pelo bot' }).catch(() => {});
  }

  return channel;
}

function panelEmbeds() {
  const header = new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({ name: 'MangaMorph • Qualidade da Plataforma' })
    .setTitle(PANEL_TITLE)
    .setDescription(
      'Encontrou algo que não está funcionando como deveria? Envie um relatório e a equipe poderá investigar com muito mais rapidez.\n\n' +
      '**Use este canal para:** site, leitor, capítulos, catálogo, conta/login, bot ou recursos do Discord.'
    );

  const guide = new EmbedBuilder()
    .setColor(0x2F3545)
    .setTitle('01 · COMO REPORTAR')
    .setDescription(
      '`01` Toque em **Reportar erro**.\n' +
      '`02` Informe onde aconteceu e descreva o problema.\n' +
      '`03` Explique como reproduzir o erro.\n' +
      '`04` Depois do envio, use a **thread do relatório** para anexar prints ou vídeos.\n\n' +
      '> Não envie senhas, tokens, chaves ou outros dados privados.'
    )
    .setFooter({ text: 'MangaMorph • Relatórios claros ajudam a corrigir mais rápido' });

  return [header, guide];
}

function panelComponents() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(PANEL_BUTTON_ID)
        .setLabel('Reportar erro')
        .setEmoji('🐞')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function reportModal() {
  return new ModalBuilder()
    .setCustomId(MODAL_ID)
    .setTitle('Reportar erro • MangaMorph')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('area')
          .setLabel('Onde aconteceu?')
          .setPlaceholder('Site, leitor, capítulo, login, Discord...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reference')
          .setLabel('Link, obra ou página relacionada')
          .setPlaceholder('Cole o link ou informe o nome da obra/página')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(500)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('happened')
          .setLabel('O que aconteceu?')
          .setPlaceholder('Explique o erro de forma objetiva')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1200)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('reproduce')
          .setLabel('Como reproduzir?')
          .setPlaceholder('Ex.: abrir obra > capítulo 12 > tocar em próxima página')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('environment')
          .setLabel('Dispositivo / navegador / app')
          .setPlaceholder('Ex.: Android 15 • Chrome • celular')
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200)
      )
    );
}

function reportStatusRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${STATUS_PREFIX}review`)
      .setLabel('Em análise')
      .setEmoji('🔎')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`${STATUS_PREFIX}resolved`)
      .setLabel('Resolvido')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`${STATUS_PREFIX}unreproduced`)
      .setLabel('Não reproduzido')
      .setEmoji('⚪')
      .setStyle(ButtonStyle.Secondary)
  );
}

function canModerate(interaction) {
  return interaction.user.id === interaction.guild.ownerId ||
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers);
}

function statusConfig(value) {
  if (value === 'review') return { label: '🔎 Em análise', color: 0xF0B232 };
  if (value === 'resolved') return { label: '✅ Resolvido', color: 0x57F287 };
  return { label: '⚪ Não reproduzido', color: 0x95A5A6 };
}

export async function setupReportError(guild, client) {
  if (!isMangaMorph(guild)) return;

  const channel = await ensureReportChannel(guild);
  const embeds = panelEmbeds();
  const components = panelComponents();
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const matching = recent?.filter((message) =>
    message.author.id === client.user.id &&
    message.embeds.some((embed) => embed.title === PANEL_TITLE)
  );

  const existing = matching?.first() || null;
  if (existing) {
    await existing.edit({ embeds, components }).catch(() => {});
    const duplicates = matching.filter((message) => message.id !== existing.id);
    for (const message of duplicates.values()) await message.delete().catch(() => {});
  } else {
    await channel.send({ embeds, components });
  }

  console.log(`[REPORT-ERROR] ${guild.name}: 🐞・reportar-erro configurado.`);
}

export async function handleReportErrorInteraction(interaction) {
  if (!interaction.inGuild() || !isMangaMorph(interaction.guild)) return false;

  if (interaction.isButton() && interaction.customId === PANEL_BUTTON_ID) {
    await interaction.showModal(reportModal());
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
    const channel = await findReportChannel(interaction.guild);
    if (!channel) {
      await interaction.reply({ content: 'O canal de relatórios não foi encontrado.', ephemeral: true });
      return true;
    }

    const area = interaction.fields.getTextInputValue('area').trim();
    const reference = interaction.fields.getTextInputValue('reference').trim();
    const happened = interaction.fields.getTextInputValue('happened').trim();
    const reproduce = interaction.fields.getTextInputValue('reproduce').trim();
    const environment = interaction.fields.getTextInputValue('environment').trim();
    const reportId = `${Date.now().toString(36).slice(-5).toUpperCase()}-${interaction.user.id.slice(-4)}`;

    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setAuthor({
        name: `${interaction.user.username} • relatório de erro`,
        iconURL: interaction.user.displayAvatarURL({ size: 128 })
      })
      .setTitle(`🐞 BUG-${reportId} • ${area.slice(0, 80)}`)
      .setDescription(happened.slice(0, 4000))
      .addFields(
        { name: '📍 Referência', value: reference ? reference.slice(0, 1024) : 'Não informada', inline: false },
        { name: '🔁 Como reproduzir', value: reproduce.slice(0, 1024), inline: false },
        { name: '📱 Ambiente', value: environment ? environment.slice(0, 1024) : 'Não informado', inline: true },
        { name: '📌 Status', value: '🔴 Novo', inline: true },
        { name: '👤 Enviado por', value: `<@${interaction.user.id}>`, inline: true }
      )
      .setFooter({ text: `MangaMorph • BUG-${reportId}` })
      .setTimestamp();

    const reportMessage = await channel.send({
      embeds: [embed],
      components: [reportStatusRow()],
      allowedMentions: { parse: [] }
    });

    const thread = await reportMessage.startThread({
      name: `bug-${reportId.toLowerCase()}-${interaction.user.username}`.slice(0, 100),
      autoArchiveDuration: 10080,
      reason: `Acompanhamento do BUG-${reportId}`
    }).catch(() => null);

    if (thread) {
      await thread.send({
        content: `<@${interaction.user.id}> use esta thread para adicionar **prints, vídeos ou detalhes extras** sobre o erro.`,
        allowedMentions: { users: [interaction.user.id] }
      }).catch(() => {});
    }

    await interaction.reply({
      content: `✅ Relatório **BUG-${reportId}** enviado${thread ? ` e acompanhamento criado em ${thread}` : ''}.`,
      ephemeral: true
    });
    return true;
  }

  if (interaction.isButton() && interaction.customId.startsWith(STATUS_PREFIX)) {
    if (!canModerate(interaction)) {
      await interaction.reply({ content: 'Somente a staff pode alterar o status de um relatório.', ephemeral: true });
      return true;
    }

    const status = interaction.customId.slice(STATUS_PREFIX.length);
    const config = statusConfig(status);
    const original = interaction.message.embeds[0];
    if (!original) {
      await interaction.reply({ content: 'Este relatório não possui um embed editável.', ephemeral: true });
      return true;
    }

    const fields = (original.fields || []).map((field) =>
      field.name === '📌 Status' ? { ...field, value: config.label } : field
    );
    const updated = EmbedBuilder.from(original).setColor(config.color).setFields(fields);
    await interaction.update({ embeds: [updated], components: interaction.message.components });
    return true;
  }

  return false;
}
