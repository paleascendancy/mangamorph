import 'dotenv/config';
import {
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  Partials
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

client.once('ready', () => {
  console.log(`MangaMorph online como ${client.user.tag}`);
  client.user.setActivity('MangaMorph');
});

client.on('guildMemberAdd', async (member) => {
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

    const logChannel = await findTextChannel(
      member.guild,
      LOG_CHANNEL_ID,
      ['📋・logs', 'logs', 'log']
    );

    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0x2b2f36)
        .setTitle('Novo membro')
        .addFields(
          { name: 'Usuário', value: `${member.user.tag}`, inline: true },
          { name: 'ID', value: member.id, inline: true },
          { name: 'Total', value: String(member.guild.memberCount), inline: true }
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
        .setTimestamp();

      await logChannel.send({ embeds: [logEmbed] });
    }
  } catch (error) {
    console.error('Falha ao processar entrada de membro:', error);
  }
});

client.on('error', (error) => {
  console.error('Erro do cliente Discord:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Erro não tratado:', error);
});

client.login(DISCORD_TOKEN);
