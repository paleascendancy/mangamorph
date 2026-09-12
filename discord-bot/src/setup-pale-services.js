import 'dotenv/config';
import {
  ChannelType,
  Client,
  GatewayIntentBits
} from 'discord.js';

const { DISCORD_TOKEN } = process.env;
const PALE_GUILD_ID = '1513757281311916042';

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

client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(PALE_GUILD_ID).catch(() => null);
    if (!guild) {
      console.log('[PA-SERVICES] Pale Ascendancy não encontrada.');
      return;
    }

    const channels = await guild.channels.fetch();
    const supportCategory = channels.find((channel) =>
      channel?.type === ChannelType.GuildCategory && normalize(channel.name) === 'pasuporte'
    ) || null;

    let channel = channels.find((item) =>
      item?.type === ChannelType.GuildText && ['solicitarservico', 'pedirservico'].includes(normalize(item.name))
    ) || null;

    if (!channel) {
      channel = await guild.channels.create({
        name: '🧾・solicitar-serviço',
        type: ChannelType.GuildText,
        parent: supportCategory?.id || null,
        topic: 'Solicite serviços criativos da Pale Ascendancy por atendimento privado.',
        reason: 'Criar central de solicitação de serviços da Pale Ascendancy'
      });
    } else {
      await channel.edit({
        name: '🧾・solicitar-serviço',
        parent: supportCategory?.id || channel.parentId,
        topic: 'Solicite serviços criativos da Pale Ascendancy por atendimento privado.'
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

    await channel.permissionOverwrites.edit(client.user.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      EmbedLinks: true,
      ManageMessages: true
    }).catch(() => {});

    // Este script cuida apenas da existência/configuração do canal.
    // O painel e o botão são responsabilidade exclusiva de
    // setupPaleProfessionalServices(), evitando criar e apagar mensagens
    // a cada reinício/deploy do bot.
    console.log('[PA-SERVICES] 🧾・solicitar-serviço configurado sem republicar painel.');
  } catch (error) {
    console.error('[PA-SERVICES] Falha ao configurar solicitação de serviços:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
