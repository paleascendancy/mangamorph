import crypto from 'node:crypto';
import fs from 'node:fs';

const STARTED_AT = new Date().toISOString();
const INSTANCE_ID = process.env.RIMURU_TELEMETRY_INSTANCE_ID || 'discord-primary';
const SUPABASE_URL = process.env.RIMURU_TELEMETRY_SUPABASE_URL;
const TELEMETRY_ENDPOINT = process.env.RIMURU_TELEMETRY_ENDPOINT || (SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/rimuru-telemetry-ingest` : null);
const TELEMETRY_TOKEN = process.env.RIMURU_TELEMETRY_TOKEN;
const HASH_SALT = process.env.RIMURU_TELEMETRY_HASH_SALT || TELEMETRY_TOKEN || 'rimuru';
const HEARTBEAT_MS = 30_000;
const FLUSH_MS = 10_000;
const MAX_QUEUE = 500;

let version = process.env.RIMURU_VERSION || null;
try {
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  version ||= pkg.version;
} catch {}

const commands = [];
const events = [];
const errors = [];
const commandWindow = [];
const eventWindow = [];
const errorWindow = [];
let commandCatalog = [];
let sending = false;
let lastIngestLatencyMs = null;
let previousCpu = process.cpuUsage();
let previousCpuAt = process.hrtime.bigint();

function boundedPush(queue, value) {
  queue.push(value);
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
}

function hashId(value) {
  if (!value) return null;
  return crypto.createHmac('sha256', HASH_SALT).update(String(value)).digest('hex');
}

function pruneWindow(window) {
  const cutoff = Date.now() - 60_000;
  while (window.length && window[0] < cutoff) window.shift();
  return window.length;
}

function captureCpuPercent() {
  const now = process.hrtime.bigint();
  const usage = process.cpuUsage(previousCpu);
  const elapsedMicros = Number(now - previousCpuAt) / 1000;
  previousCpu = process.cpuUsage();
  previousCpuAt = now;
  if (!elapsedMicros) return null;
  return Math.round(((usage.user + usage.system) / elapsedMicros) * 1000) / 10;
}

function totals(client) {
  let members = 0;
  for (const guild of client.guilds.cache.values()) members += Number(guild.memberCount || 0);
  return { guildCount: client.guilds.cache.size, userCount: members };
}

function guildRegistry(client) {
  return [...client.guilds.cache.values()].slice(0, 200).map(guild => ({
    guild_hash: hashId(guild.id),
    control_id: guild.id,
    display_name: guild.name,
    member_count: Number(guild.memberCount || 0),
    active: true
  }));
}

async function refreshCommandCatalog(client) {
  const found = new Map();
  try {
    const globalCommands = await client.application?.commands?.fetch?.();
    for (const command of globalCommands?.values?.() || []) {
      found.set(command.name, { name: command.name, description: command.description || null, category: 'discord' });
    }
  } catch {}
  for (const guild of client.guilds.cache.values()) {
    try {
      const guildCommands = await guild.commands.fetch();
      for (const command of guildCommands.values()) {
        if (!found.has(command.name)) found.set(command.name, { name: command.name, description: command.description || null, category: 'discord' });
      }
    } catch {}
  }
  commandCatalog = [...found.values()].slice(0, 300);
}

function safeError(error, operation = 'runtime') {
  const message = String(error?.message || error || 'unknown error');
  const stack = String(error?.stack || '').slice(0, 8000);
  const fingerprint = crypto.createHash('sha256').update(`${operation}:${message}`).digest('hex');
  return { fingerprint, service: 'rimuru-bot', operation, severity: 'error', message: message.slice(0, 2000), stack };
}

async function ingest(payload) {
  if (!TELEMETRY_ENDPOINT || !TELEMETRY_TOKEN) return false;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  const started = Date.now();
  try {
    const response = await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-rimuru-telemetry-token': TELEMETRY_TOKEN },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`telemetry http ${response.status}`);
    lastIngestLatencyMs = Date.now() - started;
    return true;
  } catch (error) {
    console.warn('[RIMURU-TELEMETRY] envio falhou:', error?.message || error);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function flush(client, includeMetric = false) {
  if (sending) return;
  sending = true;
  const commandBatch = commands.splice(0, 100);
  const eventBatch = events.splice(0, 150);
  const errorBatch = errors.splice(0, 50);
  try {
    const { guildCount, userCount } = totals(client);
    const memory = process.memoryUsage();
    const rawLatency = Number.isFinite(client.ws?.ping) ? Number(client.ws.ping) : null;
    const latency = rawLatency != null && rawLatency >= 0 ? rawLatency : null;
    const errorRate = pruneWindow(errorWindow);
    const degraded = (latency != null && latency > 1000) || errorRate >= 5;
    const payload = {
      kind: includeMetric ? 'heartbeat' : 'batch',
      instance_id: INSTANCE_ID,
      platform: 'discord',
      name: 'rimuru-bot',
      status: client.isReady() ? (degraded ? 'degraded' : 'online') : 'offline',
      environment: process.env.NODE_ENV || 'production',
      version,
      started_at: STARTED_AT,
      latency_ms: latency,
      guild_count: guildCount,
      user_count: userCount,
      uptime_seconds: Math.floor(process.uptime()),
      commands_per_min: pruneWindow(commandWindow),
      events_per_min: pruneWindow(eventWindow),
      errors_per_min: errorRate,
      db_latency_ms: lastIngestLatencyMs,
      cpu_percent: includeMetric ? captureCpuPercent() : null,
      memory_mb: includeMetric ? Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10 : null,
      rss_mb: includeMetric ? Math.round((memory.rss / 1024 / 1024) * 10) / 10 : null,
      heap_used_mb: includeMetric ? Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10 : null,
      queue_depth: commands.length + events.length + errors.length,
      guilds: includeMetric ? guildRegistry(client) : undefined,
      command_catalog: includeMetric ? commandCatalog : undefined,
      commands: commandBatch,
      events: eventBatch,
      errors: errorBatch,
      metadata: { runtime: process.version, telemetry: 'v2-control-plane' }
    };
    const ok = await ingest(payload);
    if (!ok) {
      commands.unshift(...commandBatch.slice(-100));
      events.unshift(...eventBatch.slice(-150));
      errors.unshift(...errorBatch.slice(-50));
      if (commands.length > MAX_QUEUE) commands.length = MAX_QUEUE;
      if (events.length > MAX_QUEUE) events.length = MAX_QUEUE;
      if (errors.length > MAX_QUEUE) errors.length = MAX_QUEUE;
    }
  } finally {
    sending = false;
  }
}

export function installRimuruTelemetry(client) {
  if (client.__rimuruTelemetryInstalled) return;
  client.__rimuruTelemetryInstalled = true;
  if (!TELEMETRY_ENDPOINT || !TELEMETRY_TOKEN) {
    console.warn('[RIMURU-TELEMETRY] desativada: endpoint/token ausentes.');
    return;
  }

  client.on('interactionCreate', (interaction) => {
    eventWindow.push(Date.now());
    boundedPush(events, {
      type: interaction.isChatInputCommand?.() ? 'command_interaction' : 'interaction', severity: 'info',
      user_hash: hashId(interaction.user?.id), group_hash: hashId(interaction.guildId),
      occurred_at: new Date().toISOString(), metadata: { interaction_type: interaction.type }
    });
    if (!interaction.isChatInputCommand?.()) return;
    commandWindow.push(Date.now());
    const started = Date.now();
    const name = interaction.commandName || 'unknown';
    const userHash = hashId(interaction.user?.id);
    const groupHash = hashId(interaction.guildId);
    setTimeout(() => {
      const success = Boolean(interaction.replied || interaction.deferred);
      boundedPush(commands, { name, category: 'discord', success, duration_ms: Date.now() - started, user_hash: userHash, group_hash: groupHash, error_code: success ? null : 'no_response', executed_at: new Date().toISOString() });
      if (!success) errorWindow.push(Date.now());
    }, 2500).unref?.();
  });

  client.on('guildCreate', (guild) => {
    eventWindow.push(Date.now());
    boundedPush(events, { type: 'guild_joined', severity: 'info', group_hash: hashId(guild.id), occurred_at: new Date().toISOString() });
    refreshCommandCatalog(client).catch(() => {});
  });
  client.on('guildDelete', (guild) => {
    eventWindow.push(Date.now());
    boundedPush(events, { type: 'guild_left', severity: 'warning', group_hash: hashId(guild.id), occurred_at: new Date().toISOString() });
  });
  client.on('guildMemberAdd', (member) => {
    eventWindow.push(Date.now());
    boundedPush(events, { type: 'member_joined', severity: 'info', user_hash: hashId(member.id), group_hash: hashId(member.guild?.id), occurred_at: new Date().toISOString() });
  });
  client.on('error', (error) => { errorWindow.push(Date.now()); boundedPush(errors, safeError(error, 'discord_client')); });
  client.on('shardError', (error) => { errorWindow.push(Date.now()); boundedPush(errors, safeError(error, 'discord_shard')); });
  process.on('unhandledRejection', (reason) => { errorWindow.push(Date.now()); boundedPush(errors, safeError(reason, 'unhandled_rejection')); });
  process.on('uncaughtExceptionMonitor', (error) => { errorWindow.push(Date.now()); boundedPush(errors, safeError(error, 'uncaught_exception')); });

  client.once('clientReady', async () => {
    await refreshCommandCatalog(client).catch(() => {});
    boundedPush(events, { type: 'bot_ready', severity: 'info', occurred_at: new Date().toISOString(), metadata: { version } });
    flush(client, true).catch(() => {});
  });

  setInterval(() => flush(client, false).catch(() => {}), FLUSH_MS).unref();
  setInterval(() => flush(client, true).catch(() => {}), HEARTBEAT_MS).unref();
  setInterval(() => refreshCommandCatalog(client).catch(() => {}), 10 * 60_000).unref();
  console.log('[RIMURU-TELEMETRY] coletor v2 instalado • guild registry + command catalog.');
}
