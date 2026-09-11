import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

export const PALE_PRO_GUILD_ID = '1513757281311916042';
const CATEGORY_NAME = '「 PA 」 EDITORES PROFISSIONAIS';
const EDITOR_ROLE_NAME = '🎬・Editor Profissional';

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const TICKET_STAFF = new Set(['dono', 'direcao', 'administrador', 'moderador', 'suporte']);
const APPROVERS = new Set(['dono', 'direcao', 'administrador']);

function safeName(value = 'cliente') {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'cliente';
}

function hasNamedRole(member, names) {
  return member?.roles?.cache?.some((role) => names.has(normalize(role.name))) || false;
}

function isTicketStaff(member, guild) {
  return member?.id === guild.ownerId || hasNamedRole(member, TICKET_STAFF) ||
    member?.permissions?.has(PermissionFlagsBits.Administrator);
}

function isApprover(member, guild) {
  return member?.id === guild.ownerId || hasNamedRole(member, APPROVERS) ||
    member?.permissions?.has(PermissionFlagsBits.Administrator);
}

async function getEditorRole(guild) {
  const roles = await guild.roles.fetch();
  let role = roles.find((item) => normalize(item.name) === 'editorprofissional') || null;
  if (!role) {
    role = await guild.roles.create({
      name: EDITOR_ROLE_NAME,
      color: 0x8b5cf6,
      hoist: true,
      mentionable: false,
      permissions: [],
      reason: 'Cargo dos editores profissionais da Pale Ascendancy'
    });
  }
  return role;
}

function isProfessionalEditor(member, editorRole) {
  return Boolean(member && editorRole && member.roles.cache.has(editorRole.id));
}

async function roleSets(guild) {
  const roles = await guild.roles.fetch();
  return {
    ticketStaff: roles.filter((role) => TICKET_STAFF.has(normalize(role.name))),
    approvers: roles.filter((role) => APPROVERS.has(normalize(role.name)))
  };
}

async function findCategory(guild, normalizedName) {
  const channels = await guild.channels.fetch();
  return channels.find((channel) => channel?.type === ChannelType.GuildCategory && normalize(channel.name) === normalizedName) || null;
}

async function findText(guild, names) {
  const wanted = names.map(normalize);
  const channels = await guild.channels.fetch();
  return channels.find((channel) => channel?.type === ChannelType.GuildText && wanted.includes(normalize(channel.name))) || null;
}

async function ensureProfessionalCategory(guild, editorRole) {
  let category = await findCategory(guild, 'paeditoresprofissionais');
  const { approvers } = await roleSets(guild);

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: editorRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory] },
    {
      id: guild.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages
      ]
    }
  ];
  for (const role of approvers.values()) {
    overwrites.push({
      id: role.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    });
  }

  if (!category) {
    category = await guild.channels.create({
      name: CATEGORY_NAME,
      type: ChannelType.GuildCategory,
      permissionOverwrites: overwrites,
      reason: 'Área privada dos editores profissionais da Pale Ascendancy'
    });
  } else {
    await category.edit({ name: CATEGORY_NAME }).catch(() => {});
    for (const overwrite of overwrites) {
      const payload = {};
      for (const bit of overwrite.allow || []) payload[permissionName(bit)] = true;
      for (const bit of overwrite.deny || []) payload[permissionName(bit)] = false;
      await category.permissionOverwrites.edit(overwrite.id, payload).catch(() => {});
    }
  }
  return category;
}

function permissionName(bit) {
  const pairs = [
    ['ViewChannel', PermissionFlagsBits.ViewChannel],
    ['SendMessages', PermissionFlagsBits.SendMessages],
    ['ReadMessageHistory', PermissionFlagsBits.ReadMessageHistory],
    ['EmbedLinks', PermissionFlagsBits.EmbedLinks],
    ['AttachFiles', PermissionFlagsBits.AttachFiles],
    ['ManageChannels', PermissionFlagsBits.ManageChannels],
    ['ManageMessages', PermissionFlagsBits.ManageMessages]
  ];
  return pairs.find(([, value]) => value === bit)?.[0] || 'ViewChannel';
}

async function ensurePrivateText(guild, category, editorRole, name, topic, mode = 'read') {
  let channel = await findText(guild, [name]);
  if (!channel) {
    channel = await guild.channels.create({ name, type: ChannelType.GuildText, parent: category.id, topic, reason: 'Estrutura profissional Pale Ascendancy' });
  } else {
    await channel.edit({ name, parent: category.id, topic }).catch(() => {});
  }

  const { approvers } = await roleSets(guild);
  await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }).catch(() => {});
  await channel.permissionOverwrites.edit(editorRole.id, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: mode === 'chat',
    AttachFiles: mode === 'chat',
    EmbedLinks: mode === 'chat'
  }).catch(() => {});
  for (const role of approvers.values()) {
    await channel.permissionOverwrites.edit(role.id, {
      ViewChannel: true, ReadMessageHistory: true, SendMessages: true, AttachFiles: true, EmbedLinks: true
    }).catch(() => {});
  }
  await channel.permissionOverwrites.edit(guild.client.user.id, {
    ViewChannel: true, ReadMessageHistory: true, SendMessages: true, EmbedLinks: true, AttachFiles: true, ManageMessages: true
  }).catch(() => {});
  return channel;
}

async function upsertPanel(channel, title, payload, clientUserId) {
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const matches = recent?.filter((message) =>
    message.author.id === clientUserId && message.embeds.some((embed) => embed.title === title)
  );
  const first = matches?.first() || null;
  if (first) {
    await first.edit(payload).catch(() => {});
    for (const message of matches.values()) {
      if (message.id !== first.id) await message.delete().catch(() => {});
    }
    return first;
  }
  return channel.send(payload);
}

function shortContractEmbeds(guild) {
  return [
    new EmbedBuilder()
      .setColor(0x7b61ff)
      .setAuthor({ name: 'Pale Ascendancy • Acordo de Serviço' })
      .setTitle('📄 Contrato temporário • projeto específico')
      .setDescription(
        '**Finalidade.** Aplicável a um projeto, vídeo ou entrega específica. O escopo, formato, prazo, valor e revisões devem ficar registrados no canal do atendimento.\n\n' +
        '**1. Escopo e alterações** — o editor executa apenas o que foi aprovado. Mudanças relevantes de briefing, duração, estilo ou quantidade de entregas podem alterar prazo e preço.\n\n' +
        '**2. Pagamento** — valor, forma, entrada e saldo são definidos por escrito antes da produção. O bot não processa pagamentos.\n\n' +
        '**3. Prazo** — começa após briefing, arquivos e condições combinadas estarem disponíveis. Atrasos do cliente podem deslocar a entrega.\n\n' +
        '**4. Revisões** — a quantidade incluída deve ser combinada. Alterações extras podem exigir novo orçamento.\n\n' +
        '**5. Entrega e uso** — após o pagamento acordado, o cliente recebe os arquivos finais definidos. Arquivos de projeto/editáveis só entram se forem expressamente incluídos.'
      ),
    new EmbedBuilder()
      .setColor(0x2f3545)
      .setTitle('📌 Cancelamento, quebra e proteção das partes')
      .setDescription(
        '**6. Responsabilidades** — cliente fornece briefing, materiais e respostas em tempo razoável; editor informa limitações e mudanças de prazo assim que souber delas.\n\n' +
        '**7. Confidencialidade e direitos de terceiros** — materiais privados não devem ser divulgados sem autorização. Cada parte responde pelos materiais que fornece e pelos direitos de uso correspondentes.\n\n' +
        '**8. Cancelamento ou descumprimento** — não pagamento, abandono injustificado, entrega deliberadamente incompatível com o combinado, abuso, fraude ou divulgação indevida permitem suspender o serviço e pedir mediação da administração. Reembolso, retenção proporcional ou eventual compensação dependem do que foi acordado e da lei aplicável; não existe multa automática criada pelo bot.\n\n' +
        '**9. Registro** — mensagens, arquivos e confirmações no canal servem como registro operacional do acordo. Não envie CPF, RG, endereço ou documentos pessoais.\n\n' +
        '**10. Aceite** — cliente e editor devem digitar o nome pelo qual desejam constar no acordo e confirmar **CONCORDO**. Se alguma parte for menor de idade, autorização de responsável pode ser necessária conforme a lei aplicável.'
      )
      .setFooter({ text: `${guild.name} • Modelo operacional; para contratos de maior valor, recomenda-se revisão jurídica.` })
  ];
}

function longContractEmbeds(guild) {
  return [
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setAuthor({ name: 'Pale Ascendancy • Acordo de Serviço' })
      .setTitle('📑 Contrato de longo prazo • colaboração recorrente')
      .setDescription(
        '**Finalidade.** Aplicável a trabalhos contínuos ou recorrentes. Antes do início, as partes devem registrar duração estimada, frequência de entregas, volume médio, valor, forma de pagamento e disponibilidade esperada.\n\n' +
        '**1. Escopo recorrente** — cada ciclo deve respeitar o padrão de serviço acordado. Demandas fora do escopo podem ser cobradas separadamente.\n\n' +
        '**2. Pagamento e periodicidade** — mensal, semanal, por pacote ou por entrega, conforme negociação registrada. A continuidade pode ser suspensa se houver pagamento vencido.\n\n' +
        '**3. Prazos e agenda** — as partes definem prioridade, calendário e limite razoável de demandas. Urgências precisam ser aceitas pelo editor antes de serem consideradas obrigatórias.\n\n' +
        '**4. Revisões e padrão de qualidade** — quantidade de revisões, formatos, identidade visual e critérios de aprovação devem ser documentados no canal.\n\n' +
        '**5. Exclusividade** — só existe se for expressamente negociada e aceita pelas partes; caso contrário, editor e cliente permanecem livres para trabalhar com terceiros.'
      ),
    new EmbedBuilder()
      .setColor(0x2f3545)
      .setTitle('📌 Encerramento, quebra e continuidade')
      .setDescription(
        '**6. Encerramento normal** — qualquer parte pode pedir o fim da colaboração conforme o aviso prévio que tiver sido combinado no canal. Entregas e pagamentos já vencidos continuam devidos conforme o acordo.\n\n' +
        '**7. Quebra relevante** — fraude, não pagamento recorrente, ausência injustificada, violação de confidencialidade, abuso ou descumprimento repetido permitem suspensão imediata e mediação administrativa.\n\n' +
        '**8. Propriedade intelectual e arquivos** — o cliente recebe apenas os direitos e arquivos expressamente negociados. Licenças, fontes, músicas, plugins e outros ativos de terceiros seguem seus próprios termos.\n\n' +
        '**9. Confidencialidade e conduta** — briefing, materiais privados, preços internos e dados da outra parte não devem ser divulgados sem autorização.\n\n' +
        '**10. Registro e aceite** — este canal registra o acordo operacional. Cliente e cada editor devem inserir o nome para o acordo e confirmar **CONCORDO**. Não envie documentos pessoais. Se alguma parte for menor de idade, autorização de responsável pode ser necessária conforme a lei aplicável.'
      )
      .setFooter({ text: `${guild.name} • Modelo operacional; para contratos de maior valor ou duração, recomenda-se revisão jurídica.` })
  ];
}

function intakeModal() {
  const make = (id, label, style, placeholder, max = 1000) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(true).setMaxLength(max).setPlaceholder(placeholder)
  );
  return new ModalBuilder()
    .setCustomId('pa_pro_service_modal')
    .setTitle('Solicitação profissional')
    .addComponents(
      make('style', 'Serviço / estilo de edição', TextInputStyle.Short, 'Ex.: edit de anime, motion, shorts...', 180),
      make('duration', 'Duração aproximada do vídeo', TextInputStyle.Short, 'Ex.: 30s, 1min, 3min', 80),
      make('deadline', 'Prazo desejado', TextInputStyle.Short, 'Ex.: até 20/09 ou em 5 dias', 100),
      make('budget', 'Orçamento / faixa para negociação', TextInputStyle.Short, 'Ex.: R$ 80–120, negociável', 120),
      make('details', 'Briefing, referências e observações', TextInputStyle.Paragraph, 'Objetivo, referências, formato, plataforma e detalhes importantes.', 1000)
    );
}

function acceptModal() {
  const name = new TextInputBuilder().setCustomId('agreement_name').setLabel('Nome para constar no acordo')
    .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setPlaceholder('Nome pelo qual você deseja constar');
  const confirm = new TextInputBuilder().setCustomId('agreement_confirm').setLabel('Digite CONCORDO para confirmar')
    .setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(10).setPlaceholder('CONCORDO');
  return new ModalBuilder().setCustomId('pa_pro_contract_accept_modal').setTitle('Aceite do acordo')
    .addComponents(new ActionRowBuilder().addComponents(name), new ActionRowBuilder().addComponents(confirm));
}

function parseTopic(topic = '') {
  const parts = String(topic).split('|');
  const data = {};
  for (const part of parts) {
    const index = part.indexOf(':');
    if (index > 0) data[part.slice(0, index)] = part.slice(index + 1);
  }
  return data;
}

function serviceTopic(data) {
  return [
    `PA_PRO_SERVICE:${data.PA_PRO_SERVICE}`,
    `EDITORS:${data.EDITORS || ''}`,
    `CONTRACT:${data.CONTRACT || 'none'}`,
    `CLIENTOK:${data.CLIENTOK || '0'}`,
    `EDITOROK:${data.EDITOROK || ''}`,
    `STATUS:${data.STATUS || 'active'}`
  ].join('|');
}

async function setServiceData(channel, data) {
  await channel.setTopic(serviceTopic(data), 'Atualizar estado do atendimento profissional');
}

async function createProfessionalTicket(interaction) {
  const guild = interaction.guild;
  const channels = await guild.channels.fetch();
  const existing = channels.find((channel) => channel?.type === ChannelType.GuildText && (
    channel.topic?.startsWith(`PA_PRO_TICKET:${interaction.user.id}`) ||
    channel.topic?.startsWith(`PA_PRO_SERVICE:${interaction.user.id}`)
  ));
  if (existing) {
    await interaction.reply({ content: `Você já possui um atendimento profissional ativo: ${existing}`, ephemeral: true });
    return;
  }

  const support = channels.find((channel) => channel?.type === ChannelType.GuildCategory && normalize(channel.name) === 'pasuporte') || null;
  const { ticketStaff } = await roleSets(guild);
  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
    { id: guild.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks] }
  ];
  for (const role of ticketStaff.values()) {
    overwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] });
  }

  const channel = await guild.channels.create({
    name: `servico-${safeName(interaction.user.username)}`,
    type: ChannelType.GuildText,
    parent: support?.id || null,
    topic: `PA_PRO_TICKET:${interaction.user.id}|STATUS:waiting|CLAIM:0`,
    permissionOverwrites: overwrites,
    reason: 'Solicitação de serviço profissional da Pale Ascendancy'
  });

  const values = {
    style: interaction.fields.getTextInputValue('style'),
    duration: interaction.fields.getTextInputValue('duration'),
    deadline: interaction.fields.getTextInputValue('deadline'),
    budget: interaction.fields.getTextInputValue('budget'),
    details: interaction.fields.getTextInputValue('details')
  };

  const embed = new EmbedBuilder().setColor(0x7b61ff).setAuthor({ name: 'Pale Ascendancy • Atendimento profissional' })
    .setTitle('💼 Solicitação profissional')
    .setDescription('Um membro da equipe deve assumir este atendimento, revisar o pedido e aprovar o cliente antes de encaminhá-lo aos editores profissionais.')
    .addFields(
      { name: 'Cliente', value: `${interaction.user}`, inline: true },
      { name: 'Serviço / estilo', value: values.style.slice(0, 1024), inline: true },
      { name: 'Duração', value: values.duration.slice(0, 1024), inline: true },
      { name: 'Prazo desejado', value: values.deadline.slice(0, 1024), inline: true },
      { name: 'Orçamento', value: values.budget.slice(0, 1024), inline: true },
      { name: 'Briefing / referências', value: values.details.slice(0, 1024) }
    ).setFooter({ text: 'Aprovação administrativa obrigatória antes do contato com os editores.' }).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pa_pro_ticket_claim').setLabel('Assumir atendimento').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('pa_pro_ticket_approve').setLabel('Aprovar cliente').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('pa_pro_ticket_reject').setLabel('Recusar').setEmoji('⛔').setStyle(ButtonStyle.Danger)
  );
  await channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: `Seu atendimento foi criado: ${channel}`, ephemeral: true });
}

async function createClientServiceChannel(interaction, ticketChannel) {
  const guild = interaction.guild;
  const ticketData = parseTopic(ticketChannel.topic);
  const clientId = ticketData.PA_PRO_TICKET;
  const client = await guild.members.fetch(clientId).catch(() => null);
  if (!client) throw new Error('Não foi possível localizar o cliente deste ticket.');

  const editorRole = await getEditorRole(guild);
  const category = await ensureProfessionalCategory(guild, editorRole);
  const channels = await guild.channels.fetch();
  let channel = channels.find((item) => item?.type === ChannelType.GuildText && item.topic?.startsWith(`PA_PRO_SERVICE:${clientId}`)) || null;

  if (!channel) {
    const { approvers } = await roleSets(guild);
    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: editorRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory], deny: [PermissionFlagsBits.SendMessages] },
      { id: clientId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] },
      { id: guild.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.EmbedLinks] }
    ];
    for (const role of approvers.values()) {
      overwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks] });
    }
    channel = await guild.channels.create({
      name: `cliente-${safeName(client.user.username)}`,
      type: ChannelType.GuildText,
      parent: category.id,
      topic: serviceTopic({ PA_PRO_SERVICE: clientId }),
      permissionOverwrites: overwrites,
      reason: 'Cliente aprovado para negociação com editores profissionais'
    });
  }

  const requestMessage = (await ticketChannel.messages.fetch({ limit: 20 }).catch(() => null))?.find((message) =>
    message.author.id === guild.client.user.id && message.embeds.some((embed) => embed.title === '💼 Solicitação profissional')
  );
  const request = requestMessage?.embeds?.[0];
  const fields = request?.fields?.map((field) => ({ name: field.name, value: field.value, inline: field.inline })) || [];

  const embed = new EmbedBuilder().setColor(0x7b61ff).setAuthor({ name: 'Pale Ascendancy • Pedido aprovado' })
    .setTitle('📥 Cliente aprovado para negociação')
    .setDescription(
      `${client}, seu pedido foi aprovado. Até **2 editores profissionais** podem assumir este atendimento.\n\n` +
      'Os editores devem usar **Pegar serviço**. Depois, cliente e editor(es) podem negociar escopo, prazo, revisões e valor neste canal. Antes da execução final, selecione um modelo de contrato e registre o aceite das partes.'
    ).addFields(fields).setFooter({ text: 'Máximo de 2 editores por atendimento • use este canal como registro da negociação.' }).setTimestamp();

  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pa_pro_editor_claim').setLabel('Pegar serviço').setEmoji('🎬').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('pa_pro_editor_release').setLabel('Liberar vaga').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pa_pro_contract_short').setLabel('Contrato temporário').setEmoji('📄').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('pa_pro_contract_long').setLabel('Contrato longo prazo').setEmoji('📑').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('pa_pro_service_close').setLabel('Encerrar atendimento').setEmoji('🔒').setStyle(ButtonStyle.Danger)
    )
  ];
  await upsertPanel(channel, '📥 Cliente aprovado para negociação', { embeds: [embed], components: rows }, guild.client.user.id);
  return channel;
}

async function publishContract(channel, type) {
  const embeds = type === 'long' ? longContractEmbeds(channel.guild) : shortContractEmbeds(channel.guild);
  const title = type === 'long' ? '📑 Contrato de longo prazo • colaboração recorrente' : '📄 Contrato temporário • projeto específico';
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pa_pro_contract_accept').setLabel('Li e concordo').setEmoji('✅').setStyle(ButtonStyle.Success)
  );
  await upsertPanel(channel, title, { embeds, components: [row] }, channel.guild.client.user.id);
}

async function allContractStatus(channel, data) {
  const clientOk = data.CLIENTOK === '1';
  const editors = (data.EDITORS || '').split(',').filter(Boolean);
  const editorOk = new Set((data.EDITOROK || '').split(',').filter(Boolean));
  const acceptedEditors = editors.filter((id) => editorOk.has(id));
  const embed = new EmbedBuilder().setColor(clientOk && acceptedEditors.length === editors.length && editors.length > 0 ? 0x57f287 : 0xf0b232)
    .setTitle('🧾 Status do acordo')
    .setDescription(
      `**Cliente:** ${clientOk ? '✅ aceitou' : '⏳ aguardando'}\n` +
      `**Editores:** ${editors.length ? `${acceptedEditors.length}/${editors.length} aceitaram` : 'nenhum editor assumiu ainda'}\n` +
      `**Modelo:** ${data.CONTRACT === 'long' ? 'longo prazo' : data.CONTRACT === 'short' ? 'temporário' : 'não selecionado'}`
    );
  await channel.send({ embeds: [embed] });
}

export async function setupPaleProfessionalServices(guild) {
  if (guild.id !== PALE_PRO_GUILD_ID) return false;
  const editorRole = await getEditorRole(guild);
  const category = await ensureProfessionalCategory(guild, editorRole);

  const central = await ensurePrivateText(guild, category, editorRole, '📌・central-profissional', 'Fluxo interno dos editores profissionais • atendimento, qualidade e conduta', 'read');
  const chat = await ensurePrivateText(guild, category, editorRole, '💬・chat-editores', 'Chat interno dos editores profissionais da Pale Ascendancy', 'chat');
  const contracts = await ensurePrivateText(guild, category, editorRole, '📄・contratos', 'Modelos de acordo usados nos atendimentos profissionais • somente leitura', 'read');
  const standards = await ensurePrivateText(guild, category, editorRole, '📋・padrões-de-serviço', 'Padrões de atendimento, briefing, entrega, revisões e organização', 'read');
  void chat;

  const centralEmbed = new EmbedBuilder().setColor(0x7b61ff).setAuthor({ name: 'Pale Ascendancy • Editores Profissionais' })
    .setTitle('🎬 Central profissional')
    .setDescription(
      '**Fluxo oficial**\n`01` O cliente envia o pedido em 🧾・solicitar-serviço.\n`02` A staff assume e analisa o ticket.\n`03` Um administrador aprova o cliente.\n`04` O bot cria um chat privado nesta categoria.\n`05` Até 2 editores podem usar **Pegar serviço**.\n`06` Cliente e editor(es) negociam escopo, prazo, revisões e preço.\n`07` As partes selecionam o contrato, leem e registram o aceite.\n`08` A produção e entrega seguem o que ficou registrado.\n\n**Regra:** não mova negociações importantes para DM. O canal do atendimento deve concentrar decisões, arquivos e confirmações.'
    ).setFooter({ text: 'Acesso restrito aos editores profissionais, administradores e dono.' });
  await upsertPanel(central, '🎬 Central profissional', { embeds: [centralEmbed] }, guild.client.user.id);

  await upsertPanel(contracts, '📄 Contrato temporário • projeto específico', { embeds: shortContractEmbeds(guild) }, guild.client.user.id);
  await upsertPanel(contracts, '📑 Contrato de longo prazo • colaboração recorrente', { embeds: longContractEmbeds(guild) }, guild.client.user.id);

  const standardsEmbed = new EmbedBuilder().setColor(0x2f3545).setTitle('📋 Padrões de atendimento e entrega')
    .setDescription(
      '**Antes de aceitar:** confira estilo, duração, plataforma, referências, prazo e orçamento.\n\n' +
      '**Antes de produzir:** alinhe formato/resolução, materiais fornecidos, revisões incluídas, valor, forma de pagamento e data de entrega.\n\n' +
      '**Durante o serviço:** registre mudanças importantes no canal, avise riscos de atraso e não prometa algo que não consegue entregar.\n\n' +
      '**Na entrega:** confirme o que está sendo entregue, pendências, revisões restantes e situação do pagamento.\n\n' +
      '**Conflitos:** pare a discussão e chame a administração. Não exponha cliente/editor em canais públicos.'
    );
  await upsertPanel(standards, '📋 Padrões de atendimento e entrega', { embeds: [standardsEmbed] }, guild.client.user.id);

  const publicChannel = await findText(guild, ['🧾・solicitar-serviço', 'solicitar-serviço', 'pedir-serviço']);
  if (publicChannel) {
    const publicEmbed = new EmbedBuilder().setColor(0x7b61ff).setAuthor({ name: 'Pale Ascendancy • Serviços Profissionais' })
      .setTitle('💼 Solicitar serviço profissional')
      .setDescription(
        'Abra um atendimento privado para solicitar um editor profissional. Antes da aprovação, informe os pontos essenciais para a equipe analisar seu pedido.\n\n' +
        '**Você vai informar:** estilo/serviço, duração do vídeo, prazo, faixa de orçamento e referências/briefing.\n\n' +
        'Depois da aprovação, você recebe **um único chat privado** na área profissional. Até **2 editores** podem assumir o pedido. A negociação e o aceite do contrato ficam registrados nesse canal.'
      ).setFooter({ text: 'Pale Ascendancy • Atendimento profissional e organizado' });
    const button = new ButtonBuilder().setCustomId('pa_pro_service_open').setLabel('Solicitar serviço').setEmoji('💼').setStyle(ButtonStyle.Primary);

    const recent = await publicChannel.messages.fetch({ limit: 50 }).catch(() => null);
    const old = recent?.filter((message) => message.author.id === guild.client.user.id && message.embeds.some((embed) =>
      ['🧾 Solicitar um serviço', '💼 Solicitar serviço profissional'].includes(embed.title)
    ));
    const first = old?.first() || null;
    const payload = { embeds: [publicEmbed], components: [new ActionRowBuilder().addComponents(button)] };
    if (first) {
      await first.edit(payload).catch(() => {});
      for (const message of old.values()) if (message.id !== first.id) await message.delete().catch(() => {});
    } else await publicChannel.send(payload);
  }

  console.log('[PA-PRO] Área de editores profissionais configurada.');
  return true;
}

export async function handlePaleProfessionalInteraction(interaction) {
  if (!interaction.inGuild() || interaction.guildId !== PALE_PRO_GUILD_ID) return false;

  if (interaction.isButton() && interaction.customId === 'pa_pro_service_open') {
    await interaction.showModal(intakeModal());
    return true;
  }

  if (interaction.isModalSubmit() && interaction.customId === 'pa_pro_service_modal') {
    await createProfessionalTicket(interaction);
    return true;
  }

  const ticketButton = interaction.isButton() && ['pa_pro_ticket_claim', 'pa_pro_ticket_approve', 'pa_pro_ticket_reject'].includes(interaction.customId);
  if (ticketButton) {
    const channel = interaction.channel;
    if (!channel?.topic?.startsWith('PA_PRO_TICKET:')) return true;
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!isTicketStaff(member, interaction.guild)) {
      await interaction.reply({ content: 'Somente a equipe pode usar este controle.', ephemeral: true });
      return true;
    }
    const data = parseTopic(channel.topic);

    if (interaction.customId === 'pa_pro_ticket_claim') {
      if (data.CLAIM && data.CLAIM !== '0' && data.CLAIM !== interaction.user.id && !isApprover(member, interaction.guild)) {
        await interaction.reply({ content: `Este atendimento já foi assumido por <@${data.CLAIM}>.`, ephemeral: true });
        return true;
      }
      data.CLAIM = interaction.user.id;
      data.STATUS = 'claimed';
      await channel.setTopic(`PA_PRO_TICKET:${data.PA_PRO_TICKET}|STATUS:${data.STATUS}|CLAIM:${data.CLAIM}`);
      await interaction.reply({ content: `🙋 Atendimento assumido por ${interaction.user}.` });
      return true;
    }

    if (interaction.customId === 'pa_pro_ticket_reject') {
      if (!isApprover(member, interaction.guild)) {
        await interaction.reply({ content: 'A recusa final precisa ser feita por Administrador/Dono.', ephemeral: true });
        return true;
      }
      data.STATUS = 'rejected';
      await channel.setTopic(`PA_PRO_TICKET:${data.PA_PRO_TICKET}|STATUS:rejected|CLAIM:${data.CLAIM || '0'}`);
      await interaction.reply({ content: '⛔ Solicitação recusada. Informe o motivo ao cliente antes de fechar o ticket.' });
      return true;
    }

    if (!isApprover(member, interaction.guild)) {
      await interaction.reply({ content: 'A aprovação precisa ser feita por Administrador/Dono.', ephemeral: true });
      return true;
    }
    const serviceChannel = await createClientServiceChannel(interaction, channel);
    data.STATUS = 'approved';
    await channel.setTopic(`PA_PRO_TICKET:${data.PA_PRO_TICKET}|STATUS:approved|CLAIM:${data.CLAIM || interaction.user.id}`);
    await interaction.reply({ content: `✅ Cliente aprovado. Chat profissional criado: ${serviceChannel}` });
    await serviceChannel.send({ content: `<@${data.PA_PRO_TICKET}> seu atendimento profissional foi aprovado. Use os controles acima para escolher o modelo de contrato e aguarde um editor assumir o pedido.` });
    return true;
  }

  const serviceButton = interaction.isButton() && interaction.customId.startsWith('pa_pro_') && interaction.channel?.topic?.startsWith('PA_PRO_SERVICE:');
  if (serviceButton) {
    const channel = interaction.channel;
    const data = parseTopic(channel.topic);
    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    const editorRole = await getEditorRole(interaction.guild);
    const editors = (data.EDITORS || '').split(',').filter(Boolean);

    if (interaction.customId === 'pa_pro_editor_claim') {
      if (!isProfessionalEditor(member, editorRole)) {
        await interaction.reply({ content: `Somente quem possui o cargo ${editorRole} pode pegar este serviço.`, ephemeral: true });
        return true;
      }
      if (editors.includes(interaction.user.id)) {
        await interaction.reply({ content: 'Você já está neste atendimento.', ephemeral: true });
        return true;
      }
      if (editors.length >= 2) {
        await interaction.reply({ content: 'Este cliente já está com o limite de **2 editores** neste atendimento.', ephemeral: true });
        return true;
      }
      editors.push(interaction.user.id);
      data.EDITORS = editors.join(',');
      await setServiceData(channel, data);
      await channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true, EmbedLinks: true
      }).catch(() => {});
      await interaction.reply({ content: `🎬 ${interaction.user} assumiu uma vaga neste serviço. **${editors.length}/2 editores**.` });
      if (data.CONTRACT && data.CONTRACT !== 'none') await channel.send({ content: `${interaction.user}, leia o contrato selecionado acima e registre seu aceite antes da execução final.` });
      return true;
    }

    if (interaction.customId === 'pa_pro_editor_release') {
      if (!editors.includes(interaction.user.id) && !isApprover(member, interaction.guild)) {
        await interaction.reply({ content: 'Você não está alocado neste atendimento.', ephemeral: true });
        return true;
      }
      const target = editors.includes(interaction.user.id) ? interaction.user.id : null;
      if (!target) {
        await interaction.reply({ content: 'Administradores devem pedir ao editor para liberar a vaga ou encerrar o atendimento.', ephemeral: true });
        return true;
      }
      data.EDITORS = editors.filter((id) => id !== target).join(',');
      data.EDITOROK = (data.EDITOROK || '').split(',').filter(Boolean).filter((id) => id !== target).join(',');
      await setServiceData(channel, data);
      await channel.permissionOverwrites.delete(target).catch(() => {});
      await interaction.reply({ content: `↩️ ${interaction.user} liberou a vaga. Agora há **${data.EDITORS ? data.EDITORS.split(',').length : 0}/2 editores**.` });
      return true;
    }

    if (interaction.customId === 'pa_pro_contract_short' || interaction.customId === 'pa_pro_contract_long') {
      if (interaction.user.id !== data.PA_PRO_SERVICE && !isApprover(member, interaction.guild)) {
        await interaction.reply({ content: 'Somente o cliente ou um Administrador/Dono pode escolher o modelo de contrato.', ephemeral: true });
        return true;
      }
      const alreadyAccepted = data.CLIENTOK === '1' || Boolean(data.EDITOROK);
      const nextType = interaction.customId.endsWith('_long') ? 'long' : 'short';
      if (alreadyAccepted && data.CONTRACT !== nextType) {
        await interaction.reply({ content: 'O modelo não pode ser trocado depois que uma das partes registrou o aceite.', ephemeral: true });
        return true;
      }
      data.CONTRACT = nextType;
      await setServiceData(channel, data);
      await publishContract(channel, nextType);
      await interaction.reply({ content: `📄 Modelo **${nextType === 'long' ? 'longo prazo' : 'temporário'}** selecionado. Leiam o documento e usem **Li e concordo** quando os termos negociados estiverem corretos.`, ephemeral: true });
      return true;
    }

    if (interaction.customId === 'pa_pro_contract_accept') {
      if (!data.CONTRACT || data.CONTRACT === 'none') {
        await interaction.reply({ content: 'Selecione um modelo de contrato antes do aceite.', ephemeral: true });
        return true;
      }
      const party = interaction.user.id === data.PA_PRO_SERVICE || editors.includes(interaction.user.id);
      if (!party) {
        await interaction.reply({ content: 'Somente o cliente e os editores que assumiram este serviço podem aceitar o acordo.', ephemeral: true });
        return true;
      }
      await interaction.showModal(acceptModal());
      return true;
    }

    if (interaction.customId === 'pa_pro_service_close') {
      if (!isApprover(member, interaction.guild)) {
        await interaction.reply({ content: 'Somente Administrador/Dono pode encerrar este atendimento.', ephemeral: true });
        return true;
      }
      data.STATUS = 'closed';
      await setServiceData(channel, data);
      await channel.permissionOverwrites.edit(data.PA_PRO_SERVICE, { SendMessages: false }).catch(() => {});
      for (const id of editors) await channel.permissionOverwrites.edit(id, { SendMessages: false }).catch(() => {});
      await channel.setName(`finalizado-${safeName(channel.name.replace(/^cliente-/, ''))}`).catch(() => {});
      await interaction.reply({ content: '🔒 Atendimento finalizado e bloqueado para novas mensagens de cliente/editor.' });
      return true;
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'pa_pro_contract_accept_modal') {
    const channel = interaction.channel;
    if (!channel?.topic?.startsWith('PA_PRO_SERVICE:')) return true;
    const data = parseTopic(channel.topic);
    const editors = (data.EDITORS || '').split(',').filter(Boolean);
    const isClient = interaction.user.id === data.PA_PRO_SERVICE;
    const isEditor = editors.includes(interaction.user.id);
    if (!isClient && !isEditor) {
      await interaction.reply({ content: 'Você não faz parte deste acordo.', ephemeral: true });
      return true;
    }
    const name = interaction.fields.getTextInputValue('agreement_name').trim().slice(0, 80);
    const confirm = interaction.fields.getTextInputValue('agreement_confirm').trim().toUpperCase();
    if (confirm !== 'CONCORDO') {
      await interaction.reply({ content: 'Aceite não registrado. Digite **CONCORDO** exatamente no campo de confirmação.', ephemeral: true });
      return true;
    }
    if (isClient) data.CLIENTOK = '1';
    if (isEditor) {
      const accepted = new Set((data.EDITOROK || '').split(',').filter(Boolean));
      accepted.add(interaction.user.id);
      data.EDITOROK = [...accepted].join(',');
    }
    await setServiceData(channel, data);
    const contractLabel = data.CONTRACT === 'long' ? 'Contrato de longo prazo' : 'Contrato temporário';
    const embed = new EmbedBuilder().setColor(0x57f287).setTitle('✅ Aceite registrado')
      .setDescription(`${interaction.user} registrou o aceite do **${contractLabel}**.`)
      .addFields(
        { name: 'Nome no acordo', value: name },
        { name: 'Discord', value: `${interaction.user.tag} • ${interaction.user.id}` },
        { name: 'Data', value: `<t:${Math.floor(Date.now() / 1000)}:F>` }
      )
      .setFooter({ text: 'Não envie CPF, RG, endereço ou outros documentos pessoais neste canal.' });
    await interaction.reply({ embeds: [embed] });
    await allContractStatus(channel, data);
    return true;
  }

  return false;
}
