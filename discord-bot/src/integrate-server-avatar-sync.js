import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('./index.js', import.meta.url);
let source = await readFile(indexPath, 'utf-8');

if (source.includes('MANGAMORPH_SERVER_AVATAR_SYNC_V1')) {
  console.log('[AVATAR-SYNC] Integração já aplicada.');
  process.exit(0);
}

const setupAnchor = 'async function setupGuild(guild) {';
const readyAnchor = "  client.user.setActivity('MangaMorph');\n\n  for (const guild of client.guilds.cache.values()) {";
const guildCreateAnchor = "client.on(Events.GuildCreate, async (guild) => {\n  await setupGuild(guild);\n});";

if (!source.includes(setupAnchor) || !source.includes(readyAnchor) || !source.includes(guildCreateAnchor)) {
  console.error('[AVATAR-SYNC] Estrutura esperada não encontrada em src/index.js.');
  process.exit(1);
}

const helper = `const MANGAMORPH_SERVER_AVATAR_SYNC_V1 = true;\n\nfunction isMangaMorphGuild(guild) {\n  const configuredId = String(process.env.MANGAMORPH_GUILD_ID || '').trim();\n  if (configuredId) return guild?.id === configuredId;\n  return normalize(guild?.name || '') === 'mangamorph';\n}\n\nasync function syncBotAvatarFromGuild(guild) {\n  if (!client.user || !guild?.icon || !isMangaMorphGuild(guild)) return;\n\n  try {\n    if (client.user.avatar && client.user.avatar === guild.icon) {\n      console.log('[AVATAR-SYNC] Foto do bot já está igual à do servidor.');\n      return;\n    }\n\n    const iconURL = guild.iconURL({ extension: 'png', size: 1024 });\n    if (!iconURL) return;\n\n    const response = await fetch(iconURL);\n    if (!response.ok) {\n      throw new Error(\`Falha ao baixar ícone do servidor: HTTP \${response.status}\`);\n    }\n\n    const avatar = Buffer.from(await response.arrayBuffer());\n    await client.user.setAvatar(avatar);\n    console.log(\`[AVATAR-SYNC] Foto de perfil sincronizada com o servidor \${guild.name}.\`);\n  } catch (error) {\n    console.error('[AVATAR-SYNC] Não foi possível sincronizar a foto:', error?.message || error);\n  }\n}\n\nasync function setupGuild(guild) {`;

source = source.replace(setupAnchor, helper);

source = source.replace(
  readyAnchor,
  "  client.user.setActivity('MangaMorph');\n\n  const mangaMorphGuild = client.guilds.cache.find((guild) => isMangaMorphGuild(guild));\n  if (mangaMorphGuild) {\n    await syncBotAvatarFromGuild(mangaMorphGuild);\n  }\n\n  for (const guild of client.guilds.cache.values()) {"
);

source = source.replace(
  guildCreateAnchor,
  `${guildCreateAnchor}\n\nclient.on(Events.GuildUpdate, async (oldGuild, newGuild) => {\n  if (!isMangaMorphGuild(newGuild)) return;\n  if (oldGuild.icon === newGuild.icon) return;\n  await syncBotAvatarFromGuild(newGuild);\n});`
);

await writeFile(indexPath, source, 'utf-8');
console.log('[AVATAR-SYNC] Sincronização automática da foto do servidor integrada.');
