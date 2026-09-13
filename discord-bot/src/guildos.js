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

const GUILDOS_STATE_TOPIC = 'GUILDOS_STATE_V1';
const GUILDOS_SNAPSHOT_MARKER = 'GUILDOS_SNAPSHOT_V1';
const incidentModes = new Map();

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

function guildKind(guild) {
  if (!guild) return null;
  if (guild.id === PALE_GUILD_ID) return 'pale';
  if (normalize(guild.name) === 'mangamorph') return 'mangamorph';
  return null;
}

function isManager(interaction) {
  return interaction.guild?.ownerId === interaction.user.id ||
    Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) ||
    Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));
}

async function respond(interaction, payload) {
  const finalPayload = { allowedMentions: { parse: [] }, ...payload };
  if (interaction.replied || interaction.deferred) return interaction.followUp(finalPayload);
  return interaction.reply(finalPayload);
}

function compactCommand(command) {
  const json = typeof command.toJSON === 'function' ? command.toJSON() : command;
  return JSON.stringify({
    name: json.name,
    description: json.description,
    options: json.options || []
  });
}

const COMMANDS = [
  { name: 'central', description: 'Abre o centro de controle inteligente do servidor' },
  { name: 'diagnostico', description: 'Analisa configuração, segurança e integridade do servidor' },
  {
    name: 'permissoes',
    description: 'Simula as permissões efetivas de um membro',
    options: [{
      type: 1,
      name: 'usuario',
      description: 'Analisa as permissões efetivas de um usuário',
      options: [
        { type: 6, name: 'membro', description: 'Membro para analisar', required: true },
        { type: 7, name: 'canal', description: 'Canal para simular; padrão: canal atual', required: false }
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
    options: [{ type: 1, name: 'analisar', description: 'Gera um relatório estrutural do servidor' }]
  },
  {
    name: 'snapshot',
    description: 'Time Machine do servidor',
    options: [
      { type: 1, name: 'criar', description: 'Salva um snapshot da estrutura atual' },
      { type: 1, name: 'comparar', description: 'Compara o servidor com o último snapshot' }
    ]
  },
  {
    name: 'incidente',
    description: 'Modo de segurança para incidentes e manutenção',
    options: [
      { type: 1, name: 'status', description: 'Mostra o estado do modo incidente' },
      { type: 1, name: 'ativar', description: 'Bloqueia interações não administrativas do bot' },
      { type: 1, name: 'desativar', description: 'Retoma as interações normais do bot' }
    ]
  }
];

async function reconcileCommands(guild) {
  const existing = await guild.commands.fetch();
  let writes = 0;
  for (const desired of COMMANDS) {
    const current = existing.find((item) => item.name === desired.name) || null;
    if (!current) {
      await guild.commands.create(desired);
      writes += 1;
      continue;
    }
    if (compactCommand(current) !== compactCommand(desired)) {
      await guild.commands.edit(current.id, desired);
      writes += 1;
    }
  }
  return writes;
}

async function findStateChannel(guild) {
  const channels = await guild.channels.fetch();
  return channels.find((channel) =>
    channel?.type === ChannelType.GuildText &&
    (channel.topic?.startsWith(GUILDOS_STATE_TOPIC) || normalize(channel.name) === 'guildosstate')
  ) || null;
}

function incidentFromTopic(topic = '') {
  return /INCIDENT:on/i.test(topic);
}

async function ensureStateChannel(guild) {
  let channel = await findStateChannel(guild);
  if (channel) return channel;

  channel = await guild.channels.create({
    name: '🔒・guildos-state',
    type: ChannelType.GuildText,
    topic: `${GUILDOS_STATE_TOPIC}|INCIDENT:off`,
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
    reason: 'Estado interno do GuildOS'
  });
  return channel;
}

async function setIncidentMode(guild, enabled) {
  const channel = await ensureStateChannel(guild);
  await channel.setTopic(`${GUILDOS_STATE_TOPIC}|INCIDENT:${enabled ? 'on' : 'off'}`, 'GuildOS incident mode');
  incidentModes.set(guild.id, enabled);
}

function essentialNames(kind) {
  if (kind === 'pale') {
    return [
      ['boas-vindas', '👋・boas-vindas'],
      ['diretrizes', '📜・diretrizes'],
      ['cargos', '🎭・cargos'],
      ['sobre-a-comunidade', '🌐・sobre-a-comunidade'],
      ['sugestoes', '💡・sugestões'],
      ['geral', '💬・geral'],
      ['solicitar-servico', '🧾・solicitar-serviço']
    ];
  }
  return [
    ['regras', '📜・regras'],
    ['candidaturas', '📨・candidaturas'],
    ['abrir-ticket', '🎫・abrir-ticket']
  ];
}

function findByNormalized(channels, names) {
  const wanted = new Set(names.map((name) => normalize(name)));
  return channels.find((channel) => wanted.has(normalize(channel.name))) || null;
}

async function scanHealth(guild) {
  const kind = guildKind(guild);
  const [channels, roles, commands] = await Promise.all([
    guild.channels.fetch(),
    guild.roles.fetch(),
    guild.commands.fetch().catch(() => null)
  ]);
  const findings = [];

  const normalizedNames = new Map();
  for (const channel of channels.values()) {
    const key = normalize(channel.name);
    if (!key) continue;
    const list = normalizedNames.get(key) || [];
    list.push(channel);
    normalizedNames.set(key, list);
  }
  for (const [key, list] of normalizedNames.entries()) {
    if (list.length > 1) findings.push({ level: 'medio', text: `Nome de canal duplicado: **${key}** (${list.length} canais).` });
  }

  for (const [key, display] of essentialNames(kind)) {
    const found = findByNormalized(channels, [key, display]);
    if (!found) findings.push({ level: 'alto', text: `Recurso essencial ausente: **${display}**.` });
  }

  const everyone = roles.get(guild.id);
  if (everyone?.permissions?.has(PermissionFlagsBits.Administrator)) {
    findings.push({ level: 'critico', text: '`@everyone` possui **Administrador**.' });
  }
  if (everyone?.permissions?.has(PermissionFlagsBits.ManageGuild) || everyone?.permissions?.has(PermissionFlagsBits.ManageRoles)) {
    findings.push({ level: 'alto', text: '`@everyone` possui permissão administrativa ampla.' });
  }

  const adminRoles = roles.filter((role) =>
    role.id !== guild.id && !role.managed && role.permissions.has(PermissionFlagsBits.Administrator)
  );
  if (adminRoles.size > 4) findings.push({ level: 'medio', text: `${adminRoles.size} cargos possuem **Administrador**; revise o princípio do menor privilégio.` });

  const me = guild.members.me || await guild.members.fetchMe().catch(() => null);
  if (!me) findings.push({ level: 'alto', text: 'Não foi possível calcular as permissões do próprio bot.' });
  else {
    if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) findings.push({ level: 'alto', text: 'O bot não possui **Gerenciar Canais** no nível do servidor.' });
    if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) findings.push({ level: 'alto', text: 'O bot não possui **Gerenciar Cargos** no nível do servidor.' });
  }

  const categories = channels.filter((channel) => channel.type === ChannelType.GuildCategory);
  for (const category of categories.values()) {
    const children = channels.filter((channel) => channel.parentId === category.id);
    if (children.size === 0) findings.push({ level: 'baixo', text: `Categoria vazia: **${category.name}**.` });
  }

  return {
    kind,
    channels,
    roles,
    commands,
    findings,
    adminRoles
  };
}

function findingIcon(level) {
  return level === 'critico' ? '🔴' : level === 'alto' ? '🟠' : level === 'medio' ? '🟡' : '🟢';
}

function centralButtons(manager) {
  const first = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('guildos:diag').setLabel('Diagnóstico').setEmoji('🩺').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('guildos:radar').setLabel('Radar').setEmoji('📡').setStyle(ButtonStyle.Secondary)
  );
  if (manager) {
    first.addComponents(
      new ButtonBuilder().setCustomId('guildos:staff').setLabel('Staff').setEmoji('🛡️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('guildos:arch').setLabel('Arquiteto').setEmoji('🏗️').setStyle(ButtonStyle.Secondary)
    );
  }
  return [first];
}

async function centralPayload(interaction) {
  const guild = interaction.guild;
  const manager = isManager(interaction);
  const health = await scanHealth(guild);
  const high = health.findings.filter((item) => ['critico', 'alto'].includes(item.level)).length;
  const incident = incidentModes.get(guild.id) === true;

  const embed = new EmbedBuilder()
    .setColor(incident ? 0xed4245 : high ? 0xf0b232 : 0x5865f2)
    .setAuthor({ name: `${guild.name} • GuildOS`, iconURL: guild.iconURL({ size: 128 }) || undefined })
    .setTitle(manager ? '🧠 Central operacional' : '✨ Central da comunidade')
    .setDescription(manager
      ? 'Visão rápida do servidor. Os painéis abaixo são **somente leitura** até você escolher uma ação explícita.'
      : 'Acesse informações úteis da comunidade em um único lugar.')
    .addFields(
      { name: 'Sistema', value: incident ? '🔴 Modo incidente' : '🟢 Operacional', inline: true },
      { name: 'Membros', value: String(guild.memberCount), inline: true },
      { name: 'Alertas importantes', value: manager ? String(high) : '—', inline: true }
    )
    .setFooter({ text: 'GuildOS • controle, diagnóstico e recuperação' })
    .setTimestamp();

  return { embeds: [embed], components: centralButtons(manager), ephemeral: true };
}

async function diagnosticPayload(guild, allowRecovery = false) {
  const health = await scanHealth(guild);
  const ordered = [...health.findings].sort((a, b) =>
    ['critico', 'alto', 'medio', 'baixo'].indexOf(a.level) - ['critico', 'alto', 'medio', 'baixo'].indexOf(b.level)
  );
  const lines = ordered.slice(0, 15).map((item) => `${findingIcon(item.level)} ${item.text}`);

  const embed = new EmbedBuilder()
    .setColor(ordered.some((item) => item.level === 'critico') ? 0xed4245 : ordered.some((item) => item.level === 'alto') ? 0xf0b232 : 0x57f287)
    .setTitle('🩺 Diagnóstico do servidor')
    .setDescription(lines.length ? lines.join('\n') : '✅ Nenhum problema estrutural relevante foi encontrado na verificação atual.')
    .addFields(
      { name: 'Canais', value: String(health.channels.size), inline: true },
      { name: 'Cargos', value: String(Math.max(0, health.roles.size - 1)), inline: true },
      { name: 'Comandos da guild', value: health.commands ? String(health.commands.size) : 'N/D', inline: true }
    )
    .setFooter({ text: 'Nenhuma alteração é feita pelo diagnóstico.' })
    .setTimestamp();

  const components = [];
  if (allowRecovery && health.kind === 'pale') {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('guildos:recover:pale')
        .setLabel('Reconciliar painéis seguros')
        .setEmoji('🛠️')
        .setStyle(ButtonStyle.Secondary)
    ));
  }
  return { embeds: [embed], components, ephemeral: true };
}

async function permissionPayload(interaction) {
  const user = interaction.options.getUser('membro', true);
  const channel = interaction.options.getChannel('canal', false) || interaction.channel;
  const member = await interaction.guild.members.fetch(user.id).catch(() => null);
  if (!member) return { content: 'Não consegui localizar esse membro no servidor.', ephemeral: true };
  if (!channel || typeof channel.permissionsFor !== 'function') return { content: 'Escolha um canal válido para a simulação.', ephemeral: true };

  const permissions = channel.permissionsFor(member);
  if (!permissions) return { content: 'Não foi possível calcular as permissões nesse canal.', ephemeral: true };

  const checks = [
    ['Ver canal', PermissionFlagsBits.ViewChannel],
    ['Enviar mensagens', PermissionFlagsBits.SendMessages],
    ['Histórico', PermissionFlagsBits.ReadMessageHistory],
    ['Gerenciar mensagens', PermissionFlagsBits.ManageMessages],
    ['Gerenciar canais', PermissionFlagsBits.ManageChannels],
    ['Gerenciar cargos', PermissionFlagsBits.ManageRoles],
    ['Gerenciar servidor', PermissionFlagsBits.ManageGuild],
    ['Administrador', PermissionFlagsBits.Administrator]
  ];

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🔐 Simulador de permissões')
    .setDescription(`**Membro:** ${user}\n**Canal:** ${channel}\n\n${checks.map(([label, bit]) => `${permissions.has(bit) ? '✅' : '❌'} ${label}`).join('\n')}`)
    .setFooter({ text: 'Resultado efetivo calculado pelo Discord para este canal.' });
  return { embeds: [embed], ephemeral: true };
}

async function staffPayload(guild) {
  const channels = await guild.channels.fetch();
  const kind = guildKind(guild);
  let tickets = 0;
  let services = 0;
  let recruitments = 0;
  let closedServices = 0;

  for (const channel of channels.values()) {
    if (channel.type !== ChannelType.GuildText) continue;
    const topic = channel.topic || '';
    if (/^(PA_TICKET:|MM_TICKET:)/.test(topic)) tickets += 1;
    if (topic.startsWith('PA_PRO_SERVICE:')) {
      if (/STATUS:closed/i.test(topic)) closedServices += 1;
      else services += 1;
    }
    if (/^(PA_RECRUIT|MM_APPLICATION)/.test(topic)) recruitments += 1;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🛡️ Staff Copilot • agora')
    .setDescription('Resumo operacional calculado a partir dos canais e estados atuais do servidor.')
    .addFields(
      { name: 'Tickets abertos', value: String(tickets), inline: true },
      { name: 'Serviços em andamento', value: kind === 'pale' ? String(services) : '—', inline: true },
      { name: 'Recrutamentos/candidaturas', value: String(recruitments), inline: true },
      { name: 'Serviços arquivados detectados', value: kind === 'pale' ? String(closedServices) : '—', inline: true }
    )
    .setFooter({ text: 'GuildOS • resumo sem modificar o servidor' })
    .setTimestamp();
  return { embeds: [embed], ephemeral: true };
}

async function radarPayload(guild) {
  const members = await guild.members.fetch();
  const now = Date.now();
  const d7 = 7 * 24 * 60 * 60 * 1000;
  const d30 = 30 * 24 * 60 * 60 * 1000;
  const humans = members.filter((member) => !member.user.bot);
  const bots = members.filter((member) => member.user.bot);
  const joined7 = humans.filter((member) => member.joinedTimestamp && now - member.joinedTimestamp <= d7).size;
  const joined30 = humans.filter((member) => member.joinedTimestamp && now - member.joinedTimestamp <= d30).size;

  const embed = new EmbedBuilder()
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
    .setFooter({ text: 'Retenção real exige histórico longitudinal; este painel não inventa esse dado.' })
    .setTimestamp();
  return { embeds: [embed], ephemeral: true };
}

async function architectPayload(guild) {
  const { channels, roles, adminRoles, findings } = await scanHealth(guild);
  const categories = channels.filter((channel) => channel.type === ChannelType.GuildCategory);
  const uncategorized = channels.filter((channel) =>
    channel.type !== ChannelType.GuildCategory && channel.parentId === null && !channel.topic?.startsWith(GUILDOS_STATE_TOPIC)
  );
  const largest = [...categories.values()]
    .map((category) => ({ category, count: channels.filter((channel) => channel.parentId === category.id).size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const suggestions = [];
  if (uncategorized.size > 3) suggestions.push(`• ${uncategorized.size} canais estão fora de categorias; confirme se isso é intencional.`);
  if (adminRoles.size > 2) suggestions.push(`• Existem ${adminRoles.size} cargos com Administrador; considere reduzir privilégios.`);
  if (findings.some((item) => item.text.includes('duplicado'))) suggestions.push('• Há nomes de canais duplicados; padronize a navegação para reduzir confusão.');
  if (!suggestions.length) suggestions.push('• A estrutura atual não apresentou um gargalo óbvio nesta análise estática do servidor.');

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🏗️ Modo Arquiteto')
    .setDescription(suggestions.join('\n'))
    .addFields(
      { name: 'Categorias', value: String(categories.size), inline: true },
      { name: 'Canais sem categoria', value: String(uncategorized.size), inline: true },
      { name: 'Cargos administrativos', value: String(adminRoles.size), inline: true },
      {
        name: 'Maiores categorias',
        value: largest.length ? largest.map(({ category, count }) => `• ${category.name}: ${count}`).join('\n') : 'Nenhuma'
      }
    )
    .setFooter({ text: 'Análise somente leitura • nenhuma mudança aplicada' })
    .setTimestamp();
  return { embeds: [embed], ephemeral: true };
}

function snapshotChannel(channel) {
  return {
    id: channel.id,
    name: channel.name,
    type: channel.type,
    parentId: channel.parentId || null,
    position: channel.rawPosition ?? channel.position ?? 0,
    topic: 'topic' in channel ? channel.topic || null : null,
    overwrites: channel.permissionOverwrites?.cache
      ? [...channel.permissionOverwrites.cache.values()].map((overwrite) => ({
          id: overwrite.id,
          type: overwrite.type,
          allow: overwrite.allow.bitfield.toString(),
          deny: overwrite.deny.bitfield.toString()
        }))
      : []
  };
}

function snapshotRole(role) {
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
    channels: [...channels.values()]
      .filter((channel) => !channel.topic?.startsWith(GUILDOS_STATE_TOPIC))
      .map(snapshotChannel),
    roles: [...roles.values()].map(snapshotRole)
  };
}

async function saveSnapshot(guild) {
  const channel = await ensureStateChannel(guild);
  const snapshot = await buildSnapshot(guild);
  const message = await channel.send({
    content: `${GUILDOS_SNAPSHOT_MARKER} ${snapshot.createdAt}`,
    files: [{ attachment: Buffer.from(JSON.stringify(snapshot, null, 2), 'utf8'), name: `guildos-${guild.id}-${Date.now()}.json` }],
    allowedMentions: { parse: [] }
  });

  const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const snapshots = recent
    ? [...recent.filter((item) => item.content.startsWith(GUILDOS_SNAPSHOT_MARKER)).values()]
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
    : [];
  for (const old of snapshots.slice(5)) await old.delete().catch(() => {});
  return message;
}

async function loadLatestSnapshot(guild) {
  const channel = await findStateChannel(guild);
  if (!channel) return null;
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!recent) return null;
  const message = [...recent.filter((item) => item.content.startsWith(GUILDOS_SNAPSHOT_MARKER)).values()]
    .sort((a, b) => b.createdTimestamp - a.createdTimestamp)[0];
  const attachment = message?.attachments.first();
  if (!attachment) return null;
  try {
    const response = await fetch(attachment.url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function compareSnapshot(guild, snapshot) {
  const current = await buildSnapshot(guild);
  const diffs = [];
  const oldChannels = new Map(snapshot.channels.map((item) => [item.id, item]));
  const newChannels = new Map(current.channels.map((item) => [item.id, item]));
  for (const [id, old] of oldChannels) {
    const now = newChannels.get(id);
    if (!now) { diffs.push(`➖ Canal removido: **${old.name}**`); continue; }
    if (old.name !== now.name) diffs.push(`✏️ Canal renomeado: **${old.name}** → **${now.name}**`);
    if ((old.parentId || null) !== (now.parentId || null)) diffs.push(`📁 Categoria alterada: **${now.name}**`);
    if ((old.topic || null) !== (now.topic || null)) diffs.push(`📝 Tópico alterado: **${now.name}**`);
    if (JSON.stringify(old.overwrites || []) !== JSON.stringify(now.overwrites || [])) diffs.push(`🔐 Permissões alteradas: **${now.name}**`);
  }
  for (const [id, now] of newChannels) if (!oldChannels.has(id)) diffs.push(`➕ Canal novo: **${now.name}**`);

  const oldRoles = new Map(snapshot.roles.map((item) => [item.id, item]));
  const newRoles = new Map(current.roles.map((item) => [item.id, item]));
  for (const [id, old] of oldRoles) {
    const now = newRoles.get(id);
    if (!now) { diffs.push(`➖ Cargo removido: **${old.name}**`); continue; }
    if (old.name !== now.name) diffs.push(`✏️ Cargo renomeado: **${old.name}** → **${now.name}**`);
    if (old.permissions !== now.permissions) diffs.push(`🛡️ Permissões do cargo alteradas: **${now.name}**`);
  }
  for (const [id, now] of newRoles) if (!oldRoles.has(id)) diffs.push(`➕ Cargo novo: **${now.name}**`);
  return diffs;
}

async function snapshotCreatePayload(guild) {
  const message = await saveSnapshot(guild);
  return {
    embeds: [new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🕒 Time Machine • snapshot criado')
      .setDescription('A estrutura atual de canais, cargos e permissões foi registrada no armazenamento privado do GuildOS.')
      .setFooter({ text: `Snapshot ${message.id} • mantemos os 5 mais recentes` })],
    ephemeral: true
  };
}

async function snapshotComparePayload(guild) {
  const snapshot = await loadLatestSnapshot(guild);
  if (!snapshot) return { content: 'Ainda não existe snapshot. Use `/snapshot criar` primeiro.', ephemeral: true };
  const diffs = await compareSnapshot(guild, snapshot);
  const embed = new EmbedBuilder()
    .setColor(diffs.length ? 0xf0b232 : 0x57f287)
    .setTitle('🕒 Time Machine • comparação')
    .setDescription(diffs.length ? diffs.slice(0, 20).join('\n') : '✅ Nenhuma diferença estrutural foi detectada desde o último snapshot.')
    .setFooter({ text: `Snapshot base: ${new Date(snapshot.createdAt).toLocaleString('pt-BR')} • comparação somente leitura` });
  if (diffs.length > 20) embed.addFields({ name: 'Outras mudanças', value: `+${diffs.length - 20} alterações não exibidas.` });
  return { embeds: [embed], ephemeral: true };
}

async function recoverPale(interaction) {
  if (!isManager(interaction)) return respond(interaction, { content: 'Você precisa de **Gerenciar Servidor** para reconciliar recursos.', ephemeral: true });
  await interaction.deferReply({ ephemeral: true });
  const results = [];
  await setupPaleWelcome(interaction.guild)
    .then(() => results.push('✅ Boas-vindas'))
    .catch((error) => results.push(`❌ Boas-vindas: ${error.message}`));
  await setupPaleCommunity(interaction.guild)
    .then(() => results.push('✅ Comunidade/cargos/sugestões'))
    .catch((error) => results.push(`❌ Comunidade: ${error.message}`));
  return respond(interaction, {
    embeds: [new EmbedBuilder()
      .setColor(results.some((item) => item.startsWith('❌')) ? 0xf0b232 : 0x57f287)
      .setTitle('🛠️ Auto-Recovery seguro')
      .setDescription(results.join('\n'))
      .setFooter({ text: 'A recuperação não apaga canais, cargos ou históricos.' })],
    ephemeral: true
  });
}

async function handleButton(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('guildos:')) return false;
  const action = interaction.customId.split(':')[1];
  if (['diag', 'staff', 'arch'].includes(action) && !isManager(interaction)) {
    await respond(interaction, { content: 'Essa área é restrita à administração do servidor.', ephemeral: true });
    return true;
  }
  if (action === 'diag') await respond(interaction, await diagnosticPayload(interaction.guild, true));
  else if (action === 'radar') await respond(interaction, await radarPayload(interaction.guild));
  else if (action === 'staff') await respond(interaction, await staffPayload(interaction.guild));
  else if (action === 'arch') await respond(interaction, await architectPayload(interaction.guild));
  else if (action === 'recover' && interaction.customId === 'guildos:recover:pale') await recoverPale(interaction);
  else return false;
  return true;
}

function shouldBlockForIncident(interaction) {
  if (!incidentModes.get(interaction.guildId)) return false;
  if (isManager(interaction)) return false;
  if (interaction.isChatInputCommand() && ['central', 'incidente'].includes(interaction.commandName)) return false;
  return interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit() || interaction.isChatInputCommand();
}

export async function setupGuildOS(guild) {
  const kind = guildKind(guild);
  if (!kind) return false;
  const state = await findStateChannel(guild).catch(() => null);
  incidentModes.set(guild.id, state ? incidentFromTopic(state.topic) : false);
  const writes = await reconcileCommands(guild);
  console.log(`[GUILDOS] ${guild.name}: pronto • comandos alterados=${writes} • incidente=${incidentModes.get(guild.id) ? 'on' : 'off'}.`);
  return true;
}

export async function handleGuildOSInteraction(interaction) {
  if (!interaction.inGuild() || !guildKind(interaction.guild)) return false;

  if (shouldBlockForIncident(interaction)) {
    await respond(interaction, {
      content: '🔒 **Modo incidente ativo.** As interações não administrativas do bot estão temporariamente bloqueadas enquanto a staff verifica o servidor.',
      ephemeral: true
    });
    return true;
  }

  if (await handleButton(interaction)) return true;
  if (!interaction.isChatInputCommand()) return false;

  if (interaction.commandName === 'central') {
    await respond(interaction, await centralPayload(interaction));
    return true;
  }

  if (interaction.commandName === 'diagnostico') {
    if (!isManager(interaction)) { await respond(interaction, { content: 'Você precisa de **Gerenciar Servidor** para usar o diagnóstico administrativo.', ephemeral: true }); return true; }
    await respond(interaction, await diagnosticPayload(interaction.guild, true));
    return true;
  }

  if (interaction.commandName === 'permissoes') {
    if (!isManager(interaction)) { await respond(interaction, { content: 'Você precisa de **Gerenciar Servidor** para simular permissões.', ephemeral: true }); return true; }
    await respond(interaction, await permissionPayload(interaction));
    return true;
  }

  if (interaction.commandName === 'staff') {
    if (!isManager(interaction)) { await respond(interaction, { content: 'Área restrita à administração.', ephemeral: true }); return true; }
    await respond(interaction, await staffPayload(interaction.guild));
    return true;
  }

  if (interaction.commandName === 'radar') {
    await interaction.deferReply({ ephemeral: true });
    await respond(interaction, await radarPayload(interaction.guild));
    return true;
  }

  if (interaction.commandName === 'arquiteto') {
    if (!isManager(interaction)) { await respond(interaction, { content: 'Você precisa de **Gerenciar Servidor** para usar o modo arquiteto.', ephemeral: true }); return true; }
    await respond(interaction, await architectPayload(interaction.guild));
    return true;
  }

  if (interaction.commandName === 'snapshot') {
    if (!isManager(interaction)) { await respond(interaction, { content: 'Você precisa de **Gerenciar Servidor** para usar a Time Machine.', ephemeral: true }); return true; }
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });
    const payload = sub === 'criar' ? await snapshotCreatePayload(interaction.guild) : await snapshotComparePayload(interaction.guild);
    await respond(interaction, payload);
    return true;
  }

  if (interaction.commandName === 'incidente') {
    if (!isManager(interaction)) { await respond(interaction, { content: 'Você precisa de **Gerenciar Servidor** para controlar o modo incidente.', ephemeral: true }); return true; }
    const sub = interaction.options.getSubcommand();
    if (sub === 'ativar') await setIncidentMode(interaction.guild, true);
    if (sub === 'desativar') await setIncidentMode(interaction.guild, false);
    const enabled = incidentModes.get(interaction.guild.id) === true;
    await respond(interaction, {
      embeds: [new EmbedBuilder()
        .setColor(enabled ? 0xed4245 : 0x57f287)
        .setTitle('🚨 Modo Incidente')
        .setDescription(enabled
          ? '🔒 **ATIVO** — interações não administrativas do bot estão bloqueadas.'
          : '🟢 **DESATIVADO** — funcionamento normal.')],
      ephemeral: true
    });
    return true;
  }

  return false;
}
