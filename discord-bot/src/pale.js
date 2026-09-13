import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder
} from 'discord.js';

export const PALE_GUILD_ID = '1513757281311916042';

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const STAFF_NAMES = new Set(['dono', 'desenvolvedor', 'administrador', 'moderador', 'suporte']);
const PALE_WELCOME_INTRO_MARKER = 'PA_WELCOME_INTRO_V1';

function findChannelInCollection(channels, names, type = ChannelType.GuildText) {
  const wanted = names.map(normalize);
  return channels.find((channel) => channel?.type === type && wanted.includes(normalize(channel.name))) || null;
}

async function findRole(guild, name) {
  const roles = await guild.roles.fetch();
  return roles.find((role) => normalize(role.name) === normalize(name)) || null;
}

async function findChannel(guild, names, type = ChannelType.GuildText) {
  const channels = await guild.channels.fetch();
  return findChannelInCollection(channels, names, type);
}

function isStaff(member) {
  return member?.roles?.cache?.some((role) => STAFF_NAMES.has(normalize(role.name))) || false;
}

function paleWelcomeIntroEmbed(guild, channels) {
  const rules = findChannelInCollection(channels, ['📜・diretrizes', 'diretrizes', '📜・regras', 'regras', 'rules']);
  const service = findChannelInCollection(channels, ['🧾・solicitar-serviço', 'solicitar-serviço', 'pedir-serviço']);
  const rulesMention = rules ? `${rules}` : '`#diretrizes`';
  const serviceMention = service ? `${service}` : '`#solicitar-serviço`';

  const embed = new EmbedBuilder()
    .setColor(0x7b61ff)
    .setAuthor({
      name: 'Pale Ascendancy • Comunidade Criativa',
      iconURL: guild.iconURL({ size: 128 }) || undefined
    })
    .setTitle('👋 Bem-vindo à Pale Ascendancy')
    .setDescription(
      'Seja bem-vindo à nossa comunidade de **editores, designers e criadores**.\n\n' +
      `📜 **Comece por aqui:** confira ${rulesMention} para conhecer as diretrizes da comunidade.\n` +
      `💼 **Precisa de um editor ou designer?** Abra uma solicitação em ${serviceMention}.\n\n` +
      'Explore os canais, conheça a comunidade e fique à vontade para participar.'
    )
    .setFooter({ text: `${PALE_WELCOME_INTRO_MARKER} • Pale Ascendancy` });

  const icon = guild.iconURL({ size: 256 });
  if (icon) embed.setThumbnail(icon);
  return embed;
}

async function ensurePaleWelcomeIntro(guild, channel) {
  const channels = await guild.channels.fetch();
  const payload = {
    embeds: [paleWelcomeIntroEmbed(guild, channels)],
    allowedMentions: { parse: [] }
  };

  const recent = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const existing = recent?.find((message) =>
    message.author.id === guild.client.user.id &&
    message.embeds.some((embed) => embed.footer?.text?.startsWith(PALE_WELCOME_INTRO_MARKER))
  ) || null;

  if (existing) {
    await existing.edit(payload);
    return existing;
  }

  return channel.send(payload);
}

export async function setupPaleWelcome(guild) {
  if (guild.id !== PALE_GUILD_ID) return null;

  const channels = await guild.channels.fetch();
  let channel = findChannelInCollection(channels, ['👋・boas-vindas', 'boas-vindas', 'bem-vindos', 'welcome']);
  const topic = 'Boas-vindas automáticas da Pale Ascendancy • leia as diretrizes e conheça os serviços da comunidade.';

  if (!channel) {
    channel = await guild.channels.create({
      name: '👋・boas-vindas',
      type: ChannelType.GuildText,
      parent: null,
      topic,
      reason: 'Criar canal de boas-vindas da Pale Ascendancy'
    });
  } else {
    const changes = {};
    if (channel.name !== '👋・boas-vindas') changes.name = '👋・boas-vindas';
    if (channel.parentId !== null) changes.parent = null;
    if (channel.topic !== topic) changes.topic = topic;
    if (Object.keys(changes).length) {
      await channel.edit(changes, 'Configurar canal de boas-vindas da Pale Ascendancy');
    }
  }

  await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    AddReactions: false
  });

  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (me) {
    await channel.permissionOverwrites.edit(me.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      EmbedLinks: true,
      ManageMessages: true
    });
  }

  await ensurePaleWelcomeIntro(guild, channel).catch((error) => {
    console.error('[PA-WELCOME] Falha ao publicar mensagem inicial:', error);
  });

  console.log('[PA-WELCOME] 👋・boas-vindas configurado sem categoria.');
  return channel;
}

async function createPaleTicket(interaction, reasonKey) {
  const labels = {
    suporte: ['Suporte geral', '🛟'],
    parceria: ['Parceria / projeto', '🤝'],
    denuncia: ['Denúncia', '🚨'],
    equipe: ['Equipe / candidatura', '📨'],
    outro: ['Outro assunto', '💬']
  };

  const [label, emoji] = labels[reasonKey] || labels.outro;
  const guild = interaction.guild;
  const supportCategory = (await guild.channels.fetch()).find((channel) =>
    channel?.type === ChannelType.GuildCategory && normalize(channel.name) === 'pasuporte'
  ) || null;

  const open = (await guild.channels.fetch()).find((channel) =>
    channel?.type === ChannelType.GuildText &&
    channel.topic?.startsWith(`PA_TICKET:${interaction.user.id}`)
  );

  if (open) {
    await interaction.reply({ content: `Você já possui um atendimento aberto: ${open}`, ephemeral: true });
    return;
  }

  const staffRoles = (await guild.roles.fetch()).filter((role) => STAFF_NAMES.has(normalize(role.name)));
  const safeName = interaction.user.username
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'membro';

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    }
  ];

  for (const role of staffRoles.values()) {
    overwrites.push({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  const channel = await guild.channels.create({
    name: `ticket-${safeName}`,
    type: ChannelType.GuildText,
    parent: supportCategory?.id || null,
    topic: `PA_TICKET:${interaction.user.id}|REASON:${reasonKey}`,
    permissionOverwrites: overwrites,
    reason: `Ticket Pale Ascendancy: ${label}`
  });

  const embed = new EmbedBuilder()
    .setColor(0x7b61ff)
    .setAuthor({ name: 'Pale Ascendancy • Atendimento' })
    .setTitle(`${emoji} ${label}`)
    .setDescription(
      `Olá, ${interaction.user}. Seu atendimento foi aberto.\n\n` +
      'Explique o que você precisa com o máximo de contexto possível. A equipe responderá por aqui.'
    )
    .addFields(
      { name: 'Solicitante', value: `${interaction.user}`, inline: true },
      { name: 'Categoria', value: label, inline: true }
    )
    .setFooter({ text: 'Pale Ascendancy • Suporte privado' })
    .setTimestamp();

  const close = new ButtonBuilder()
    .setCustomId('pa_ticket_close')
    .setLabel('Fechar ticket')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(close)] });
  await interaction.reply({ content: `Atendimento criado: ${channel}`, ephemeral: true });
}

export async function handlePaleInteraction(interaction) {
  if (!interaction.inGuild() || interaction.guildId !== PALE_GUILD_ID) return false;

  if (interaction.isButton() && interaction.customId === 'pa_ticket_open') {
    const select = new StringSelectMenuBuilder()
      .setCustomId('pa_ticket_reason')
      .setPlaceholder('Escolha o motivo do atendimento')
      .addOptions(
        { label: 'Suporte geral', value: 'suporte', emoji: '🛟' },
        { label: 'Parceria / projeto', value: 'parceria', emoji: '🤝' },
        { label: 'Denúncia', value: 'denuncia', emoji: '🚨' },
        { label: 'Equipe / candidatura', value: 'equipe', emoji: '📨' },
        { label: 'Outro assunto', value: 'outro', emoji: '💬' }
      );

    await interaction.reply({
      content: 'Selecione o assunto para abrir um atendimento privado.',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
    return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'pa_ticket_reason') {
    await createPaleTicket(interaction, interaction.values[0]);
    return true;
  }

  if (interaction.isButton() && interaction.customId === 'pa_ticket_close') {
    const channel = interaction.channel;
    if (!channel?.topic?.startsWith('PA_TICKET:')) return true;

    const ownerId = channel.topic.split('|')[0].replace('PA_TICKET:', '');
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);

    if (interaction.user.id !== ownerId && !isStaff(member)) {
      await interaction.reply({ content: 'Somente o autor do ticket ou a equipe pode fechá-lo.', ephemeral: true });
      return true;
    }

    await interaction.reply({ content: '🔒 Atendimento encerrado.' });
    setTimeout(() => channel.delete('Ticket encerrado na Pale Ascendancy').catch(() => {}), 1500);
    return true;
  }

  return false;
}

export async function handlePaleMemberAdd(member) {
  if (member.guild.id !== PALE_GUILD_ID) return false;

  const memberRole = await findRole(member.guild, 'Membro');
  if (memberRole?.editable) {
    await member.roles.add(memberRole, 'Entrada automática na Pale Ascendancy').catch(() => {});
  }

  const channels = await member.guild.channels.fetch();
  let welcome = findChannelInCollection(channels, ['👋・boas-vindas', 'boas-vindas', 'bem-vindos', 'welcome']);
  if (!welcome) welcome = await setupPaleWelcome(member.guild).catch(() => null);

  if (welcome) {
    const rules = findChannelInCollection(channels, ['📜・diretrizes', 'diretrizes', '📜・regras', 'regras', 'rules']);
    const service = findChannelInCollection(channels, ['🧾・solicitar-serviço', 'solicitar-serviço', 'pedir-serviço']);
    const rulesMention = rules ? `${rules}` : '`#diretrizes`';
    const serviceMention = service ? `${service}` : '`#solicitar-serviço`';

    const embed = new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({
        name: 'Pale Ascendancy • Bem-vindo',
        iconURL: member.guild.iconURL({ size: 128 }) || undefined
      })
      .setTitle('✨ Bem-vindo à Pale Ascendancy')
      .setDescription(
        `Olá, ${member}! É muito bom ter você por aqui.\n\n` +
        'Você agora faz parte de uma comunidade de editores, criadores e pessoas que curtem produção digital.\n\n' +
        `📜 **Antes de começar:** leia ${rulesMention} para conhecer as diretrizes da comunidade.\n` +
        `💼 **Quer contratar um editor?** Se quiser, abra sua solicitação em ${serviceMention}.\n\n` +
        'Explore os canais, converse com a comunidade e aproveite a Pale Ascendancy.'
      )
      .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
      .setFooter({ text: `Membro #${member.guild.memberCount} • Pale Ascendancy` })
      .setTimestamp();

    await welcome.send({
      embeds: [embed],
      allowedMentions: { parse: [], users: [member.id] }
    }).catch((error) => console.error('[PA-WELCOME] Falha ao enviar boas-vindas:', error));
  }

  return true;
}
