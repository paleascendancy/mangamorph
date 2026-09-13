import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('./index.js', import.meta.url);
let source = await readFile(indexPath, 'utf8');
let changed = false;

if (!source.includes("from './guild-os.js'")) {
  source = source.replace(
    "import 'dotenv/config';",
    "import 'dotenv/config';\nimport { setupGuildOS, handleGuildOSInteraction } from './guild-os.js';"
  );
  changed = true;
}

if (!source.includes('await setupGuildOS(guild)')) {
  const marker = 'async function setupGuild(guild) {';
  if (!source.includes(marker)) throw new Error('[GUILDOS] setupGuild não encontrado em index.js.');
  source = source.replace(
    marker,
    `${marker}\n  await setupGuildOS(guild).catch((error) => {\n    console.error('[GUILDOS] Falha no setup:', error);\n  });`
  );
  changed = true;
}

if (!source.includes('await handleGuildOSInteraction(interaction)')) {
  const marker = '    if (!interaction.inGuild()) return;';
  if (!source.includes(marker)) throw new Error('[GUILDOS] InteractionCreate não encontrado em index.js.');
  source = source.replace(
    marker,
    `${marker}\n\n    if (await handleGuildOSInteraction(interaction)) return;`
  );
  changed = true;
}

if (changed) {
  await writeFile(indexPath, source, 'utf8');
  console.log('[GUILDOS] Integração aplicada ao runtime.');
} else {
  console.log('[GUILDOS] Integração já presente.');
}
