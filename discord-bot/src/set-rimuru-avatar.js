import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client, Events, GatewayIntentBits } from 'discord.js';

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
  console.error('[RIMURU-AVATAR] DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const avatarPath = path.join(__dirname, '..', 'assets', 'rimuru-avatar.base64');

if (!fs.existsSync(avatarPath)) {
  console.error('[RIMURU-AVATAR] Arquivo do avatar não encontrado.');
  process.exit(1);
}

const avatarBase64 = fs.readFileSync(avatarPath, 'utf8').trim();
const avatarBuffer = Buffer.from(avatarBase64, 'base64');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async () => {
  try {
    await client.user.setAvatar(avatarBuffer);
    console.log(`[RIMURU-AVATAR] Avatar atualizado com sucesso para ${client.user.tag}.`);
  } catch (error) {
    console.error('[RIMURU-AVATAR] Falha ao atualizar avatar:', error?.message || error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('[RIMURU-AVATAR] Falha no login:', error?.message || error);
  process.exit(1);
});
