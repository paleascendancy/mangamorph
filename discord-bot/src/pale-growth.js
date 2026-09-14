import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder
} from 'discord.js';
import { upsertUniquePanel } from './utils/panel-upsert.js';

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
    description: 'Encontrar editor ou designer para um projeto.'
  },
  editor: {
    role: '🎬・Editor / Criador',
    label: 'Sou editor / criador',
    emoji: '🎬',
    description: 'Mostrar trabalhos, evoluir e buscar oportunidades.'
  },
  designer: {
    role: '🎨・Designer / Criativo',
    label: 'Sou designer / criativo',
    emoji: '🎨',
    description: 'Mostrar portfólio, evoluir e buscar oportunidades.'
  },
  aprender: {
    role: '📚・Em aprendizado',
    label: 'Quero aprender',
    emoji: '📚',
    description: 'Aprender, receber feedback e conhecer recursos.'
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

function mentionOrFallback(channels, aliases, fallback) {
  const channel = findChannelInCollection(channels, aliases);
  return channel ? `${channel}` : `\`${fallback}\``;
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

async function configurePublicPanelChannel(guild, channel) {
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
}

async function findOrCreateStartChannel(guild) {
  const category = await findOrCreateIntroCategory(guild);
  const channels = await guild.channels.fetch();
  let channel = findChannelInCollection(channels, ['🧭・comece-aqui', 'comece-aqui']);

  if (!channel) {
    channel = await guild.channels.create({
      name: '🧭・comece-aqui',
      type: ChannelType.GuildText,
      parent: category.id,
      topic: 'Escolha seu objetivo e encontre o caminho certo na Pale Ascendancy.',
      reason: 'Central de onboarding da Pale Ascendancy'
    });
  } else {
    await channel.edit({
      name: '🧭・comece-aqui',
      parent: category.id,
      topic: 'Escolha seu objetivo e encontre o caminho certo na Pale Ascendancy.'
    }).catch(() => {});
  }

  await configurePublicPanelChannel(guild, channel);
  return channel;
}

async function findOrCreateAboutChannel(guild) {
  const category = await findOrCreateIntroCategory(guild);
  const channels = await guild.channels.fetch();
  let channel = findChannelInCollection(channels, ['sobre-a-comunidade', 'nossa-comunidade', 'institucional']);

  if (!channel) {
    channel = await guild.channels.create({
      name: '🌐・sobre-a-comunidade',
      type: ChannelType.GuildText,
      parent: category.id,
      topic: 'Conheça a Pale Ascendancy, sua rede profissional e como participar.',
      reason: 'Apresentação institucional da Pale Ascendancy'
    });
  } else {
    await channel.edit({
      name: '🌐・sobre-a-comunidade',
      parent: category.id,
      topic: 'Conheça a Pale Ascendancy, sua rede profissional e como participar.'
    }).catch(() => {});
  }

  await configurePublicPanelChannel(guild, channel);
  return channel;
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
      name: 'Pale Ascendancy • Comece aqui',
      iconURL: guild.iconURL({ size: 128 }) || undefined
    })
    .setTitle('🧭 Qual é o seu objetivo?')
    .setDescription(
      'Escolha uma opção no menu abaixo. O **rimuru-bot** organiza sua entrada e mostra o melhor caminho para você.'
    )
    .addFields(
      { name: '💼 Quero contratar', value: `Envie seu briefing em ${service}.` },
      { name: '🎬🎨 Quero criar e mostrar meu trabalho', value: `Publique seus projetos em ${gallery} e construa seu portfólio.` },
      { name: '📚 Quero aprender e evoluir', value: `Explore ${resources}, peça feedback e participe de ${general}.` },
      { name: '✅ Quero entrar para a rede profissional', value: `Candidate-se em ${recruitment}. O selo profissional depende de análise da equipe.` }
    )
    .setFooter({ text: 'PA_START_PANEL • rimuru-bot' });
}

function onboardingComponents() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('pa_growth_intent')
    .setPlaceholder('Selecione seu objetivo na comunidade')
    .addOptions(Object.entries(INTENTS).map(([value, intent]) => ({
      label: intent.label,
      description: intent.description.slice(0, 100),
      value,
      emoji: intent.emoji
    })));
  return [new ActionRowBuilder().addComponents(select)];
}

async function upsertStartPanel(guild, channel) {
  const channels = await guild.channels.fetch();
  const payload = {
    embeds: [onboardingEmbed(guild, channels)],
    components: onboardingComponents(),
    allowedMentions: { parse: [] }
  };

  await upsertUniquePanel(channel, {
    panelKey: 'PA_START_PANEL',
    payload,
    matchTitles: ['🧭 Comece por aqui', '🧭 Bem-vindo à Pale Ascendancy', '🧭 Qual é o seu objetivo?'],
    matchCustomIds: ['pa_growth_intent']
  });
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

function buildAboutEmbeds(guild, channels, stats) {
  const start = mentionOrFallback(channels, ['comece-aqui'], '#comece-aqui');
  const service = mentionOrFallback(channels, ['solicitar-serviço', 'solicitarservico'], '#solicitar-serviço');
  const recruitment = mentionOrFallback(channels, ['recrutamento'], '#recrutamento');
  const gallery = mentionOrFallback(channels, ['artes-e-edits', 'arteseedits', 'midia-e-artes'], '#artes-e-edits');
  const suggestions = mentionOrFallback(channels, ['sugestões', 'sugestoes'], '#sugestões');

  const main = new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({
      name: 'Pale Ascendancy • Comunidade Criativa Profissional',
      iconURL: guild.iconURL({ size: 128 }) || undefined
    })
    .setTitle('🌐 A Pale Ascendancy')
    .setDescription(
      'Um espaço para **editores, designers, criadores e clientes** se encontrarem com propósito: aprender, mostrar trabalho, fazer networking e transformar talento em oportunidades reais.'
    )
    .addFields(
      { name: '💼 Para clientes', value: `Encontre profissionais e abra seu projeto em ${service}.` },
      { name: '🎨 Para criadores', value: `Mostre seu trabalho em ${gallery} e construa presença dentro da comunidade.` },
      { name: '🚀 Para quem quer crescer', value: `Comece em ${start} e, quando estiver pronto, candidate-se em ${recruitment}.` }
    )
    .setFooter({ text: 'PA_ABOUT_PANEL • rimuru-bot' });

  const trust = new EmbedBuilder()
    .setColor(0x2b2f3a)
    .setTitle('✅ Rede profissional verificada')
    .setDescription(
      'Os selos **Editor Profissional** e **Designer Profissional** não são automáticos. A equipe analisa cada perfil para manter a rede confiável para clientes e criadores.'
    )
    .addFields(
      { name: '🎬 Editores verificados', value: String(stats.editors.length), inline: true },
      { name: '🎨 Designers verificados', value: String(stats.designers.length), inline: true },
      { name: '🔎 Encontrar profissionais', value: 'Use **`/profissionais`**', inline: false },
      { name: '💡 Melhorar a comunidade', value: `Envie sua ideia em ${suggestions}.`, inline: false }
    )
    .setFooter({ text: 'PA_ABOUT_PANEL • Pale Ascendancy' });

  return [main, trust];
}

async function upsertAboutPanel(guild, channel) {
  const channels = await guild.channels.fetch();
  const stats = await professionalStats(guild);
  const payload = {
    embeds: buildAboutEmbeds(guild, channels, stats),
    components: [],
    allowedMentions: { parse: [] }
  };

  await upsertUniquePanel(channel, {
    panelKey: 'PA_ABOUT_PANEL',
    payload,
    matchTitles: ['🌐 Sobre a comunidade', '🌐 Sobre a Pale Ascendancy', '🌐 O que é a Pale Ascendancy?', '🌐 A Pale Ascendancy']
  });
}

async function reconcileCommands(guild) {
  const current = await guild.commands.fetch();
  for (const builder of [communityCommand, professionalsCommand]) {
    const data = builder.toJSON();
    const existing = current.find((command) => command.name === data.name) || null;
    if (existing) await existing.edit(data);
    else await guild.commands.create(data);
  }

  const staleWelcome = current.find((command) => command.name === 'boas-vindas') || null;
  if (staleWelcome) await staleWelcome.delete().catch(() => {});
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
      .setDescription(`Para contratar, envie seu briefing em ${service}. Para entrar na rede profissional, use ${recruitment}.`)
      .addFields(
        { name: `🎬 Editores • ${editors.length}`, value: peopleList(editors, 'Nenhum editor verificado listado agora.') },
        { name: `🎨 Designers • ${designers.length}`, value: peopleList(designers, 'Nenhum designer verificado listado agora.') }
      )
      .setFooter({ text: 'rimuru-bot • somente profissionais aprovados pela equipe' })
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
      .setDescription('Comunidade profissional para **edição de vídeo, design e produção criativa**.')
      .addFields(
        { name: '👥 Membros', value: String(guild.memberCount), inline: true },
        { name: '✅ Profissionais', value: String(editors.length + designers.length), inline: true },
        { name: '🧭 Começar', value: start, inline: true },
        { name: '💼 Contratar', value: service, inline: true },
        { name: '🎨 Portfólios', value: gallery, inline: true },
        { name: '📨 Rede profissional', value: recruitment, inline: true }
      )
      .setFooter({ text: 'rimuru-bot • comunidade, portfólio e oportunidades' })
      .setTimestamp()],
    ephemeral: true,
    allowedMentions: { parse: [] }
  };
}

export async function setupPaleGrowth(guild) {
  if (guild.id !== PALE_GROWTH_GUILD_ID) return false;

  await ensureIntentRoles(guild);
  const start = await findOrCreateStartChannel(guild);
  const about = await findOrCreateAboutChannel(guild);

  await upsertStartPanel(guild, start);
  await upsertAboutPanel(guild, about);
  await reconcileCommands(guild);

  console.log('[PA-GROWTH] Painéis públicos organizados e sem duplicações.');
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
      content: `${intent.emoji} Perfil definido como **${intent.label}**. Seu próximo passo é ${destinations[key]}.`,
      ephemeral: true,
      allowedMentions: { parse: [] }
    });
    return true;
  }

  return false;
}
