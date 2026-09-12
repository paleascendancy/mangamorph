const normalizeName = (value = '') => String(value)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

let syncedGuildId = null;

function isMangaMorphGuild(guild) {
  return normalizeName(guild?.name).includes('mangamorph');
}

async function fetchBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function syncBotAvatarWithServer(client, guild) {
  if (!client?.user || !guild || !isMangaMorphGuild(guild)) return false;
  if (syncedGuildId === guild.id) return false;

  const serverIconUrl = guild.iconURL({ extension: 'png', size: 512, forceStatic: true });
  if (!serverIconUrl) {
    console.warn(`[MM-AVATAR] ${guild.name} não possui foto de servidor para sincronizar.`);
    return false;
  }

  try {
    const currentAvatarUrl = client.user.displayAvatarURL({
      extension: 'png',
      size: 512,
      forceStatic: true
    });

    const [serverIcon, currentAvatar] = await Promise.all([
      fetchBuffer(serverIconUrl),
      fetchBuffer(currentAvatarUrl)
    ]);

    if (serverIcon.equals(currentAvatar)) {
      syncedGuildId = guild.id;
      console.log('[MM-AVATAR] O bot já está usando a foto do servidor MangaMorph.');
      return false;
    }

    await client.user.setAvatar(serverIcon);
    syncedGuildId = guild.id;
    console.log('[MM-AVATAR] Foto de perfil do bot atualizada com a foto do servidor MangaMorph.');
    return true;
  } catch (error) {
    console.error('[MM-AVATAR] Não foi possível sincronizar a foto do bot:', error?.message || error);
    return false;
  }
}
