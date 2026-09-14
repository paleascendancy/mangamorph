import {
  ActionRowBuilder,
  EmbedBuilder,
  Events,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';

const PALE_GUILD_ID = '1513757281311916042';
const INSTALL_KEY = Symbol.for('pale.panel.editor.listener');

const normalize = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const STAFF_ROLES = new Set(['dono', 'desenvolvedor', 'administrador']);

const panelCommand = new SlashCommandBuilder()
  .setName('painel')
  .setDescription('Edita os painéis públicos da Pale Ascendancy')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

function isAuthorized(interaction) {
  if (interaction.user.id === interaction.guild.ownerId) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  return interaction.member?.roles?.cache?.some((role) => STAFF_ROLES.has(normalize(role.name))) || false;
}

async function registerCommand(guild) {
  const commands = await guild.commands.fetch();
  const data = panelCommand.toJSON();
  const existing = commands.find((command) => command.name === data.name) || null;
  if (existing) await existing.edit(data);
  else await guild.commands.create(data);
}

function findTextChannel(channels, aliases) {
  const wanted = new Set(aliases.map(normalize));
  return channels.find((channel) => channel?.isTextBased?.() && wanted.has(normalize(channel.name))) || null;
}

function hasComponent(message, customId) {
  return message.components.some((row) =>
    row.components.some((component) => component.customId === customId)
  );
}

async function findPanelTarget(guild, target) {
  const channels = await guild.channels.fetch();
  const isStart = target === 'start';
  const channel = isStart
    ? findTextChannel(channels, ['comece-aqui'])
    : findTextChannel(channels, ['sobre-a-comunidade', 'nossa-comunidade', 'institucional']);

  if (!channel) return null;
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return null;

  let message = null;
  if (isStart) {
    message = messages.find((item) => item.author.id === guild.client.user.id && hasComponent(item, 'pa_growth_intent')) || null;
  } else {
    message = messages.find((item) => item.author.id === guild.client.user.id && item.embeds.length >= 1) || null;
  }
  if (!message) return null;

  let embedIndex = 0;
  if (target === 'about-trust') embedIndex = Math.min(1, Math.max(0, message.embeds.length - 1));
  if (!message.embeds[embedIndex]) return null;

  return { channel, message, embedIndex, embed: message.embeds[embedIndex] };
}

function colorHex(embed) {
  const value = embed.color ?? 0x5865f2;
  return `#${Number(value).toString(16).padStart(6, '0').toUpperCase()}`;
}

function encodeFields(fields = []) {
  return fields.map((field) => {
    const name = String(field.name || '').replace(/\n/g, '\\n');
    const value = String(field.value || '').replace(/\n/g, '\\n');
    return `${name} || ${value} || ${field.inline ? 'sim' : 'não'}`;
  }).join('\n');
}

function decodeFields(value = '') {
  if (!value.trim()) return [];
  return value.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 25).map((line) => {
    const [rawName = '', rawValue = '', rawInline = 'não'] = line.split('||').map((part) => part.trim());
    const name = rawName.replace(/\\n/g, '\n').slice(0, 256) || 'Campo';
    const fieldValue = rawValue.replace(/\\n/g, '\n').slice(0, 1024) || '—';
    const inline = ['sim', 'yes', 'true', '1'].includes(rawInline.toLowerCase());
    return { name, value: fieldValue, inline };
  });
}

function parseColor(value) {
  const clean = String(value || '').trim().replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return Number.parseInt(clean, 16);
}

function panelPicker() {
  const select = new StringSelectMenuBuilder()
    .setCustomId('pa_panel_pick')
    .setPlaceholder('Qual parte você quer editar?')
    .addOptions(
      {
        label: 'Comece aqui',
        description: 'Painel de entrada e escolha de objetivo',
        value: 'start',
        emoji: '🧭'
      },
      {
        label: 'Sobre a comunidade',
        description: 'Apresentação principal da Pale Ascendancy',
        value: 'about-main',
        emoji: '🌐'
      },
      {
        label: 'Rede profissional',
        description: 'Bloco de profissionais verificados',
        value: 'about-trust',
        emoji: '✅'
      }
    );
  return new ActionRowBuilder().addComponents(select);
}

function inputRow(customId, label, style, value, options = {}) {
  const input = new TextInputBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setRequired(options.required ?? false)
    .setMaxLength(options.maxLength || (style === TextInputStyle.Paragraph ? 4000 : 256));
  if (value) input.setValue(String(value).slice(0, options.maxLength || 4000));
  if (options.placeholder) input.setPlaceholder(options.placeholder);
  return new ActionRowBuilder().addComponents(input);
}

async function showEditorModal(interaction, target) {
  const found = await findPanelTarget(interaction.guild, target);
  if (!found) {
    await interaction.reply({ content: 'Não encontrei esse painel no servidor.', ephemeral: true });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`pa_panel_modal:${target}`)
    .setTitle('Editor de painel • Pale Ascendancy');

  modal.addComponents(
    inputRow('title', 'Título', TextInputStyle.Short, found.embed.title || '', { required: true, maxLength: 256 }),
    inputRow('description', 'Descrição', TextInputStyle.Paragraph, found.embed.description || '', { required: true, maxLength: 4000 }),
    inputRow('color', 'Cor hexadecimal', TextInputStyle.Short, colorHex(found.embed), { required: true, maxLength: 7, placeholder: '#5865F2' }),
    inputRow('fields', 'Campos: Nome || Valor || sim/não', TextInputStyle.Paragraph, encodeFields(found.embed.fields), { required: false, maxLength: 4000, placeholder: 'Título || Texto || não' }),
    inputRow('footer', 'Rodapé', TextInputStyle.Short, found.embed.footer?.text || '', { required: false, maxLength: 2048 })
  );

  await interaction.showModal(modal);
}

async function saveModal(interaction, target) {
  const found = await findPanelTarget(interaction.guild, target);
  if (!found) {
    await interaction.reply({ content: 'O painel não foi encontrado. Ele pode ter sido apagado.', ephemeral: true });
    return;
  }

  const color = parseColor(interaction.fields.getTextInputValue('color'));
  if (color === null) {
    await interaction.reply({ content: 'A cor precisa estar no formato `#5865F2`.', ephemeral: true });
    return;
  }

  const data = found.embed.toJSON();
  data.title = interaction.fields.getTextInputValue('title').trim().slice(0, 256);
  data.description = interaction.fields.getTextInputValue('description').trim().slice(0, 4096);
  data.color = color;
  data.fields = decodeFields(interaction.fields.getTextInputValue('fields'));

  const footer = interaction.fields.getTextInputValue('footer').trim();
  if (footer) data.footer = { text: footer.slice(0, 2048) };
  else delete data.footer;

  const embeds = found.message.embeds.map((embed) => embed.toJSON());
  embeds[found.embedIndex] = data;

  await found.message.edit({ embeds });
  await interaction.reply({
    content: `✅ Painel atualizado em ${found.channel}. A alteração foi salva na própria mensagem e será preservada nos reinícios do bot.`,
    ephemeral: true,
    allowedMentions: { parse: [] }
  });
}

async function handleInteraction(interaction) {
  if (!interaction.inGuild() || interaction.guildId !== PALE_GUILD_ID) return;

  const relevant =
    (interaction.isChatInputCommand() && interaction.commandName === 'painel') ||
    (interaction.isStringSelectMenu() && interaction.customId === 'pa_panel_pick') ||
    (interaction.isModalSubmit() && interaction.customId.startsWith('pa_panel_modal:'));
  if (!relevant) return;

  if (!isAuthorized(interaction)) {
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: 'Você não tem permissão para editar os painéis da Pale Ascendancy.', ephemeral: true });
    }
    return;
  }

  try {
    if (interaction.isChatInputCommand()) {
      await interaction.reply({
        content: '**Editor visual da Pale Ascendancy**\nEscolha abaixo a parte que deseja alterar. As mudanças aparecem imediatamente para todos.',
        components: [panelPicker()],
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await showEditorModal(interaction, interaction.values[0]);
      return;
    }

    if (interaction.isModalSubmit()) {
      const target = interaction.customId.split(':')[1];
      await saveModal(interaction, target);
    }
  } catch (error) {
    console.error('[PA-PANEL] Falha no editor:', error);
    const payload = { content: 'Não consegui salvar essa alteração. Tente novamente ou avise a equipe técnica.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else await interaction.reply(payload).catch(() => {});
  }
}

async function sanitizeVisibleMarkers(guild) {
  const channels = await guild.channels.fetch();
  const targets = [
    findTextChannel(channels, ['comece-aqui']),
    findTextChannel(channels, ['sobre-a-comunidade', 'nossa-comunidade', 'institucional'])
  ].filter(Boolean);

  for (const channel of targets) {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) continue;
    for (const message of messages.values()) {
      if (message.author.id !== guild.client.user.id || !message.embeds.length) continue;
      let changed = false;
      const embeds = message.embeds.map((embed) => {
        const data = embed.toJSON();
        const footer = data.footer?.text || '';
        if (footer.includes('PA_START_PANEL') || footer.includes('PA_ABOUT_PANEL')) {
          data.footer = { text: 'rimuru-bot • Pale Ascendancy' };
          changed = true;
        }
        return data;
      });
      if (changed) await message.edit({ embeds }).catch(() => {});
    }
  }
}

export async function setupPalePanelEditor(guild) {
  if (guild.id !== PALE_GUILD_ID) return false;
  await registerCommand(guild);
  await sanitizeVisibleMarkers(guild);

  const client = guild.client;
  if (!client[INSTALL_KEY]) {
    client[INSTALL_KEY] = true;
    client.on(Events.InteractionCreate, handleInteraction);
  }

  console.log('[PA-PANEL] /painel pronto • editor visual protegido para staff.');
  return true;
}
