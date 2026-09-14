import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { PALE_GROWTH_GUILD_ID, setupPaleGrowth } from './pale-growth.js';

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(PALE_GROWTH_GUILD_ID).catch(() => null);
    if (!guild) {
      console.log('[PA-ABOUT] Pale Ascendancy não encontrada.');
      return;
    }

    await setupPaleGrowth(guild);
    console.log('[PA-ABOUT] Painéis públicos sincronizados pelo módulo canônico da Pale.');
  } catch (error) {
    console.error('[PA-ABOUT] Falha ao sincronizar painéis públicos:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
