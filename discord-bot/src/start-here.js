import 'dotenv/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits
} from 'discord.js';

const { DISCORD_TOKEN, MEMBER_ROLE_ID } = process.env;

const START_HERE_ART = 'https://raw.githubusercontent.com/paleascendancy/mangamorph/main/discord-bot/assets/start-here.webp';

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

async function findTextChannel(guild, names) {
  const channels = await guild.channels.fetch();
  const wanted = names.map(normalize);
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

async function findStartCategory(guild) {
  const channels = await guild.channels.fetch();
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildCategory && normalize(channel.name).includes('inicio')
  ) || null;
}

async function ensureStartHereChannel(guild) {
  let channel = await findTextChannel(guild, [
    '🧭・comece-aqui',
    'comece-aqui',
    'comeceaqui'
  ]);

  if (!channel) {
    const category = await findStartCategory(guild);
    channel = await guild.channels.create({
      name: '🧭・comece-aqui',
      type: ChannelType.GuildText,
      parent: category?.id || null,
      topic: 'Guia rápido • conheça o MangaMorph • canal somente leitura',
      reason: 'Canal de orientação do MangaMorph'
    });
    console.log(`[${guild.name}] Canal comece-aqui criado.`);
  } else {
    await channel
      .setTopic('Guia rápido • conheça o MangaMorph • canal somente leitura')
      .catch(() => {});
  }

  const denyInteraction = {
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
    AddReactions: false
  };

  await channel.permissionOverwrites.edit(
    guild.roles.everyone.id,
    {
      ViewChannel: true,
      ReadMessageHistory: true,
      ...denyInteraction
    },
    { reason: 'Canal comece-aqui somente leitura' }
  );

  // Bloqueia explicitamente qualquer cargo comum que possa herdar permissão de escrita.
  // Administradores do Discord ainda podem ignorar overwrites por regra da própria plataforma.
  const roles = await guild.roles.fetch();
  for (const role of roles.values()) {
    if (role.id === guild.roles.everyone.id || role.managed) continue;
    await channel.permissionOverwrites.edit(
      role.id,
      denyInteraction,
      { reason: 'Comece-aqui somente leitura para todos os cargos' }
    ).catch(() => {});
  }

  const memberRole = await findMemberRole(guild);
  if (memberRole) {
    await channel.permissionOverwrites.edit(
      memberRole.id,
      denyInteraction,
      { reason: 'Bloquear interação de membros no comece-aqui' }
    );
  }

  await channel.permissionOverwrites.edit(
    client.user.id,
    {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      EmbedLinks: true,
      ManageMessages: true
    },
    { reason: 'Permitir painel de orientação do MangaMorph' }
  );

  return channel;
}

function buildEmbeds() {
  const header = new EmbedBuilder()
    .setColor(0x6f7cff)
    .setAuthor({ name: 'MangaMorph • Comunidade Oficial' })
    .setTitle('🧭 Comece por aqui')
    .setDescription(
      'Chegou agora? Este é o seu ponto de partida. Em poucos passos você entende como o servidor funciona e encontra tudo o que precisa.\n\n' +
      '**Leitura rápida • navegação direta • sem complicação**'
    )
    .setThumbnail(START_HERE_ART);

  const primeirosPassos = new EmbedBuilder()
    .setColor(0x2f3545)
    .setTitle('01  ·  PRIMEIROS PASSOS')
    .setDescription(
      '`01` **Leia as regras**\n' +
      'Veja as diretrizes da comunidade antes de participar.\n\n' +
      '`02` **Entre na conversa**\n' +
      'Use o canal geral para conhecer a comunidade e trocar ideias.\n\n' +
      '`03` **Explore o MangaMorph**\n' +
      'Acompanhe obras, recomendações, novidades e novos capítulos.'
    );

  const atalhos = new EmbedBuilder()
    .setColor(0x2f3545)
    .setTitle('02  ·  ONDE ENCONTRAR CADA COISA')
    .setDescription(
      '📚 **Mangás & recomendações** — descubra e discuta obras.\n' +
      '🚀 **Lançamentos** — acompanhe novidades e capítulos.\n' +
      '💡 **Sugestões** — envie ideias para melhorar o projeto.\n' +
      '🐞 **Reportar erro** — avise sobre problemas na plataforma.\n' +
      '🎫 **Suporte** — abra um atendimento privado com a equipe.\n' +
      '📨 **Candidaturas** — candidate-se para contribuir com o MangaMorph.'
    );

  const comunidade = new EmbedBuilder()
    .setColor(0x2f3545)
    .setTitle('03  ·  FAÇA PARTE')
    .setDescription(
      'O MangaMorph é construído junto com a comunidade. Participe das discussões, compartilhe boas recomendações, reporte problemas e ajude o projeto a evoluir.\n\n' +
      '**Use os botões abaixo para ir direto aos canais principais.**'
    )
    .setFooter({ text: 'MangaMorph • Seu ponto de partida' });

  return [header, primeirosPassos, atalhos, comunidade];
}

async function buildNavigationRows(guild) {
  const targets = [
    { label: 'Regras', emoji: '📜', names: ['📜・regras', 'regras'] },
    { label: 'Geral', emoji: '💬', names: ['💬・geral', 'geral'] },
    { label: 'Lançamentos', emoji: '🚀', names: ['🚀・lançamentos', 'lançamentos', 'lancamentos'] },
    { label: 'Suporte', emoji: '🎫', names: ['🎫・abrir-ticket', 'abrir-ticket', 'abrirticket'] },
    { label: 'Candidaturas', emoji: '📨', names: ['📨・candidaturas', 'candidaturas', 'candidatura'] }
  ];

  const buttons = [];
  for (const target of targets) {
    const channel = await findTextChannel(guild, target.names);
    if (!channel) continue;

    buttons.push(
      new ButtonBuilder()
        .setLabel(target.label)
        .setEmoji(target.emoji)
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guild.id}/${channel.id}`)
    );
  }

  if (!buttons.length) return [];
  return [new ActionRowBuilder().addComponents(buttons.slice(0, 5))];
}

async function ensureStartHerePanel(guild) {
  const channel = await ensureStartHereChannel(guild);
  const embeds = buildEmbeds();
  const components = await buildNavigationRows(guild);

  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const botMessages = recent?.filter((message) =>
    message.author.id === client.user.id &&
    message.embeds.some((embed) =>
      embed.title === '🧭 Comece por aqui' || embed.title === '🧭 Comece aqui'
    )
  );

  const primary = botMessages?.first() || null;
  const payload = { embeds, components };

  if (primary) {
    await primary.edit(payload);
    const duplicates = botMessages.filter((message) => message.id !== primary.id);
    for (const message of duplicates.values()) {
      await message.delete().catch(() => {});
    }
    console.log(`[${guild.name}] Painel comece-aqui atualizado.`);
    return;
  }

  await channel.send(payload);
  console.log(`[${guild.name}] Painel comece-aqui publicado.`);
}

client.once(Events.ClientReady, async () => {
  console.log(`Preparando comece-aqui como ${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    await ensureStartHerePanel(guild).catch((error) => {
      console.error(`Falha ao preparar comece-aqui em ${guild.name}:`, error);
    });
  }

  client.destroy();
});

client.login(DISCORD_TOKEN);
