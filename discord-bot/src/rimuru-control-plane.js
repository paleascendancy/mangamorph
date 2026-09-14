import crypto from 'node:crypto';

const ENDPOINT = process.env.RIMURU_CONTROL_ENDPOINT;
const TOKEN = process.env.RIMURU_TELEMETRY_TOKEN;
const INSTANCE_ID = process.env.RIMURU_TELEMETRY_INSTANCE_ID || 'discord-primary';
const REFRESH_MS = Math.max(5_000, Number(process.env.RIMURU_CONTROL_REFRESH_MS || 12_000));

const state = {
  configs: new Map(),
  flags: new Map(),
  lastSync: null,
  serverTime: null,
  ready: false,
  syncing: false,
  cooldowns: new Map(),
  rateWindows: new Map()
};

const blockedInteractions = new WeakSet();

function configKey(scopeType, scopeId, module) {
  return `${scopeType}:${scopeId || '*'}:${module}`;
}

function mergeDeep(target = {}, source = {}) {
  const out = { ...target };
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = mergeDeep(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function roleIds(interaction) {
  const cache = interaction.member?.roles?.cache;
  if (cache?.values) return [...cache.values()].map(role => role.id);
  const raw = interaction.member?.roles;
  if (Array.isArray(raw)) return raw;
  return [];
}

export function getRimuruConfig(module, context = {}) {
  let merged = {};
  let enabled = true;
  const chain = [
    ['global', null],
    context.guildId ? ['guild', context.guildId] : null,
    context.channelId ? ['channel', context.channelId] : null,
    ...(context.roleIds || []).map(id => ['role', id])
  ].filter(Boolean);

  for (const [scopeType, scopeId] of chain) {
    const doc = state.configs.get(configKey(scopeType, scopeId, module));
    if (!doc) continue;
    enabled = doc.enabled;
    merged = mergeDeep(merged, doc.config || {});
  }
  return { enabled, config: merged };
}

export function isRimuruFeatureEnabled(key, guildId = null) {
  const flag = state.flags.get(key);
  if (!flag?.enabled) return false;
  if (guildId && Array.isArray(flag.blocked_guilds) && flag.blocked_guilds.includes(guildId)) return false;
  if (guildId && Array.isArray(flag.allowed_guilds) && flag.allowed_guilds.includes(guildId)) return true;
  const rollout = Number(flag.rollout_percent || 0);
  if (rollout >= 100) return true;
  if (rollout <= 0) return false;
  const seed = crypto.createHash('sha256').update(`${key}:${guildId || INSTANCE_ID}`).digest().readUInt32BE(0) % 100;
  return seed < rollout;
}

function applyPayload(payload) {
  for (const doc of payload.configs || []) state.configs.set(configKey(doc.scope_type, doc.scope_id, doc.module), doc);
  for (const flag of payload.flags || []) state.flags.set(flag.key, flag);
  state.serverTime = payload.server_time || null;
  state.lastSync = new Date().toISOString();
  state.ready = true;
}

async function request(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_500);
  try {
    return await fetch(url, {
      ...init,
      headers: { 'x-rimuru-token': TOKEN, 'Content-Type': 'application/json', ...(init.headers || {}) },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

async function acknowledge(actionId, status, result = {}) {
  if (!ENDPOINT || !TOKEN) return;
  await request(ENDPOINT, { method: 'POST', body: JSON.stringify({ action_id: actionId, status, result }) }).catch(() => {});
}

async function executeAction(client, action) {
  try {
    switch (action.action) {
      case 'refresh_config':
        state.lastSync = null;
        break;
      case 'set_presence': {
        const text = String(action.payload?.text || 'Pale Ascendancy');
        client.user?.setActivity(text.slice(0, 128));
        break;
      }
      case 'clear_runtime_cache':
        state.cooldowns.clear();
        state.rateWindows.clear();
        break;
      default:
        throw new Error(`unsupported_action:${action.action}`);
    }
    await acknowledge(action.id, 'succeeded', { applied_at: new Date().toISOString() });
  } catch (error) {
    await acknowledge(action.id, 'failed', { message: String(error?.message || error).slice(0, 500) });
  }
}

async function sync(client, forceFull = false) {
  if (!ENDPOINT || !TOKEN || state.syncing) return;
  state.syncing = true;
  try {
    const url = new URL(ENDPOINT);
    url.searchParams.set('instance_id', INSTANCE_ID);
    if (state.lastSync && !forceFull) url.searchParams.set('since', state.lastSync);
    const response = await request(url.toString(), { method: 'GET' });
    if (!response.ok) throw new Error(`control http ${response.status}`);
    const payload = await response.json();
    applyPayload(payload);
    for (const action of payload.actions || []) await executeAction(client, action);
  } catch (error) {
    console.warn('[RIMURU-CONTROL] sync falhou:', error?.message || error);
  } finally {
    state.syncing = false;
  }
}

function commandRule(interaction) {
  if (!interaction.isChatInputCommand?.()) return { enabled: true, config: {} };
  const context = {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    roleIds: roleIds(interaction)
  };
  return getRimuruConfig(`command.${interaction.commandName}`, context);
}

function takeRate(key, limit, windowMs = 60_000) {
  if (!limit || limit <= 0) return true;
  const now = Date.now();
  const values = (state.rateWindows.get(key) || []).filter(ts => now - ts < windowMs);
  if (values.length >= limit) {
    state.rateWindows.set(key, values);
    return false;
  }
  values.push(now);
  state.rateWindows.set(key, values);
  return true;
}

export async function rimuruControlGate(interaction) {
  if (!interaction?.inGuild?.() || !interaction.isChatInputCommand?.()) return true;
  if (blockedInteractions.has(interaction)) return false;

  const core = getRimuruConfig('core', { guildId: interaction.guildId, channelId: interaction.channelId, roleIds: roleIds(interaction) });
  if (core.config?.maintenance_mode === true) {
    blockedInteractions.add(interaction);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '🛠️ O Rimuru está em manutenção rápida. Tente novamente em alguns instantes.', ephemeral: true }).catch(() => {});
    return false;
  }

  const rule = commandRule(interaction);
  if (!rule.enabled || rule.config?.enabled === false) {
    blockedInteractions.add(interaction);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '⛔ Este comando está temporariamente desativado.', ephemeral: true }).catch(() => {});
    return false;
  }

  const cooldownMs = Number(rule.config?.cooldown_ms || 0);
  if (cooldownMs > 0) {
    const key = `${interaction.commandName}:${interaction.user.id}`;
    const until = state.cooldowns.get(key) || 0;
    if (until > Date.now()) {
      blockedInteractions.add(interaction);
      const seconds = Math.max(1, Math.ceil((until - Date.now()) / 1000));
      if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: `⏱️ Aguarde ${seconds}s para usar este comando novamente.`, ephemeral: true }).catch(() => {});
      return false;
    }
    state.cooldowns.set(key, Date.now() + cooldownMs);
  }

  const userLimit = Number(rule.config?.user_rate_limit || 0);
  if (!takeRate(`u:${interaction.commandName}:${interaction.user.id}`, userLimit)) {
    blockedInteractions.add(interaction);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '⚠️ Você atingiu o limite temporário deste comando.', ephemeral: true }).catch(() => {});
    return false;
  }

  const globalLimit = Number(rule.config?.global_rate_limit || 0);
  if (!takeRate(`g:${interaction.commandName}`, globalLimit)) {
    blockedInteractions.add(interaction);
    if (!interaction.replied && !interaction.deferred) await interaction.reply({ content: '⚠️ Este comando está com muita demanda. Tente novamente em instantes.', ephemeral: true }).catch(() => {});
    return false;
  }

  return true;
}

export function installRimuruControlPlane(client) {
  if (client.__rimuruControlInstalled) return;
  client.__rimuruControlInstalled = true;
  client.rimuruControl = {
    getConfig: getRimuruConfig,
    isFeatureEnabled: isRimuruFeatureEnabled,
    snapshot: () => ({ ready: state.ready, lastSync: state.lastSync, configs: state.configs.size, flags: state.flags.size })
  };

  if (!ENDPOINT || !TOKEN) {
    console.warn('[RIMURU-CONTROL] desativado: endpoint/token ausentes.');
    return;
  }

  client.once('clientReady', () => sync(client, true).catch(() => {}));
  setTimeout(() => sync(client, true).catch(() => {}), 2_500).unref?.();
  setInterval(() => sync(client, false).catch(() => {}), REFRESH_MS).unref?.();
  console.log(`[RIMURU-CONTROL] Control Plane ativo • refresh=${Math.round(REFRESH_MS / 1000)}s.`);
}
