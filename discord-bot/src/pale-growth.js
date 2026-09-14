import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from 'discord.js';

export const PALE_GROWTH_GUILD_ID = '1513757281311916042';

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const INTENTS = {
  cliente: {
    role: '💼・Cliente / Contratante',
    label: 'Quero contratar',
    emoji: '💼',
    description: 'Quero encontrar editor ou designer para um projeto.'
  },
  editor: {
    role: '🎬・Editor / Criador',
    label: 'Sou editor / criador',
    emoji: '🎬',
    description: 'Produzo vídeos e quero participar, aprender ou me profissionalizar.'
  },
  designer: {
    role: '🎨・Designer / Criativo',
    label: 'Sou designer / criativo',
    emoji: '🎨',
    description: 'Trabalho com design, thumbnails, identidade, motion ou social.'
  },
  aprender: {
    role: '📚・Em aprendizado',
    label: 'Quero aprender',
    emoji: '📚',
    description: 'Quero evoluir, trocar feedback e conhecer recursos.'
  }
};

const PROFESSIONAL_ROLES = {
  editor: ['editorprofissional'],
  designer: ['designerprofissional']
};

const communityCommand = new SlashCommandBuilder()
  .setName('comunidade')
  .setDescription('Abre a central da Pale Ascendancy');

const professionalsCommand = new SlashCommandBuilder()
  .setName('profissionais')
  .setDescription('Mostra profissionais verificados disponíveis na Pale Ascendancy');

function findChannelInCollection(channels, aliases, type = ChannelType.GuildText) {
  const wanted = new Set(aliases.map(normalize));
  return channels.find((channel) => channel?.type === type && wanted.has(normalize(channel.name))) || null;
}

async function ensureIntentRoles(guild) {
  const roles = await guild.roles.fetch();
  const result = new Map();

  for (const [key, intent] of Object.entries(INTENTS)) {
    let role = roles.find((candidate) => normalize(candidate.name) === normalize(intent.role)) || null;
    if (!role) {
      role = await guild.roles.create({
        name: intent.role,
        hoist: false,
        mentionable: false,
        permissions: [],
        reason: 'Segmentação de onboarding da Pale Ascendancy'
      });
    }
    result.set(key, role);
  }

  return result;
}

async function findOrCreateIntroCategory(guild) {
  const channels = await guild.channels.fetch();
  let category = channels.find((channel) =>
    channel?.type === ChannelType.GuildCategory && ['painicio', 'inicio'].includes(normalize(channel.name))
  ) || null;

  if (!category) {
    category = await guild.channels.create({
      name: '「 PA 」 INÍCIO',
      type: ChannelType.GuildCategory,
      reason: 'Onboarding profissional da Pale Ascendancy'
    });
  }
  return category;
}

async function findOrCreateStartChannel(guild) {
  const category = await findOrCreateIntroCategory(guild);
  const channels = await guild.channels.fetch();
  let channel = findChannelInCollection(channels, ['🧭・comece-aqui', 'comece-aqui', 'inicio']);

  if (!channel) {
    channel = await guild.channels.create({
      name: '🧭・comece-aqui',
      type: ChannelType.GuildText,
      parent: category.id,
      topic: 'Escolha seu objetivo na Pale Ascendancy e encontre o caminho certo em poucos segundos.',
      reason: 'Central de onboarding da Pale Ascendancy'
    });
  } else {
    await channel.edit({
      name: '🧭・comece-aqui',
      parent: category.id,
      topic: 'Escolha seu objetivo na Pale Ascendancy e encontre o caminho certo em poucos segundos.'
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

  await channel.permissionOverwrites.edit(guild.client.user.id, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: true,
    EmbedLinks: true,
    ManageMessages: true
  }).catch(() => {});

  return channel;
}

function mentionOrFallback(channels, aliases, fallback) {
  const channel = findChannelInCollection(channels, aliases);
  return channel ? `${channel}` : `\`${fallback}\``;
}

function onboardingEmbed(guild, channels) {
  const service = mentionOrFallback(channels, ['solicitar-serviço', 'solicitarservico'], '#solicitar-serviço');
  const recruitment = mentionOrFallback(channels, ['recrutamento'], '#recrutamento');
  const gallery = mentionOrFallback(channels, ['artes-e-edits', 'arteseedits', 'midia-e-artes'], '#artes-e-edits');
  const resources = mentionOrFallback(channels, ['downloads'], '#downloads');
  const general = mentionOrFallback(channels, ['geral', 'chat-geral'], '#geral');

  return new EmbedBuilder()
    .setColor(0x7b61ff)
    .setAuthor({
      name: 'Pale Ascendancy • Comunidade Profissional',
      iconURL: guild.iconURL({ size: 128 }) || undefined
    })
    .setTitle('🧭 Comece por aqui')
    .setDescription(
      'A Pale Ascendancy conecta **editores, designers, criadores e clientes**. Escolha abaixo o que você procura para o servidor adaptar melhor sua experiência.\n\n' +
      `💼 **Quero contratar** → abra um briefing em ${service}.\n` +
      `🎬 **Sou editor / criador** → mostre trabalhos em ${gallery} e, quando estiver pronto, candidate-se em ${recruitment}.\n` +
      `🎨 **Sou designer / criativo** → publique seu portfólio em ${gallery} e use ${recruitment} para entrar na área profissional.\n` +
      `📚 **Quero aprender** → explore ${resources}, peça feedback e participe de ${general}.\n\n` +
      '**Importante:** escolher um perfil abaixo não concede selo profissional. Profissionais verificados passam por análise da equipe.'
    )
    .setFooter({ text: 'rimuru-bot • escolha seu objetivo e comece em poucos segundos' });
}

function onboardingComponents() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('pa_growth_intent')
    .setPlaceholder('O que você veio fazer na Pale Ascendancy?')
    .addOptions(Object.entries(INTENTS).map(([value, intent]) => ({
      label: intent.label,
      description: intent.description.slice(0, 100),
      value,
      emoji: intent.emoji
    })));
  return [new ActionRowBuilder().addComponents(select)];
}

async function upsertStartPanel(guild, channel) {
  const title = '🧭 Comece por aqui';
  const channels = await guild.channels.fetch();
  const payload = {
    embeds: [onboardingEmbed(guild, channels)],
    components: onboardingComponents(),
    allowedMentions: { parse: [] }
  };

  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const matches = recent?.filter((message) =>
    message.author.id === guild.client.user.id && message.embeds.some((embed) => embed.title === title)
  );
  const primary = matches?.first() || null;

  if (primary) {
    await primary.edit(payload).catch(() => {});
    for (const duplicate of matches.values()) {
      if (duplicate.id !== primary.id) await duplicate.delete().catch(() => {});
    }
    return;
  }
  await channel.send(payload);
}

async function reconcileCommands(guild) {
  const current = await guild.commands.fetch();
  for (const builder of [communityCommand, professionalsCommand]) {
    const data = builder.toJSON();
    const existing = current.find((command) => command.name === data.name) || null;
    if (existing) await existing.edit(data);
    else await guild.commands.create(data);
  }

  // /boas-vindas era um gerenciador genérico do MangaMorph e não controla
  // o onboarding próprio da Pale. Removê-lo evita um comando morto/confuso.
  const staleWelcome = current.find((command) => command.name === 'boas-vindas') || null;
  if (staleWelcome) await staleWelcome.delete().catch(() => {});
}

function memberHasNormalizedRole(member, names) {
  const wanted = new Set(names);
  return member.roles.cache.some((role) => wanted.has(normalize(role.name)));
}

async function professionalStats(guild) {
  await guild.members.fetch().catch(() => null);
  const editors = [];
  const designers = [];

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    if (memberHasNormalizedRole(member, PROFESSIONAL_ROLES.editor)) editors.push(member);
    if (memberHasNormalizedRole(member, PROFESSIONAL_ROLES.designer)) designers.push(member);
  }
  return { editors, designers };
}

function peopleList(members, emptyText) {
  if (!members.length) return emptyText;
  return members.slice(0, 20).map((member) => `• ${member}`).join('\n');
}

async function professionalsPayload(guild) {
  const { editors, designers } = await professionalStats(guild);
  const channels = await guild.channels.fetch();
  const service = mentionOrFallback(channels, ['solicitar-serviço', 'solicitarservico'], '#solicitar-serviço');
  const recruitment = mentionOrFallback(channels, ['recrutamento'], '#recrutamento');

  return {
    embeds: [new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({ name: 'Pale Ascendancy • Rede Profissional', iconURL: guild.iconURL({ size: 128 }) || undefined })
      .setTitle('💼 Profissionais verificados')
      .setDescription(
        'Esta lista mostra apenas membros com **cargo profissional aprovado pela equipe**.\n\n' +
        `Para contratar, envie seu briefing em ${service}. Para entrar na rede profissional, use ${recruitment}.`
      )
      .addFields(
        { name: `🎬 Editores profissionais • ${editors.length}`, value: peopleList(editors, 'Nenhum editor verificado listado agora.') },
        { name: `🎨 Designers profissionais • ${designers.length}`, value: peopleList(designers, 'Nenhum designer verificado listado agora.') }
      )
      .setFooter({ text: 'rimuru-bot • verificação evita perfis se passando por profissionais da comunidade' })
      .setTimestamp()],
    ephemeral: true,
    allowedMentions: { parse: [] }
  };
}

async function communityPayload(guild) {
  const channels = await guild.channels.fetch();
  const { editors, designers } = await professionalStats(guild);
  const start = mentionOrFallback(channels, ['comece-aqui'], '#comece-aqui');
  const service = mentionOrFallback(channels, ['solicitar-serviço', 'solicitarservico'], '#solicitar-serviço');
  const gallery = mentionOrFallback(channels, ['artes-e-edits', 'arteseedits'], '#artes-e-edits');
  const recruitment = mentionOrFallback(channels, ['recrutamento'], '#recrutamento');

  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🌐 Pale Ascendancy')
      .setDescription(
        'Comunidade profissional para **edição de vídeo, design e produção criativa**, conectando talentos a pessoas que precisam contratar esses serviços.'
      )
      .addFields(
        { name: '👥 Comunidade', value: `${guild.memberCount} membros`, inline: true },
        { name: '✅ Profissionais verificados', value: String(editors.length + designers.length), inline: true },
        { name: '🧭 Primeiros passos', value: start, inline: true },
        { name: '💼 Contratar', value: service, inline: true },
        { name: '🎨 Portfólios e trabalhos', value: gallery, inline: true },
        { name: '📨 Entrar para a rede', value: recruitment, inline: true }
      )
      .setFooter({ text: 'rimuru-bot • comunidade, portfólio e oportunidades no mesmo lugar' })
      .setTimestamp()],
    ephemeral: true,
    allowedMentions: { parse: [] }
  };
}

export async function setupPaleGrowth(guild) {
  if (guild.id !== PALE_GROWTH_GUILD_ID) return false;
  await ensureIntentRoles(guild);
  const start = await findOrCreateStartChannel(guild);
  await upsertStartPanel(guild, start);
  await reconcileCommands(guild);
  console.log('[PA-GROWTH] Onboarding + /comunidade + /profissionais configurados.');
  return true;
}

export async function handlePaleGrowthInteraction(interaction) {
  if (!interaction.inGuild() || interaction.guildId !== PALE_GROWTH_GUILD_ID) return false;

  if (interaction.isChatInputCommand() && interaction.commandName === 'profissionais') {
    await interaction.reply(await professionalsPayload(interaction.guild));
    return true;
  }

  if (interaction.isChatInputCommand() && interaction.commandName === 'comunidade') {
    await interaction.reply(await communityPayload(interaction.guild));
    return true;
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'pa_growth_intent') {
    const key = interaction.values[0];
    const intent = INTENTS[key];
    if (!intent) return true;

    const roles = await ensureIntentRoles(interaction.guild);
    const selected = roles.get(key);
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member || !selected?.editable) {
      await interaction.reply({ content: 'Não consegui atualizar seu perfil agora. Avise a equipe.', ephemeral: true });
      return true;
    }

    for (const role of roles.values()) {
      if (role.id !== selected.id && member.roles.cache.has(role.id) && role.editable) {
        await member.roles.remove(role, 'Troca de objetivo no onboarding da Pale').catch(() => {});
      }
    }
    if (!member.roles.cache.has(selected.id)) {
      await member.roles.add(selected, 'Objetivo escolhido no onboarding da Pale').catch(() => {});
    }

    const channels = await interaction.guild.channels.fetch();
    const destinations = {
      cliente: mentionOrFallback(channels, ['solicitar-serviço', 'solicitarservico'], '#solicitar-serviço'),
      editor: mentionOrFallback(channels, ['artes-e-edits', 'arteseedits'], '#artes-e-edits'),
      designer: mentionOrFallback(channels, ['artes-e-edits', 'arteseedits'], '#artes-e-edits'),
      aprender: mentionOrFallback(channels, ['downloads'], '#downloads')
    };

    await interaction.reply({
      content: `${intent.emoji} Perfil definido como **${intent.label}**. Seu próximo melhor passo é ${destinations[key]}.`,
      ephemeral: true,
      allowedMentions: { parse: [] }
    });
    return true;
  }

  return false;
}
