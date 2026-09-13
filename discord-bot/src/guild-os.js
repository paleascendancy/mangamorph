import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';
import { PALE_GUILD_ID, setupPaleWelcome } from './pale.js';
import { setupPaleCommunity } from './pale-community.js';

const STATE_TOPIC = 'GUILDOS_STATE_V1';
const SNAPSHOT_MARKER = 'GUILDOS_SNAPSHOT_V1';
const incidentModes = new Map();

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

function kindOf(guild) {
  if (!guild) return null;
  if (guild.id === PALE_GUILD_ID) return 'pale';
  if (normalize(guild.name) === 'mangamorph') return 'mangamorph';
  return null;
}

function canManage(interaction) {
  return interaction.guild?.ownerId === interaction.user.id ||
    Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) ||
    Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));
}

async function defer(interaction) {
  if (!interaction.deferred && !interaction.replied) await interaction.deferReply({ ephemeral: true });
}

async function answer(interaction, payload) {
  const finalPayload = { allowedMentions: { parse: [] }, ...payload };
  if (interaction.deferred && !interaction.replied) {
    const { ephemeral, ...editable } = finalPayload;
    return interaction.editReply(editable);
  }
  if (interaction.replied) return interaction.followUp({ ...finalPayload, ephemeral: true });
  return interaction.reply({ ...finalPayload, ephemeral: true });
}

const COMMANDS = [
  { name: 'central', description: 'Abre o centro de controle inteligente do servidor' },
  { name: 'diagnostico', description: 'Analisa configuração, segurança e integridade do servidor' },
  {
    name: 'permissoes',
    description: 'Simula permissões efetivas de um membro',
    options: [{
      type: 1,
      name: 'usuario',
      description: 'Analisa um membro em um canal',
      options: [
        { type: 6, name: 'membro', description: 'Membro para analisar', required: true },
        { type: 7, name: 'canal', description: 'Canal; padrão: canal atual', required: false }
      ]
    }]
  },
  {
    name: 'staff',
    description: 'Resumo operacional da equipe',
    options: [{ type: 1, name: 'hoje', description: 'Mostra as pendências operacionais atuais' }]
  },
  { name: 'radar', description: 'Mostra sinais de crescimento e saúde da comunidade' },
  {
    name: 'arquiteto',
    description: 'Analisa a arquitetura do servidor sem alterar nada',
    options: [{ type: 1, name: 'analisar', description: 'Gera um relatório estrutural' }]
  },
  {
    name: 'snapshot',
    description: 'Time Machine da estrutura do servidor',
    options: [
      { type: 1, name: 'criar', description: 'Salva um snapshot estrutural' },
      { type: 1, name: 'comparar', description: 'Compara com o último snapshot' }
    ]
  },
  {
    name: 'incidente',
    description: 'Modo de segurança para incidentes e manutenção',
    options: [
      { type: 1, name: 'status', description: 'Mostra o estado atual' },
      { type: 1, name: 'ativar', description: 'Bloqueia interações não administrativas' },
      { type: 1, name: 'desativar', description: 'Retoma o funcionamento normal' }
    ]
  }
];

function commandSignature(command) {
  const json = typeof command.toJSON === 'function' ? command.toJSON() : command;
  return JSON.stringify({ name: json.name, description: json.description, options: json.options || [] });
}

async function reconcileCommands(guild) {
  const current = await guild.commands.fetch();
  let writes = 0;
  for (const wanted of COMMANDS) {
    const found = current.find((command) => command.name === wanted.name) || null;
    if (!found) {
      await guild.commands.create(wanted);
      writes += 1;
    } else if (commandSignature(found) !== commandSignature(wanted)) {
      await guild.commands.edit(found.id, wanted);
      writes += 1;
    }
  }
  return writes;
}

async function findStateChannel(guild) {
  const channels = await guild.channels.fetch();
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildText &&
    (channel.topic?.startsWith(STATE_TOPIC) || normalize(channel.name) === 'guildosstate')
  ) || null;
}

async function ensureStateChannel(guild) {
  const existing = await findStateChannel(guild);
  if (existing) return existing;
  return guild.channels.create({
    name: '🔒・guildos-state',
    type: ChannelType.GuildText,
    topic: `${STATE_TOPIC}|INCIDENT:off`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: guild.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ],
    reason: 'Armazenamento privado do GuildOS'
  });
}

async function setIncident(guild, enabled) {
  const channel = await ensureStateChannel(guild);
  await channel.setTopic(`${STATE_TOPIC}|INCIDENT:${enabled ? 'on' : 'off'}`, 'Alterar modo incidente do GuildOS');
  incidentModes.set(guild.id, enabled);
}

function essentialResources(kind) {
  if (kind === 'pale') {
    return [
      ['boasvindas', '👋・boas-vindas'],
      ['diretrizes', '📜・diretrizes'],
      ['cargos', '🎭・cargos'],
      ['sobreacomunidade', '🌐・sobre-a-comunidade'],
      ['sugestoes', '💡・sugestões'],
      ['geral', '💬・geral'],
      ['solicitarservico', '🧾・solicitar-serviço']
    ];
  }
  return [
    ['regras', '📜・regras'],
    ['candidaturas', '📨・candidaturas'],
    ['abrirticket', '🎫・abrir-ticket']
  ];
}

function byNormalizedName(channels, names) {
  const wanted = new Set(names.map(normalize));
  return channels.find((channel) => wanted.has(normalize(channel.name))) || null;
}

async function scan(guild) {
  const [channels, roles, commands] = await Promise.all([
    guild.channels.fetch(),
    guild.roles.fetch(),
    guild.commands.fetch().catch(() => null)
  ]);
  const kind = kindOf(guild);
  const findings = [];

  const names = new Map();
  for (const channel of channels.values()) {
    const key = normalize(channel.name);
    if (!key) continue;
    const list = names.get(key) || [];
    list.push(channel.id);
    names.set(key, list);
  }
  for (const [name, ids] of names) {
    if (ids.length > 1) findings.push({ level: 'medio', text: `Nome de canal duplicado: **${name}** (${ids.length}).` });
  }

  for (const [key, display] of essentialResources(kind)) {
    if (!byNormalizedName(channels, [key, display])) findings.push({ level: 'alto', text: `Recurso essencial ausente: **${display}**.` });
  }

  const everyone = roles.get(guild.id);
  if (everyone?.permissions.has(PermissionFlagsBits.Administrator)) findings.push({ level: 'critico', text: '`@everyone` possui **Administrador**.' });
  if (everyone?.permissions.has(PermissionFlagsBits.ManageGuild) || everyone?.permissions.has(PermissionFlagsBits.ManageRoles)) {
    findings.push({ level: 'alto', text: '`@everyone` possui permissão administrativa ampla.' });
  }

  const adminRoles = roles.filter((role) => role.id !== guild.id && !role.managed && role.permissions.has(PermissionFlagsBits.Administrator));
  if (adminRoles.size > 4) findings.push({ level: 'medio', text: `${adminRoles.size} cargos possuem **Administrador**.` });

  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!me) findings.push({ level: 'alto', text: 'Não foi possível calcular as permissões do bot.' });
  else {
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) findings.push({ level: 'alto', text: 'Bot sem **Gerenciar Canais** no servidor.' });
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) findings.push({ level: 'alto', text: 'Bot sem **Gerenciar Cargos** no servidor.' });
  }

  const categories = channels.filter((channel) => channel.type === ChannelType.GuildCategory);
  for (const category of categories.values()) {
    if (!channels.some((channel) => channel.parentId === category.id)) findings.push({ level: 'baixo', text: `Categoria vazia: **${category.name}**.` });
  }

  return { kind, channels, roles, commands, findings, adminRoles };
}

function icon(level) {
  if (level === 'critico') return '🔴';
  if (level === 'alto') return '🟠';
  if (level === 'medio') return '🟡';
  return '🟢';
}

function centralComponents(manager) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('guildos:diag').setLabel('Diagnóstico').setEmoji('🩺').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('guildos:radar').setLabel('Radar').setEmoji('📡').setStyle(ButtonStyle.Secondary)
  );
  if (manager) {
    row.addComponents(
      new ButtonBuilder().setCustomId('guildos:staff').setLabel('Staff').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('guildos:arch').setLabel('Arquiteto').setEmoji('🏗️').setStyle(ButtonStyle.Secondary)
    );
  }
  return [row];
}

async function central(interaction) {
  const health = await scan(interaction.guild);
  const manager = canManage(interaction);
  const important = health.findings.filter((item) => item.level === 'critico' || item.level === 'alto').length;
  const incident = incidentModes.get(interaction.guildId) === true;
  return {
    embeds: [new EmbedBuilder()
      .setColor(incident ? 0xed4245 : important ? 0xf0b232 : 0x5865f2)
      .setAuthor({ name: `${interaction.guild.name} • GuildOS`, iconURL: interaction.guild.iconURL({ size: 128 }) || undefined })
      .setTitle(manager ? '🧠 Central operacional' : '✨ Central da comunidade')
      .setDescription(manager
        ? 'Controle, diagnóstico e inteligência operacional em um único painel.'
        : 'Informações úteis da comunidade em um único lugar.')
      .addFields(
        { name: 'Sistema', value: incident ? '🔴 Modo incidente' : '🟢 Operacional', inline: true },
        { name: 'Membros', value: String(interaction.guild.memberCount), inline: true },
        { name: 'Alertas importantes', value: manager ? String(important) : '—', inline: true }
      )
      .setFooter({ text: 'GuildOS • nenhuma ação sensível acontece sem comando explícito' })
      .setTimestamp()],
    components: centralComponents(manager)
  };
}

async function diagnostic(guild, allowRecovery) {
  const health = await scan(guild);
  const priority = ['critico', 'alto', 'medio', 'baixo'];
  const findings = [...health.findings].sort((a, b) => priority.indexOf(a.level) - priority.indexOf(b.level));
  const embed = new EmbedBuilder()
    .setColor(findings.some((x) => x.level === 'critico') ? 0xed4245 : findings.some((x) => x.level === 'alto') ? 0xf0b232 : 0x57f287)
    .setTitle('🩺 Diagnóstico do servidor')
    .setDescription(findings.length ? findings.slice(0, 15).map((item) => `${icon(item.level)} ${item.text}`).join('\n') : '✅ Nenhum problema estrutural relevante foi encontrado.')
    .addFields(
      { name: 'Canais', value: String(health.channels.size), inline: true },
      { name: 'Cargos', value: String(Math.max(0, health.roles.size - 1)), inline: true },
      { name: 'Comandos', value: health.commands ? String(health.commands.size) : 'N/D', inline: true }
    )
    .setFooter({ text: 'O diagnóstico é somente leitura.' })
    .setTimestamp();

  const components = [];
  if (allowRecovery && health.kind === 'pale') {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('guildos:recover:pale').setLabel('Reconciliar painéis seguros').setEmoji('🛠️').setStyle(ButtonStyle.Secondary)
    ));
  }
  return { embeds: [embed], components };
}

async function permissions(interaction) {
  const user = interaction.options.getUser('membro', true);
  const channel = interaction.options.getChannel('canal', false) || interaction.channel;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return { content: 'Não consegui localizar esse membro no servidor.' };
  const effective = channel?.permissionsFor?.(member);
  if (!effective) return { content: 'Não foi possível calcular as permissões nesse canal.' };

  const checks = [
    ['Ver canal', PermissionFlagsBits.ViewChannel],
    ['Enviar mensagens', PermissionFlagsBits.SendMessages],
    ['Ler histórico', PermissionFlagsBits.ReadMessageHistory],
    ['Gerenciar mensagens', PermissionFlagsBits.ManageMessages],
    ['Gerenciar canais', PermissionFlagsBits.ManageChannels],
    ['Gerenciar cargos', PermissionFlagsBits.ManageRoles],
    ['Gerenciar servidor', PermissionFlagsBits.ManageGuild],
    ['Administrador', PermissionFlagsBits.Administrator]
  ];
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🔐 Simulador de permissões')
      .setDescription(`**Membro:** ${user}\n**Canal:** ${channel}\n\n${checks.map(([label, bit]) => `${effective.has(bit) ? '✅' : '❌'} ${label}`).join('\n')}`)
      .setFooter({ text: 'Permissões efetivas calculadas para o canal selecionado.' })]
  };
}

async function staff(guild) {
  const channels = await guild.channels.fetch();
  let tickets = 0;
  let services = 0;
  let closed = 0;
  let recruitments = 0;
  for (const channel of channels.values()) {
    if (channel.type !== ChannelType.GuildText) continue;
    const topic = channel.topic || '';
    if (/^(PA_TICKET:|MM_TICKET:)/.test(topic)) tickets += 1;
    if (topic.startsWith('PA_PRO_SERVICE:')) {
      if (/STATUS:closed/i.test(topic)) closed += 1;
      else services += 1;
    }
    if (/^(PA_RECRUIT|MM_APPLICATION)/.test(topic)) recruitments += 1;
  }
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🛡️ Staff Copilot • agora')
      .setDescription('Pendências calculadas a partir do estado atual dos canais.')
      .addFields(
        { name: 'Tickets abertos', value: String(tickets), inline: true },
        { name: 'Serviços em andamento', value: kindOf(guild) === 'pale' ? String(services) : '—', inline: true },
        { name: 'Candidaturas', value: String(recruitments), inline: true },
        { name: 'Serviços fechados detectados', value: kindOf(guild) === 'pale' ? String(closed) : '—', inline: true }
      )
      .setFooter({ text: 'GuildOS • resumo operacional' })
      .setTimestamp()]
  };
}

async function radar(guild) {
  const members = await guild.members.fetch().catch(() => guild.members.cache);
  const now = Date.now();
  const humans = members.filter((member) => !member.user.bot);
  const bots = members.filter((member) => member.user.bot);
  const joined7 = humans.filter((member) => member.joinedTimestamp && now - member.joinedTimestamp <= 7 * 86400000).size;
  const joined30 = humans.filter((member) => member.joinedTimestamp && now - member.joinedTimestamp <= 30 * 86400000).size;
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('📡 Community Radar')
      .setDescription('Indicadores disponíveis sem ler o conteúdo das conversas dos membros.')
      .addFields(
        { name: 'Pessoas', value: String(humans.size), inline: true },
        { name: 'Bots', value: String(bots.size), inline: true },
        { name: 'Entraram em 7 dias', value: String(joined7), inline: true },
        { name: 'Entraram em 30 dias', value: String(joined30), inline: true },
        { name: 'Boosts', value: String(guild.premiumSubscriptionCount || 0), inline: true },
        { name: 'Nível de boost', value: String(guild.premiumTier || 0), inline: true }
      )
      .setFooter({ text: 'Retenção real exige histórico; o bot não inventa esse indicador.' })
      .setTimestamp()]
  };
}

async function architect(guild) {
  const health = await scan(guild);
  const categories = health.channels.filter((channel) => channel.type === ChannelType.GuildCategory);
  const uncategorized = health.channels.filter((channel) =>
    channel.type !== ChannelType.GuildCategory && channel.parentId === null && !channel.topic?.startsWith(STATE_TOPIC)
  );
  const largest = [...categories.values()]
    .map((category) => ({ name: category.name, count: health.channels.filter((channel) => channel.parentId === category.id).size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const notes = [];
  if (uncategorized.size > 3) notes.push(`• ${uncategorized.size} canais estão fora de categorias; confirme se isso é intencional.`);
  if (health.adminRoles.size > 2) notes.push(`• ${health.adminRoles.size} cargos têm Administrador; reduza privilégios quando possível.`);
  if (health.findings.some((item) => item.text.includes('duplicado'))) notes.push('• Há nomes de canais duplicados; isso prejudica navegação e automações por nome.');
  if (!notes.length) notes.push('• Nenhum gargalo estrutural óbvio foi encontrado nesta leitura.');

  return {
    embeds: [new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🏗️ Modo Arquiteto')
      .setDescription(notes.join('\n'))
      .addFields(
        { name: 'Categorias', value: String(categories.size), inline: true },
        { name: 'Sem categoria', value: String(uncategorized.size), inline: true },
        { name: 'Cargos com Administrador', value: String(health.adminRoles.size), inline: true },
        { name: 'Maiores categorias', value: largest.length ? largest.map((item) => `• ${item.name}: ${item.count}`).join('\n') : 'Nenhuma' }
      )
      .setFooter({ text: 'Somente leitura • nenhuma alteração aplicada' })
      .setTimestamp()]
  };
}

function channelSnapshot(channel) {
  const overwrites = channel.permissionOverwrites?.cache
    ? [...channel.permissionOverwrites.cache.values()]
        .map((item) => ({ id: item.id, type: item.type, allow: item.allow.bitfield.toString(), deny: item.deny.bitfield.toString() }))
        .sort((a, b) => a.id.localeCompare(b.id))
    : [];
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId || null,
    position: channel.rawPosition ?? channel.position ?? 0,
    topic: 'topic' in channel ? channel.topic || null : null,
    overwrites
  };
}

function roleSnapshot(role) {
  return {
    id: role.id,
    name: role.name,
    color: role.color,
    position: role.position,
    permissions: role.permissions.bitfield.toString(),
    managed: role.managed,
    hoist: role.hoist,
    mentionable: role.mentionable
  };
}

async function buildSnapshot(guild) {
  const [channels, roles] = await Promise.all([guild.channels.fetch(), guild.roles.fetch()]);
  return {
    schema: 1,
    guildId: guild.id,
    guildName: guild.name,
    createdAt: new Date().toISOString(),
    channels: [...channels.values()].filter((channel) => !channel.topic?.startsWith(STATE_TOPIC)).map(channelSnapshot),
    roles: [...roles.values()].map(roleSnapshot)
  };
}

async function saveSnapshot(guild) {
  const channel = await ensureStateChannel(guild);
  const snapshot = await buildSnapshot(guild);
  const message = await channel.send({
    content: `${SNAPSHOT_MARKER} ${snapshot.createdAt}`,
    files: [{ attachment: Buffer.from(JSON.stringify(snapshot, null, 2)), name: `guildos-${guild.id}-${Date.now()}.json` }],
    allowedMentions: { parse: [] }
  });
  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const snapshots = recent ? [...recent.filter((item) => item.content.startsWith(SNAPSHOT_MARKER)).values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp) : [];
  for (const old of snapshots.slice(5)) await old.delete().catch(() => {});
  return message;
}

async function latestSnapshot(guild) {
  const channel = await findStateChannel(guild);
  if (!channel) return null;
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!recent) return null;
  const message = [...recent.filter((item) => item.content.startsWith(SNAPSHOT_MARKER)).values()].sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0];
  const attachment = message?.attachments.first();
  if (!attachment) return null;
  try {
    const response = await fetch(attachment.url, { signal: AbortSignal.timeout(8000) });
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

async function snapshotDiff(guild, old) {
  const current = await buildSnapshot(guild);
  const diffs = [];
  const oldChannels = new Map(old.channels.map((item) => [item.id, item]));
  const newChannels = new Map(current.channels.map((item) => [item.id, item]));
  for (const [id, before] of oldChannels) {
    const after = newChannels.get(id);
    if (!after) { diffs.push(`➖ Canal removido: **${before.name}**`); continue; }
    if (before.name !== after.name) diffs.push(`✏️ Canal: **${before.name}** → **${after.name}**`);
    if ((before.parentId || null) !== (after.parentId || null)) diffs.push(`📁 Categoria alterada: **${after.name}**`);
    if ((before.topic || null) !== (after.topic || null)) diffs.push(`📝 Tópico alterado: **${after.name}**`);
    if (JSON.stringify(before.overwrites || []) !== JSON.stringify(after.overwrites || [])) diffs.push(`🔐 Permissões alteradas: **${after.name}**`);
  }
  for (const [id, after] of newChannels) if (!oldChannels.has(id)) diffs.push(`➕ Canal novo: **${after.name}**`);

  const oldRoles = new Map(old.roles.map((item) => [item.id, item]));
  const newRoles = new Map(current.roles.map((item) => [item.id, item]));
  for (const [id, before] of oldRoles) {
    const after = newRoles.get(id);
    if (!after) { diffs.push(`➖ Cargo removido: **${before.name}**`); continue; }
    if (before.name !== after.name) diffs.push(`✏️ Cargo: **${before.name}** → **${after.name}**`);
    if (before.permissions !== after.permissions) diffs.push(`🛡️ Permissões do cargo alteradas: **${after.name}**`);
  }
  for (const [id, after] of newRoles) if (!oldRoles.has(id)) diffs.push(`➕ Cargo novo: **${after.name}**`);
  return diffs;
}

async function snapshotCreate(guild) {
  const message = await saveSnapshot(guild);
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🕒 Time Machine • snapshot criado')
      .setDescription('Canais, cargos e permissões foram registrados no armazenamento privado do GuildOS.')
      .setFooter({ text: `Snapshot ${message.id} • mantemos os 5 mais recentes` })]
  };
}

async function snapshotCompare(guild) {
  const old = await latestSnapshot(guild);
  if (!old) return { content: 'Ainda não existe snapshot. Use `/snapshot criar` primeiro.' };
  const diffs = await snapshotDiff(guild, old);
  const embed = new EmbedBuilder()
    .setColor(diffs.length ? 0xf0b232 : 0x57f287)
    .setTitle('🕒 Time Machine • comparação')
    .setDescription(diffs.length ? diffs.slice(0, 20).join('\n') : '✅ Nenhuma diferença estrutural foi detectada desde o último snapshot.')
    .setFooter({ text: `Base: ${new Date(old.createdAt).toLocaleString('pt-BR')} • somente leitura` });
  if (diffs.length > 20) embed.addFields({ name: 'Outras mudanças', value: `+${diffs.length - 20} alterações.` });
  return { embeds: [embed] };
}

async function recoverPale(interaction) {
  if (!canManage(interaction)) return answer(interaction, { content: 'Você precisa de **Gerenciar Servidor** para reconciliar recursos.' });
  await defer(interaction);
  const results = [];
  await setupPaleWelcome(interaction.guild)
    .then(() => results.push('✅ Boas-vindas'))
    .catch((error) => results.push(`❌ Boas-vindas: ${error.message}`));
  await setupPaleCommunity(interaction.guild)
    .then(() => results.push('✅ Comunidade, cargos e sugestões'))
    .catch((error) => results.push(`❌ Comunidade: ${error.message}`));
  return answer(interaction, {
    embeds: [new EmbedBuilder()
      .setColor(results.some((item) => item.startsWith('❌')) ? 0xf0b232 : 0x57f287)
      .setTitle('🛠️ Auto-Recovery seguro')
      .setDescription(results.join('\n'))
      .setFooter({ text: 'Não apaga canais, cargos nem históricos.' })]
  });
}

async function handleGuildOSButton(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('guildos:')) return false;
  const action = interaction.customId.split(':')[1];
  if (['diag', 'staff', 'arch', 'recover'].includes(action) && !canManage(interaction)) {
    await answer(interaction, { content: 'Essa área é restrita à administração.' });
    return true;
  }
  if (action === 'recover' && interaction.customId === 'guildos:recover:pale') {
    await recoverPale(interaction);
    return true;
  }
  await defer(interaction);
  if (action === 'diag') await answer(interaction, await diagnostic(interaction.guild, true));
  else if (action === 'radar') await answer(interaction, await radar(interaction.guild));
  else if (action === 'staff') await answer(interaction, await staff(interaction.guild));
  else if (action === 'arch') await answer(interaction, await architect(interaction.guild));
  else return false;
  return true;
}

function blockedByIncident(interaction) {
  if (!incidentModes.get(interaction.guildId) || canManage(interaction)) return false;
  if (interaction.isChatInputCommand() && ['central', 'incidente'].includes(interaction.commandName)) return false;
  return interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit() || interaction.isChatInputCommand();
}

export async function setupGuildOS(guild) {
  if (!kindOf(guild)) return false;
  const state = await findStateChannel(guild).catch(() => null);
  incidentModes.set(guild.id, Boolean(state?.topic && /INCIDENT:on/i.test(state.topic)));
  const writes = await reconcileCommands(guild);
  console.log(`[GUILDOS] ${guild.name}: pronto • commandWrites=${writes} • incident=${incidentModes.get(guild.id) ? 'on' : 'off'}.`);
  return true;
}

export async function handleGuildOSInteraction(interaction) {
  if (!interaction.inGuild() || !kindOf(interaction.guild)) return false;

  if (blockedByIncident(interaction)) {
    await answer(interaction, { content: '🔒 **Modo incidente ativo.** Interações não administrativas estão temporariamente bloqueadas enquanto a staff verifica o servidor.' });
    return true;
  }

  if (await handleGuildOSButton(interaction)) return true;
  if (!interaction.isChatInputCommand()) return false;

  const adminCommands = new Set(['diagnostico', 'permissoes', 'staff', 'arquiteto', 'snapshot', 'incidente']);
  if (adminCommands.has(interaction.commandName) && !canManage(interaction)) {
    await answer(interaction, { content: 'Você precisa de **Gerenciar Servidor** para usar esse comando.' });
    return true;
  }

  if (interaction.commandName === 'central') {
    await defer(interaction);
    await answer(interaction, await central(interaction));
    return true;
  }
  if (interaction.commandName === 'diagnostico') {
    await defer(interaction);
    await answer(interaction, await diagnostic(interaction.guild, true));
    return true;
  }
  if (interaction.commandName === 'permissoes') {
    await defer(interaction);
    await answer(interaction, await permissions(interaction));
    return true;
  }
  if (interaction.commandName === 'staff') {
    await defer(interaction);
    await answer(interaction, await staff(interaction.guild));
    return true;
  }
  if (interaction.commandName === 'radar') {
    await defer(interaction);
    await answer(interaction, await radar(interaction.guild));
    return true;
  }
  if (interaction.commandName === 'arquiteto') {
    await defer(interaction);
    await answer(interaction, await architect(interaction.guild));
    return true;
  }
  if (interaction.commandName === 'snapshot') {
    await defer(interaction);
    const sub = interaction.options.getSubcommand();
    await answer(interaction, sub === 'criar' ? await snapshotCreate(interaction.guild) : await snapshotCompare(interaction.guild));
    return true;
  }
  if (interaction.commandName === 'incidente') {
    await defer(interaction);
    const sub = interaction.options.getSubcommand();
    if (sub === 'ativar') await setIncident(interaction.guild, true);
    if (sub === 'desativar') await setIncident(interaction.guild, false);
    const enabled = incidentModes.get(interaction.guildId) === true;
    await answer(interaction, {
      embeds: [new EmbedBuilder()
        .setColor(enabled ? 0xed4245 : 0x57f287)
        .setTitle('🚨 Modo Incidente')
        .setDescription(enabled ? '🔒 **ATIVO** — interações não administrativas do bot estão bloqueadas.' : '🟢 **DESATIVADO** — funcionamento normal.')]
    });
    return true;
  }

  return false;
}
