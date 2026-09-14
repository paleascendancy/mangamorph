import 'dotenv/config';
import {
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits
} from 'discord.js';

const { DISCORD_TOKEN } = process.env;
const PALE_GUILD_ID = '1513757281311916042';

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

function findTextChannel(channels, names) {
  const wanted = new Set(names.map(normalize));
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildText && wanted.has(normalize(channel.name))
  ) || null;
}

function mentionOrFallback(channels, names, fallback) {
  const channel = findTextChannel(channels, names);
  return channel ? `${channel}` : `\`${fallback}\``;
}

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(PALE_GUILD_ID).catch(() => null);
    if (!guild) {
      console.log('[PA-ABOUT] Pale Ascendancy não encontrada.');
      return;
    }

    await guild.members.fetch().catch(() => null);
    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();
    const introCategory = channels.find((channel) =>
      channel?.type === ChannelType.GuildCategory && normalize(channel.name) === 'painicio'
    ) || null;

    let channel = findTextChannel(channels, ['sobre-a-comunidade', 'nossa-comunidade', 'institucional']);

    if (!channel) {
      channel = await guild.channels.create({
        name: '🌐・sobre-a-comunidade',
        type: ChannelType.GuildText,
        parent: introCategory?.id || null,
        topic: 'Conheça a Pale Ascendancy: comunidade, profissionais, aprendizado e contratação de serviços criativos.',
        reason: 'Criar apresentação oficial da comunidade Pale Ascendancy'
      });
    } else {
      await channel.edit({
        name: '🌐・sobre-a-comunidade',
        parent: introCategory?.id || channel.parentId,
        topic: 'Conheça a Pale Ascendancy: comunidade, profissionais, aprendizado e contratação de serviços criativos.'
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

    const freshChannels = await guild.channels.fetch();
    const startMention = mentionOrFallback(freshChannels, ['comece-aqui'], '#comece-aqui');
    const serviceMention = mentionOrFallback(freshChannels, ['solicitar-serviço', 'pedir-serviço'], '#solicitar-serviço');
    const recruitmentMention = mentionOrFallback(freshChannels, ['recrutamento'], '#recrutamento');
    const galleryMention = mentionOrFallback(freshChannels, ['artes-e-edits', 'arteseedits', 'midia-e-artes'], '#artes-e-edits');
    const suggestionsMention = mentionOrFallback(freshChannels, ['sugestões', 'sugestoes'], '#sugestões');

    const editorRole = roles.find((role) => normalize(role.name) === 'editorprofissional') || null;
    const designerRole = roles.find((role) => normalize(role.name) === 'designerprofissional') || null;
    const verifiedEditors = editorRole?.members?.filter((member) => !member.user.bot).size || 0;
    const verifiedDesigners = designerRole?.members?.filter((member) => !member.user.bot).size || 0;

    const header = new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({
        name: 'Pale Ascendancy • Comunidade Criativa Profissional',
        iconURL: guild.iconURL({ size: 128 }) || client.user.displayAvatarURL()
      })
      .setTitle('🌐 Sobre a Pale Ascendancy')
      .setDescription(
        'A **Pale Ascendancy** é uma comunidade para quem cria e para quem precisa de criação. Reunimos **editores de vídeo, designers, motion designers, criadores e clientes** em um ambiente organizado para aprender, mostrar trabalho, fazer networking e contratar serviços.\n\n' +
        'Nosso foco não é quantidade vazia de membros: queremos uma comunidade onde talento consiga **evoluir, ser descoberto e receber oportunidades reais**.'
      );

    const paths = new EmbedBuilder()
      .setColor(0x2b2f3a)
      .setTitle('🧭 Encontre seu caminho')
      .setDescription(
        `🧭 **Novo por aqui?** Comece em ${startMention}.\n` +
        `💼 **Quer contratar?** Envie um briefing em ${serviceMention}.\n` +
        `🎨 **Quer mostrar seu trabalho?** Publique em ${galleryMention}.\n` +
        `✅ **Quer entrar para a rede profissional?** Candidate-se em ${recruitmentMention}.\n` +
        `💡 **Tem uma ideia para melhorar a comunidade?** Use ${suggestionsMention}.`
      );

    const trust = new EmbedBuilder()
      .setColor(0x232833)
      .setTitle('✅ Rede profissional verificada')
      .setDescription(
        'Os cargos **Editor Profissional** e **Designer Profissional** não são entregues automaticamente. A equipe analisa o perfil antes de liberar o selo, ajudando clientes a diferenciar participantes da comunidade de profissionais verificados.\n\n' +
        `🎬 **Editores verificados:** ${verifiedEditors}\n` +
        `🎨 **Designers verificados:** ${verifiedDesigners}\n\n` +
        'Use **`/profissionais`** para consultar a lista atual.'
      )
      .setFooter({ text: 'rimuru-bot • Pale Ascendancy' });

    const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    const panels = recent?.filter((message) =>
      message.author.id === client.user.id &&
      message.embeds.some((embed) => ['🌐 Sobre a comunidade', '🌐 Sobre a Pale Ascendancy'].includes(embed.title))
    );

    const payload = { embeds: [header, paths, trust] };
    const primary = panels?.first() || null;
    if (primary) {
      await primary.edit(payload);
      const duplicates = panels.filter((message) => message.id !== primary.id);
      for (const duplicate of duplicates.values()) {
        await duplicate.delete().catch(() => {});
      }
    } else {
      await channel.send(payload);
    }

    console.log('[PA-ABOUT] 🌐・sobre-a-comunidade atualizado com posicionamento profissional dinâmico.');
  } catch (error) {
    console.error('[PA-ABOUT] Falha ao configurar sobre a comunidade:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
