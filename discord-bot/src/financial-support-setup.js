import 'dotenv/config';
import {
  ActionRowBuilder,
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
    channel?.type === ChannelType.GuildText && wanted.includes(normalize(channel.name))
  ) || null;
}

async function configureFinancialSupport(guild) {
  const channel = await findTextChannel(guild, ['🤝・como-ajudar', 'como-ajudar', 'comoajudar']);
  if (!channel) {
    console.log(`[${guild.name}] Canal como-ajudar não encontrado.`);
    return;
  }

  const support = await findTextChannel(guild, ['🎫・abrir-ticket', 'abrir-ticket', 'abrirticket']);
  const supportMention = support ? `<#${support.id}>` : '#abrir-ticket';

  const embed = new EmbedBuilder()
    .setColor(0x2f7dff)
    .setTitle('💙 Apoie o MangaMorph')
    .setDescription(
      'Se você quiser contribuir financeiramente, o apoio é **totalmente opcional** e ajuda o projeto a continuar evoluindo.'
    )
    .addFields(
      {
        name: '💻 Onde o apoio pode ser usado',
        value:
          '• domínio do site\n' +
          '• Supabase Pro e banco de dados\n' +
          '• hospedagem, armazenamento e infraestrutura\n' +
          '• bot e automações\n' +
          '• melhorias técnicas e visuais do MangaMorph'
      },
      {
        name: '💳 Como contribuir',
        value:
          `Abra ${supportMention} e selecione **Apoiar o projeto**. A forma de contribuição é passada pelo atendimento.`
      }
    )
    .setFooter({
      text: 'Apoio opcional • contribuir não concede cargo de staff, poder de moderação ou tratamento especial'
    });

  const components = support
    ? [new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel('Apoiar o projeto')
          .setEmoji('💙')
          .setURL(`https://discord.com/channels/${guild.id}/${support.id}`)
      )]
    : [];

  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = recent?.find((message) =>
    message.author.id === client.user.id &&
    message.embeds.some((item) => item.title === '💙 Apoie o MangaMorph')
  ) || null;

  const payload = { embeds: [embed], components };

  if (existing) {
    await existing.edit(payload);
  } else {
    await channel.send(payload);
  }

  console.log(`[${guild.name}] Painel de apoio financeiro configurado.`);
}

client.once('ready', async () => {
  try {
    for (const guild of client.guilds.cache.values()) {
      await configureFinancialSupport(guild);
    }
  } catch (error) {
    console.error('Falha ao configurar apoio financeiro:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
