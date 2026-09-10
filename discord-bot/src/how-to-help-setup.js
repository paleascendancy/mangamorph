import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits
} from 'discord.js';

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const bannerPath = path.join(__dirname, '..', 'assets', 'how-to-help-banner.webp.b64');

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function findTextChannel(guild, names) {
  const channels = await guild.channels.fetch();
  const wanted = names.map(normalize);
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildText && wanted.includes(normalize(channel.name))
  ) || null;
}

async function getContributeCategory(guild) {
  const channels = await guild.channels.fetch();
  let category = channels.find((channel) =>
    channel?.type === ChannelType.GuildCategory && normalize(channel.name).includes('contribuir')
  ) || null;

  if (!category) {
    category = await guild.channels.create({
      name: '「 MM 」 CONTRIBUIR',
      type: ChannelType.GuildCategory,
      reason: 'Estrutura de contribuição do MangaMorph'
    });
  }

  return category;
}

async function configureHowToHelp(guild) {
  const category = await getContributeCategory(guild);
  let channel = await findTextChannel(guild, ['🤝・como-ajudar', 'como-ajudar', 'comoajudar']);

  if (!channel) {
    channel = await guild.channels.create({
      name: '🤝・como-ajudar',
      type: ChannelType.GuildText,
      parent: category.id,
      topic: 'Descubra como contribuir com o MangaMorph • canal informativo',
      reason: 'Criar canal Como Ajudar do MangaMorph'
    });
  } else {
    if (channel.parentId !== category.id) {
      await channel.setParent(category.id, { lockPermissions: false }).catch(() => {});
    }
    await channel.setTopic('Descubra como contribuir com o MangaMorph • canal informativo').catch(() => {});
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
    { reason: 'Como Ajudar somente leitura' }
  );

  const roles = await guild.roles.fetch();
  const memberRole = roles.find((role) => normalize(role.name) === 'membro') || null;
  if (memberRole) {
    await channel.permissionOverwrites.edit(
      memberRole.id,
      locked,
      { reason: 'Como Ajudar somente leitura para membros' }
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
    { reason: 'Permitir painel Como Ajudar pelo bot' }
  );

  const [suggestions, reportError, applications, partnerships, requestWork, workProblem, support] = await Promise.all([
    findTextChannel(guild, ['💡・sugestões', '💡・sugestoes', 'sugestões', 'sugestoes']),
    findTextChannel(guild, ['🐞・reportar-erro', 'reportar-erro', 'reportarerro']),
    findTextChannel(guild, ['📨・candidaturas', 'candidaturas']),
    findTextChannel(guild, ['🔗・scans-e-parcerias', 'scans-e-parcerias', 'scanseparcerias']),
    findTextChannel(guild, ['➕・pedir-obra', 'pedir-obra', 'pedirobra']),
    findTextChannel(guild, ['⚠️・obra-com-problema', 'obra-com-problema', 'obracomproblema']),
    findTextChannel(guild, ['🎫・abrir-ticket', 'abrir-ticket', 'abrirticket'])
  ]);

  const mention = (target, fallback) => target ? `<#${target.id}>` : `#${fallback}`;

  const main = new EmbedBuilder()
    .setColor(0x4b89ff)
    .setAuthor({
      name: 'MangaMorph • Comunidade Oficial',
      iconURL: guild.iconURL({ size: 128 }) || client.user.displayAvatarURL()
    })
    .setTitle('🤝 Como ajudar o MangaMorph')
    .setDescription(
      'O **MangaMorph** cresce com a participação da comunidade. Você não precisa fazer parte da equipe para contribuir — pequenas ações já ajudam a plataforma a evoluir.'
    )
    .setImage('attachment://mangamorph-como-ajudar.webp')
    .addFields(
      {
        name: '📚  OBRAS & CATÁLOGO',
        value:
          `Sugira títulos em ${mention(requestWork, 'pedir-obra')} e avise sobre informações incorretas ou capítulos com problema em ${mention(workProblem, 'obra-com-problema')}.`
      },
      {
        name: '🐞  ENCONTROU UM ERRO?',
        value: `Reporte problemas do site, leitor ou servidor em ${mention(reportError, 'reportar-erro')}.`
      },
      {
        name: '💡  COMPARTILHE IDEIAS',
        value: `Envie melhorias para a plataforma, bot ou comunidade em ${mention(suggestions, 'sugestões')}.`
      },
      {
        name: '🔗  SCANS & PARCERIAS',
        value: `Projetos, scans e grupos interessados em colaborar podem usar ${mention(partnerships, 'scans-e-parcerias')}.`
      },
      {
        name: '📨  ENTRE PARA A EQUIPE',
        value: `Quer contribuir diretamente com o projeto? Veja ${mention(applications, 'candidaturas')} e envie sua candidatura.`
      }
    );

  const summary = new EmbedBuilder()
    .setColor(0x232833)
    .setTitle('✅ Como funciona')
    .setDescription(
      '`01` Escolha a área em que deseja ajudar.\n' +
      '`02` Use o canal indicado e explique sua contribuição com clareza.\n' +
      '`03` A equipe analisa, responde e encaminha quando necessário.\n\n' +
      `Se não souber onde enviar, abra ${mention(support, 'abrir-ticket')}.`
    )
    .setFooter({ text: 'Ler • descobrir • discutir • evoluir • MangaMorph' });

  const buttons = [];
  const addLink = (target, label, emoji) => {
    if (!target || buttons.length >= 5) return;
    buttons.push(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel(label)
        .setEmoji(emoji)
        .setURL(`https://discord.com/channels/${guild.id}/${target.id}`)
    );
  };

  addLink(suggestions, 'Sugestões', '💡');
  addLink(applications, 'Candidaturas', '📨');
  addLink(partnerships, 'Parcerias', '🔗');
  addLink(support, 'Suporte', '🎫');

  const components = buttons.length ? [new ActionRowBuilder().addComponents(buttons)] : [];

  const bannerBase64 = fs.readFileSync(bannerPath, 'utf8').trim();
  const banner = new AttachmentBuilder(Buffer.from(bannerBase64, 'base64'), {
    name: 'mangamorph-como-ajudar.webp'
  });

  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const oldPanels = recent?.filter((message) =>
    message.author.id === client.user.id &&
    message.embeds.some((embed) => embed.title === '🤝 Como ajudar o MangaMorph')
  );

  if (oldPanels) {
    for (const message of oldPanels.values()) {
      await message.delete().catch(() => {});
    }
  }

  await channel.send({
    embeds: [main, summary],
    components,
    files: [banner]
  });

  console.log(`[${guild.name}] 🤝・como-ajudar configurado com banner e painel.`);
}

client.once('ready', async () => {
  try {
    for (const guild of client.guilds.cache.values()) {
      await configureHowToHelp(guild);
    }
  } catch (error) {
    console.error('Falha ao configurar Como Ajudar:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
