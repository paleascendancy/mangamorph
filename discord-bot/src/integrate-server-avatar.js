import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

let source = fs.readFileSync(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './server-avatar.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { syncBotAvatarWithServer } from './server-avatar.js';"
  );
  changed = true;
}

if (!source.includes('await syncBotAvatarWithServer(client, guild)')) {
  source = source.replace(
    'async function setupGuild(guild) {',
    "async function setupGuild(guild) {\n  await syncBotAvatarWithServer(client, guild);"
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(indexPath, source, 'utf8');
  console.log('[MM-AVATAR] Integração de foto do servidor aplicada ao bot.');
} else {
  console.log('[MM-AVATAR] Integração de foto do servidor já aplicada.');
}
