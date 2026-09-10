import 'dotenv/config';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  GatewayIntentBits,
  PermissionFlagsBits
} from 'discord.js';

const { DISCORD_TOKEN } = process.env;
const PALE_GUILD_ID = '1513757281311916042';

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const CATEGORY_PLAN = [
  ['1546650023499137116', '「 PA 」 INÍCIO'],
  ['1546650026841866311', '「 PA 」 COMUNIDADE'],
  ['1546650028599148637', '「 PA 」 RECURSOS'],
  ['1546650030914674728', '「 PA 」 ENTRETENIMENTO'],
  ['1546650032810492085', '「 PA 」 VOZ'],
  ['1546650034295283864', '「 PA 」 SUPORTE'],
  ['1546650070202720337', '「 PA 」 EQUIPE'],
  ['1546655484000477335', '「 PA 」 ARQUIVO']
];

const CHANNEL_PLAN = [
  ['1513764153201000591', '👋・boas-vindas', '1546650023499137116', 'Recepção oficial e orientação inicial para novos membros.'],
  ['1513764175510372513', '📜・diretrizes', '1546650023499137116', 'Regras e diretrizes oficiais da Pale Ascendancy.'],
  ['1513764156614905956', '📢・comunicados', '1546650023499137116', 'Anúncios e atualizações oficiais da equipe.'],
  ['1513764159186141214', '🎭・cargos', '1546650023499137116', 'Identidade, funções e personalização da comunidade.'],

  ['1513764165033132094', '💬・geral', '1546650026841866311', 'Canal principal de conversa da comunidade.'],
  ['1513764181168492645', '🎨・artes-e-edits', '1546650026841866311', 'Compartilhe edições, artes, memes e trabalhos criativos.'],
  ['1513764177863508048', '💡・sugestões', '1546650026841866311', 'Ideias e melhorias para a Pale Ascendancy.'],
  ['1513764166228246599', '🤖・comandos', '1546650026841866311', 'Canal dedicado a bots e comandos.'],

  ['1546650121721221160', '📥・downloads', '1546650028599148637', 'Recursos e links oficiais ou autorizados para criação.'],
  ['1546650127354044476', '🎬・presets-e-xml', '1546650028599148637', 'Presets, XMLs e arquivos de projeto compartilhados.'],
  ['1546650162296918148', '🧩・packs-e-overlays', '1546650028599148637', 'Packs, overlays, texturas, fontes e elementos gráficos.'],
  ['1546650166017261609', '🎵・audios-e-sfx', '1546650028599148637', 'Áudios e efeitos sonoros para projetos criativos.'],

  ['1513764169906782309', '👒・mudae', '1546650030914674728', 'Canal dedicado ao Mudae.'],
  ['1546650171448893471', '🦝・poketwo', '1546650030914674728', 'Canal dedicado ao Pokétwo.'],
  ['1513764174579105902', '🎮・jogos', '1546650030914674728', 'Minigames e entretenimento com bots.'],

  ['1513764168220545055', '💬・chat-de-voz', '1546650032810492085', 'Chat de apoio para quem está nas salas de voz.'],
  ['1513764178752573581', '🎫・abrir-ticket', '1546650034295283864', 'Central privada de suporte, parcerias e denúncias.'],

  ['1513764140714299513', '💬・staff', '1546650070202720337', 'Comunicação interna da equipe.'],
  ['1513764141947551746', '🛡️・comandos-staff', '1546650070202720337', 'Ferramentas e comandos internos da equipe.'],
  ['1546650259600445471', '📊・logs', '1546650070202720337', 'Registros administrativos e auditoria.'],

  ['1513764155469861004', '🗃️・registro-antigo', '1546655484000477335', 'Conteúdo legado arquivado.'],
  ['1513764154593247262', '📜・regras-antigas', '1546655484000477335', 'Versão antiga das regras, mantida apenas como arquivo.']
];

const VOICE_PLAN = [
  ['1513764145562914967', '🎧・edição', '1546650032810492085'],
  ['1546650202423820409', '🎵・música', '1546650032810492085'],
  ['1513764151565226084', '🎮・gaming', '1546650032810492085'],
  ['1513764152403951657', '💤・afk', '1546650032810492085'],
  ['1513764143386333194', '🔊・reunião-staff', '1546650070202720337']
];

const HUMAN_ROLE_PLAN = [
  ['1513763956072775791', '🧩・Desenvolvedor'],
  ['1513763956924223498', '🛡️・Administrador'],
  ['1527124247988670654', '⚔️・Moderador'],
  ['1527090647415394314', '🎫・Suporte'],
  ['1528095983303524383', '🎬・Editor de Elite'],
  ['1546650019824795648', '🎨・Editor'],
  ['1515569280706412654', '⚜️・Membro'],
  ['1516183733391196291', '💎・Double Booster'],
  ['1526013321654833192', '🤖・Bots'],
  ['1527098510988542133', '🤖・Mambo'],
  ['1515574975367479367', '🎬・CapCut'],
  ['1515575331241595060', '🎞️・After Effects'],
  ['1515575921254465566', '🎞️・Premiere Pro'],
  ['1515576091195080744', '🎞️・Alight Motion'],
  ['1515576252738834473', '🎞️・DaVinci Resolve'],
  ['1515576402899112027', '🎨・Photoshop']
];

const DELETE_ROLE_IDS = new Set([
  '1527124174492139520',
  '1527124199309574244',
  '1546422270891925554',
  '1547642417635794965',
  '1547642418785161227',
  '1547642420294983750',
  '1547642421888680017',
  '1547642423398760458',
  '1547642424761778206',
  '1547642426112610396',
  '1547642427538538546',
  '1547642430130622565',
  '1547642431426658375',
  '1547642432496206008',
  '1547642434094239867',
  '1547642435235094618',
  '1547642436476469388',
  '1547642438297059348',
  '1547642439752482896',
  '1547642441115504714'
]);

const STAFF_NAMES = new Set(['dono', 'desenvolvedor', 'administrador', 'moderador', 'suporte']);

async function fetchChannel(guild, id) {
  return guild.channels.fetch(id).catch(() => null);
}

async function renameAndMoveChannels(guild) {
  for (let i = 0; i < CATEGORY_PLAN.length; i += 1) {
    const [id, name] = CATEGORY_PLAN[i];
    const category = await fetchChannel(guild, id);
    if (!category || category.type !== ChannelType.GuildCategory) continue;
    await category.edit({ name, position: i }, 'Organização profissional da Pale Ascendancy').catch((error) => {
      console.error(`[PA-SETUP] Falha ao editar categoria ${name}:`, error.message);
    });
  }

  for (const [id, name, parentId, topic] of CHANNEL_PLAN) {
    const channel = await fetchChannel(guild, id);
    if (!channel || channel.type !== ChannelType.GuildText) continue;
    await channel.edit({ name, parent: parentId, topic }, 'Organização profissional da Pale Ascendancy').catch((error) => {
      console.error(`[PA-SETUP] Falha ao editar canal ${name}:`, error.message);
    });
  }

  for (const [id, name, parentId] of VOICE_PLAN) {
    const channel = await fetchChannel(guild, id);
    if (!channel || channel.type !== ChannelType.GuildVoice) continue;
    await channel.edit({ name, parent: parentId }, 'Organização profissional da Pale Ascendancy').catch((error) => {
      console.error(`[PA-SETUP] Falha ao editar voz ${name}:`, error.message);
    });
  }
}

async function deleteMangaMorphArtifacts(guild) {
  const channels = await guild.channels.fetch();
  const mmCategories = channels.filter((channel) =>
    channel?.type === ChannelType.GuildCategory && ['mminicio', 'mmcontribuir'].includes(normalize(channel.name))
  );

  for (const category of mmCategories.values()) {
    const children = channels.filter((channel) => channel?.parentId === category.id);
    for (const child of children.values()) {
      await child.delete('Remover estrutura MangaMorph criada por engano na Pale Ascendancy').catch(() => {});
    }
    await category.delete('Remover estrutura MangaMorph criada por engano na Pale Ascendancy').catch(() => {});
  }

  const placeholder = await fetchChannel(guild, '1513764134204870849');
  if (placeholder) {
    await placeholder.delete('Remover canal placeholder de convite').catch(() => {});
  }
}

async function cleanRoles(guild) {
  const roles = await guild.roles.fetch();

  for (const id of DELETE_ROLE_IDS) {
    const role = roles.get(id);
    if (!role || role.managed) continue;
    if (!role.editable) {
      console.log(`[PA-SETUP][PENDING_ROLE_DELETE] ${role.name} id=${role.id}`);
      continue;
    }
    await role.delete('Limpeza de cargos duplicados, teste ou criados por engano').catch((error) => {
      console.error(`[PA-SETUP] Falha ao excluir cargo ${role.name}:`, error.message);
    });
  }

  for (const [id, newName] of HUMAN_ROLE_PLAN) {
    const role = roles.get(id);
    if (!role || role.managed) continue;
    if (!role.editable) {
      console.log(`[PA-SETUP][PENDING_ROLE_EDIT] ${role.name} -> ${newName} id=${role.id}`);
      continue;
    }
    await role.edit({ name: newName, mentionable: false }, 'Padronização visual de cargos da Pale Ascendancy').catch((error) => {
      console.error(`[PA-SETUP] Falha ao editar cargo ${role.name}:`, error.message);
    });
  }

  const redRoles = [...roles.values()].filter((role) => !role.managed && normalize(role.name) === 'vermelho');
  if (redRoles.length > 1) {
    const primary = redRoles[0];
    if (primary.editable) {
      await primary.edit({ name: '🔴・Vermelho', color: 0xe74c3c, mentionable: false }).catch(() => {});
    }
    for (const duplicate of redRoles.slice(1)) {
      if (!duplicate.editable) {
        console.log(`[PA-SETUP][PENDING_ROLE_DELETE] ${duplicate.name} id=${duplicate.id}`);
        continue;
      }
      for (const member of duplicate.members.values()) {
        if (primary.editable) await member.roles.add(primary).catch(() => {});
      }
      await duplicate.delete('Consolidar cargo de cor duplicado').catch(() => {});
    }
  }
}

async function setInfoPermissions(guild) {
  const readOnlyIds = [
    '1513764153201000591',
    '1513764175510372513',
    '1513764156614905956',
    '1513764159186141214',
    '1513764178752573581'
  ];

  for (const id of readOnlyIds) {
    const channel = await fetchChannel(guild, id);
    if (!channel?.permissionOverwrites) continue;
    await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: false,
      SendMessagesInThreads: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false,
      AddReactions: false
    }).catch(() => {});
  }

  const staffCategory = await fetchChannel(guild, '1546650070202720337');
  const archiveCategory = await fetchChannel(guild, '1546655484000477335');
  const roles = await guild.roles.fetch();
  const staffRoles = roles.filter((role) => STAFF_NAMES.has(normalize(role.name)));

  for (const category of [staffCategory, archiveCategory]) {
    if (!category?.permissionOverwrites) continue;
    await category.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }).catch(() => {});
    for (const role of staffRoles.values()) {
      await category.permissionOverwrites.edit(role.id, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true
      }).catch(() => {});
    }
  }
}

async function clearBotMessages(channel) {
  const recent = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!recent) return;
  const botMessages = recent.filter((message) => message.author.id === client.user.id);
  for (const message of botMessages.values()) {
    await message.delete().catch(() => {});
  }
}

function channelMention(id) {
  return `<#${id}>`;
}

async function publishPanels(guild) {
  const welcome = await fetchChannel(guild, '1513764153201000591');
  const rules = await fetchChannel(guild, '1513764175510372513');
  const roles = await fetchChannel(guild, '1513764159186141214');
  const suggestions = await fetchChannel(guild, '1513764177863508048');
  const support = await fetchChannel(guild, '1513764178752573581');

  if (welcome?.isTextBased()) {
    await clearBotMessages(welcome);
    const embed = new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({ name: 'Pale Ascendancy • Comunidade Criativa', iconURL: guild.iconURL({ size: 128 }) || client.user.displayAvatarURL() })
      .setTitle('✨ Bem-vindo à Pale Ascendancy')
      .setDescription(
        'Uma comunidade para **editores, designers e criadores** compartilharem recursos, trabalhos e conhecimento.\n\n' +
        `📜 Leia ${channelMention('1513764175510372513')}\n` +
        `🎭 Veja ${channelMention('1513764159186141214')}\n` +
        `💬 Converse em ${channelMention('1513764165033132094')}\n` +
        `📥 Explore ${channelMention('1546650121721221160')}\n` +
        `💡 Envie ideias em ${channelMention('1513764177863508048')}\n` +
        `🎫 Precisa de ajuda? ${channelMention('1513764178752573581')}`
      )
      .setFooter({ text: 'Criar • compartilhar • evoluir • Pale Ascendancy' });
    await welcome.send({ embeds: [embed] });
  }

  if (rules?.isTextBased()) {
    await clearBotMessages(rules);
    const header = new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({ name: 'Pale Ascendancy • Diretrizes Oficiais' })
      .setTitle('📜 Código da Comunidade')
      .setDescription('Regras curtas para manter a comunidade organizada, segura e útil para todos.');

    const conduct = new EmbedBuilder()
      .setColor(0x2b2f3a)
      .setTitle('01 · CONVIVÊNCIA')
      .setDescription(
        '`01` **Respeito acima de tudo** — sem ataques, assédio, discriminação ou perseguição.\n\n' +
        '`02` **Sem spam ou flood** — evite mensagens repetidas, correntes e menções em massa.\n\n' +
        '`03` **Use os canais corretamente** — cada área existe para um tipo de conteúdo.'
      );

    const content = new EmbedBuilder()
      .setColor(0x2b2f3a)
      .setTitle('02 · CONTEÚDO & RECURSOS')
      .setDescription(
        '`04` **Créditos e autoria** — não se aproprie do trabalho de outras pessoas.\n\n' +
        '`05` **Downloads e recursos** — compartilhe apenas materiais permitidos e confiáveis.\n\n' +
        '`06` **Divulgação e parcerias** — alinhe com a equipe antes de promover projetos ou servidores.'
      );

    const supportPanel = new EmbedBuilder()
      .setColor(0x2b2f3a)
      .setTitle('03 · SUPORTE & MODERAÇÃO')
      .setDescription(
        '`07` **Problemas e denúncias** — use a central de atendimento em ' + channelMention('1513764178752573581') + '.\n\n' +
        '`08` **Decisões da equipe** — contestações devem ser tratadas com respeito e por atendimento privado.'
      )
      .setFooter({ text: 'Ao participar da Pale Ascendancy, você concorda com estas diretrizes.' });

    await rules.send({ embeds: [header, conduct, content, supportPanel] });
  }

  if (roles?.isTextBased()) {
    await clearBotMessages(roles);
    const embed = new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({ name: 'Pale Ascendancy • Identidade' })
      .setTitle('🎭 Cargos da comunidade')
      .setDescription(
        '**Equipe**\n' +
        '🧩 Desenvolvedor • 🛡️ Administrador • ⚔️ Moderador • 🎫 Suporte\n\n' +
        '**Criadores**\n' +
        '🎬 Editor de Elite • 🎨 Editor\n\n' +
        '**Ferramentas**\n' +
        'CapCut • After Effects • Premiere Pro • Alight Motion • DaVinci Resolve • Photoshop\n\n' +
        '**Comunidade**\n' +
        '⚜️ Membro • 💎 Double Booster\n\n' +
        'Os cargos estão sendo padronizados para uma hierarquia mais limpa e profissional.'
      )
      .setFooter({ text: 'Pale Ascendancy • Sistema de cargos' });
    await roles.send({ embeds: [embed] });
  }

  if (suggestions?.isTextBased()) {
    await clearBotMessages(suggestions);
    await suggestions.setTopic('Envie ideias para melhorar a Pale Ascendancy • comunidade, recursos, bots e organização').catch(() => {});
    await suggestions.permissionOverwrites.edit(guild.roles.everyone.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      AddReactions: true
    }).catch(() => {});

    const embed = new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({ name: 'Pale Ascendancy • Comunidade' })
      .setTitle('💡 Sugestões')
      .setDescription(
        'Use este canal para sugerir melhorias em **canais, recursos, organização, eventos, bots ou experiência da comunidade**.\n\n' +
        'Explique sua ideia de forma objetiva e, quando possível, diga qual problema ela resolve.'
      )
      .setFooter({ text: 'Boas ideias ajudam a comunidade a evoluir.' });
    await suggestions.send({ embeds: [embed] });
  }

  if (support?.isTextBased()) {
    await clearBotMessages(support);
    const embed = new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({ name: 'Pale Ascendancy • Atendimento' })
      .setTitle('🎫 Central de Suporte')
      .setDescription(
        'Abra um atendimento privado para falar com a equipe.\n\n' +
        '🛟 Suporte geral\n🤝 Parcerias e projetos\n🚨 Denúncias\n📨 Equipe e candidaturas\n💬 Outros assuntos'
      )
      .setFooter({ text: 'Seu ticket será visível apenas para você e para a equipe.' });

    const button = new ButtonBuilder()
      .setCustomId('pa_ticket_open')
      .setLabel('Abrir atendimento')
      .setEmoji('🎫')
      .setStyle(ButtonStyle.Primary);

    await support.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
  }
}

client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(PALE_GUILD_ID).catch(() => null);
    if (!guild) {
      console.log('[PA-SETUP] Pale Ascendancy não encontrada.');
      return;
    }

    await deleteMangaMorphArtifacts(guild);
    await renameAndMoveChannels(guild);
    await cleanRoles(guild);
    await setInfoPermissions(guild);
    await publishPanels(guild);

    console.log('[PA-SETUP] Estrutura da Pale Ascendancy organizada com sucesso.');
  } catch (error) {
    console.error('[PA-SETUP] Falha:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
