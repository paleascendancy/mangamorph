import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits
} from 'discord.js';

export const PALE_BUMP_GUILD_ID = '1513757281311916042';
const INTERVAL_MS = 2 * 60 * 60 * 1000;
const MIN_DELAY_MS = 60 * 1000;
const timers = new Map();

const STAFF_NAMES = new Set(['dono', 'direcao', 'administrador', 'moderador', 'suporte']);

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

async function findOrCreateBumpChannel(guild) {
  const channels = await guild.channels.fetch();

  let channel = channels.find((item) => {
    if (item?.type !== ChannelType.GuildText) return false;
    const name = normalize(item.name);
    return name.includes('disboard') || name === 'bump' || name.includes('bumpdisboard') || name.startsWith('bump');
  }) || null;

  if (channel) return channel;

  const supportCategory = channels.find((item) =>
    item?.type === ChannelType.GuildCategory &&
    (normalize(item.name) === 'pasuporte' || normalize(item.name).includes('suporte'))
  ) || null;

  channel = await guild.channels.create({
    name: '🔔・bump',
    type: ChannelType.GuildText,
    parent: supportCategory?.id || null,
    topic: 'Lembretes automáticos do DISBOARD • use /bump quando estiver disponível.',
    reason: 'Canal de lembrete de bump da Pale Ascendancy'
  });

  await channel.permissionOverwrites.edit(guild.roles.everyone.id, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: false
  }).catch(() => {});

  const roles = await guild.roles.fetch().catch(() => null);
  if (roles) {
    for (const role of roles.values()) {
      if (!STAFF_NAMES.has(normalize(role.name))) continue;
      await channel.permissionOverwrites.edit(role.id, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
        UseApplicationCommands: true
      }).catch(() => {});
    }
  }

  await channel.permissionOverwrites.edit(guild.client.user.id, {
    ViewChannel: true,
    ReadMessageHistory: true,
    SendMessages: true,
    EmbedLinks: true
  }).catch(() => {});

  return channel;
}

function reminderEmbed(guild) {
  return new EmbedBuilder()
    .setColor(0x5865F2)
    .setAuthor({
      name: 'Pale Ascendancy • DISBOARD',
      iconURL: guild.iconURL({ size: 128 }) || undefined
    })
    .setTitle('🔔 Hora do /bump')
    .setDescription(
      'O intervalo de **2 horas** terminou.\n\n' +
      'Alguém da staff pode usar **`/bump`** neste canal para renovar a divulgação da Pale Ascendancy no DISBOARD.'
    )
    .setFooter({ text: 'PA_BUMP_REMINDER • lembrete automático a cada 2 horas' })
    .setTimestamp();
}

async function sendReminder(guild, channel) {
  await channel.send({
    embeds: [reminderEmbed(guild)],
    allowedMentions: { parse: [] }
  }).catch((error) => {
    console.error('[PA-BUMP] Falha ao enviar lembrete:', error);
  });
}

async function getLastReminderTimestamp(channel, botId) {
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  if (!recent) return null;

  const reminders = recent.filter((message) =>
    message.author.id === botId &&
    message.embeds.some((embed) => embed.footer?.text?.startsWith('PA_BUMP_REMINDER'))
  );

  if (!reminders.size) return null;
  return Math.max(...reminders.map((message) => message.createdTimestamp));
}

export async function setupPaleBumpReminder(guild) {
  if (guild.id !== PALE_BUMP_GUILD_ID) return;

  const existing = timers.get(guild.id);
  if (existing) {
    clearTimeout(existing.timeout);
    if (existing.interval) clearInterval(existing.interval);
  }

  const channel = await findOrCreateBumpChannel(guild);
  const lastReminder = await getLastReminderTimestamp(channel, guild.client.user.id);
  const elapsed = lastReminder ? Date.now() - lastReminder : 0;
  const delay = lastReminder
    ? Math.max(MIN_DELAY_MS, INTERVAL_MS - elapsed)
    : INTERVAL_MS;

  const state = { timeout: null, interval: null };

  state.timeout = setTimeout(async () => {
    await sendReminder(guild, channel);
    state.interval = setInterval(() => sendReminder(guild, channel), INTERVAL_MS);
  }, delay);

  timers.set(guild.id, state);

  const nextAt = new Date(Date.now() + delay).toISOString();
  console.log(`[PA-BUMP] Lembrete configurado em #${channel.name}; próximo envio: ${nextAt}.`);
}
