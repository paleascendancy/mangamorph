import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';

const { DISCORD_TOKEN } = process.env;
const PALE_GUILD_ID = '1513757281311916042';
const BOT_NAME = 'rimuru-bot';

if (!DISCORD_TOKEN) {
  console.error('[RIMURU] DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    if (client.user.username !== BOT_NAME) {
      await client.user.setUsername(BOT_NAME).catch((error) => {
        console.warn('[RIMURU] Username global não pôde ser alterado agora:', error?.message || error);
      });
    }

    const guild = await client.guilds.fetch(PALE_GUILD_ID).catch(() => null);
    if (guild) {
      const me = await guild.members.fetchMe().catch(() => null);
      if (me?.manageable && me.nickname !== BOT_NAME) {
        await me.setNickname(BOT_NAME, 'Identidade oficial do assistente da Pale Ascendancy').catch((error) => {
          console.warn('[RIMURU] Nickname no servidor não pôde ser atualizado:', error?.message || error);
        });
      }
    }

    console.log(`[RIMURU] Identidade pronta • username=${client.user.username} • nickname=${BOT_NAME}`);
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
