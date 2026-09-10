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

client.once('ready', () => {
  console.log(`MangaMorph online como ${client.user.tag}`);
  client.user.setActivity('MangaMorph');
});

client.on('guildMemberAdd', async (member) => {
  try {
    if (MEMBER_ROLE_ID) {
      const role = await member.guild.roles.fetch(MEMBER_ROLE_ID).catch(() => null);
      if (role) {
        await member.roles.add(role, 'Entrada automática no MangaMorph').catch(console.error);
      }
    }

    const welcomeChannel = WELCOME_CHANNEL_ID
      ? await member.guild.channels.fetch(WELCOME_CHANNEL_ID).catch(() => null)
      : null;

    if (welcomeChannel?.isTextBased()) {
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
    }

    const logChannel = LOG_CHANNEL_ID
      ? await member.guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null)
      : null;

    if (logChannel?.isTextBased()) {
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
