import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

export const PALE_RECRUITMENT_GUILD_ID = '1513757281311916042';

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const STAFF_NAMES = new Set(['dono', 'direcao', 'desenvolvedor', 'administrador', 'moderador', 'suporte']);

const TYPES = {
  editor: { label: 'Editor Profissional', emoji: '🎬', description: 'Edição de vídeo, motion, AMV, shorts e áreas relacionadas.' },
  staff: { label: 'Staff / Moderação', emoji: '🛡️', description: 'Atendimento, organização, moderação e administração.' },
  criativo: { label: 'Equipe Criativa', emoji: '🎨', description: 'Design, social media, thumbnails, identidade visual e criação.' },
  outro: { label: 'Outra função / Colaboração', emoji: '🤝', description: 'Outras formas profissionais de colaborar com a Pale Ascendancy.' }
};

function safeName(value = 'candidato') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 22) || 'candidato';
}

function isStaff(member, guild) {
  return member?.id === guild.ownerId ||
    member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    member?.roles?.cache?.some((role) => STAFF_NAMES.has(normalize(role.name))) || false;
}

function input(id, label, style, maxLength, placeholder) {
  const field = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(true)
    .setMaxLength(maxLength);
  if (placeholder) field.setPlaceholder(placeholder);
  return field;
}

function applicationModal(typeKey) {
  const type = TYPES[typeKey] || TYPES.outro;
  return new ModalBuilder()
    .setCustomId(`pa_recruit_modal:${typeKey}`)
    .setTitle(`Candidatura • ${type.label}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(input('name', 'Como devemos chamar você?', TextInputStyle.Short, 80, 'Seu nome/apelido profissional')),
      new ActionRowBuilder().addComponents(input('experience', 'Experiência e especialidade', TextInputStyle.Paragraph, 800, 'Conte sua experiência, ferramentas e área principal')),
      new ActionRowBuilder().addComponents(input('portfolio', 'Portfólio ou referências', TextInputStyle.Paragraph, 800, 'Links ou exemplos. Se não tiver, explique aqui.')),
      new ActionRowBuilder().addComponents(input('availability', 'Disponibilidade', TextInputStyle.Short, 200, 'Dias/horários ou carga aproximada')),
      new ActionRowBuilder().addComponents(input('motivation', 'Por que quer entrar na Pale?', TextInputStyle.Paragraph, 800, 'Conte o que você pode agregar à equipe'))
    );
}

async function supportCategory(guild) {
  const channels = await guild.channels.fetch();
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildCategory && normalize(channel.name) === 'pasuporte'
  ) || null;
}

async function staffRoles(guild) {
  const roles = await guild.roles.fetch();
  return roles.filter((role) => STAFF_NAMES.has(normalize(role.name)));
}

async function createApplicationChannel(interaction, typeKey) {
  const guild = interaction.guild;
  const type = TYPES[typeKey] || TYPES.outro;
  const channels = await guild.channels.fetch();
  const existing = channels.find((channel) =>
    channel?.type === ChannelType.GuildText && channel.topic?.startsWith(`PA_RECRUIT:${interaction.user.id}|`)
  );

  if (existing) {
    await interaction.reply({ content: `Você já possui uma candidatura aberta: ${existing}`, ephemeral: true });
    return;
  }

  const values = {
    name: interaction.fields.getTextInputValue('name').trim(),
    experience: interaction.fields.getTextInputValue('experience').trim(),
    portfolio: interaction.fields.getTextInputValue('portfolio').trim(),
    availability: interaction.fields.getTextInputValue('availability').trim(),
    motivation: interaction.fields.getTextInputValue('motivation').trim()
  };

  const category = await supportCategory(guild);
  const roles = await staffRoles(guild);
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
    }
  ];

  for (const role of roles.values()) {
    overwrites.push({
      id: role.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages]
    });
  }

  const channel = await guild.channels.create({
    name: `candidatura-${safeName(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: category?.id || null,
    topic: `PA_RECRUIT:${interaction.user.id}|TYPE:${typeKey}`,
    permissionOverwrites: overwrites,
    reason: `Candidatura Pale Ascendancy • ${type.label}`
  });

  const embed = new EmbedBuilder()
    .setColor(0x7b61ff)
    .setAuthor({ name: 'Pale Ascendancy • Recrutamento' })
    .setTitle(`${type.emoji} Candidatura • ${type.label}`)
    .setDescription(
      `Candidatura enviada por ${interaction.user}. A equipe vai analisar as informações abaixo.\n\n` +
      '**Importante:** não envie CPF, RG, endereço, senhas ou outros dados pessoais sensíveis neste canal.'
    )
    .addFields(
      { name: 'Nome / identificação profissional', value: values.name.slice(0, 1024) || '—' },
      { name: 'Experiência e especialidade', value: values.experience.slice(0, 1024) || '—' },
      { name: 'Portfólio / referências', value: values.portfolio.slice(0, 1024) || '—' },
      { name: 'Disponibilidade', value: values.availability.slice(0, 1024) || '—' },
      { name: 'Motivação', value: values.motivation.slice(0, 1024) || '—' }
    )
    .setFooter({ text: 'Pale Ascendancy • Processo interno de seleção' })
    .setTimestamp();

  const close = new ButtonBuilder()
    .setCustomId('pa_recruit_close')
    .setLabel('Encerrar candidatura')
    .setEmoji('🔒')
    .setStyle(ButtonStyle.Danger);

  await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(close)] });
  await interaction.reply({ content: `Sua candidatura foi criada: ${channel}`, ephemeral: true });
}

export async function setupPaleRecruitment(guild) {
  if (guild.id !== PALE_RECRUITMENT_GUILD_ID) return;
  const category = await supportCategory(guild);
  const channels = await guild.channels.fetch();
  let channel = channels.find((item) => item?.type === ChannelType.GuildText && ['recrutamento', 'candidaturaspa', 'trabalheconosco'].includes(normalize(item.name))) || null;

  if (!channel) {
    channel = await guild.channels.create({
      name: '📨・recrutamento',
      type: ChannelType.GuildText,
      parent: category?.id || null,
      topic: 'Candidaturas para Editor Profissional, Staff, Equipe Criativa e outras funções da Pale Ascendancy.',
      reason: 'Central de recrutamento da Pale Ascendancy'
    });
  } else {
    await channel.edit({
      name: '📨・recrutamento',
      parent: category?.id || channel.parentId,
      topic: 'Candidaturas para Editor Profissional, Staff, Equipe Criativa e outras funções da Pale Ascendancy.'
    }).catch(() => {});
  }

  await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    AddReactions: false
  }).catch(() => {});

  const me = await guild.members.fetchMe().catch(() => null);
  if (me) {
    await channel.permissionOverwrites.edit(me.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      EmbedLinks: true,
      ManageMessages: true,
      ManageChannels: true
    }).catch(() => {});
  }

  const embed = new EmbedBuilder()
    .setColor(0x7b61ff)
    .setAuthor({ name: 'Pale Ascendancy • Recrutamento', iconURL: guild.iconURL({ size: 128 }) || undefined })
    .setTitle('📨 Trabalhe com a Pale Ascendancy')
    .setDescription(
      'Quer fazer parte da equipe? Escolha abaixo a área que combina com você. A candidatura abre um atendimento privado para análise da staff.\n\n' +
      '**Antes de enviar:** tenha informações claras sobre sua experiência, especialidade, disponibilidade e, quando houver, portfólio.'
    )
    .addFields(
      { name: '🎬 Editor Profissional', value: 'Edição de vídeo, motion, AMV, shorts e serviços criativos.', inline: false },
      { name: '🛡️ Staff / Moderação', value: 'Atendimento, organização, suporte, moderação e administração.', inline: false },
      { name: '🎨 Equipe Criativa', value: 'Design, social media, thumbnails, identidade visual e criação.', inline: false },
      { name: '🤝 Outras funções', value: 'Outras áreas profissionais ou formas de colaboração.', inline: false }
    )
    .setFooter({ text: 'Pale Ascendancy • Processo seletivo organizado e privado' });

  const select = new StringSelectMenuBuilder()
    .setCustomId('pa_recruit_type')
    .setPlaceholder('Escolha a função para se candidatar')
    .addOptions(Object.entries(TYPES).map(([value, item]) => ({
      label: item.label,
      description: item.description.slice(0, 100),
      value,
      emoji: item.emoji
    })));

  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const panels = recent?.filter((message) => message.author.id === guild.members.me?.id && message.embeds.some((item) => item.title === '📨 Trabalhe com a Pale Ascendancy'));
  const primary = panels?.first() || null;
  const payload = { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
  if (primary) {
    await primary.edit(payload).catch(() => {});
    for (const duplicate of panels.filter((message) => message.id !== primary.id).values()) await duplicate.delete().catch(() => {});
  } else {
    await channel.send(payload);
  }

  console.log('[PA-RECRUIT] 📨・recrutamento configurado.');
}

export async function handlePaleRecruitmentInteraction(interaction) {
  if (!interaction.inGuild() || interaction.guildId !== PALE_RECRUITMENT_GUILD_ID) return false;

  if (interaction.isStringSelectMenu() && interaction.customId === 'pa_recruit_type') {
    const typeKey = interaction.values[0];
    await interaction.showModal(applicationModal(typeKey));
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId.startsWith('pa_recruit_modal:')) {
    const typeKey = interaction.customId.split(':')[1] || 'outro';
    await createApplicationChannel(interaction, typeKey);
    return true;
  }

  if (interaction.isButton() && interaction.customId === 'pa_recruit_close') {
    const channel = interaction.channel;
    if (!channel?.topic?.startsWith('PA_RECRUIT:')) return true;
    const ownerId = channel.topic.split('|')[0].replace('PA_RECRUIT:', '');
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (interaction.user.id !== ownerId && !isStaff(member, interaction.guild)) {
      await interaction.reply({ content: 'Somente o candidato ou a equipe pode encerrar esta candidatura.', ephemeral: true });
      return true;
    }
    await interaction.reply({ content: '🔒 Candidatura encerrada.' });
    setTimeout(() => channel.delete('Candidatura encerrada na Pale Ascendancy').catch(() => {}), 1500);
    return true;
  }

  return false;
}
