import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('./index.js', import.meta.url);
let source = await readFile(indexPath, 'utf-8');

if (source.includes('MANGAMORPH_SERVER_PROFILE_COMMAND_V1')) {
  console.log('[SERVER-PROFILE] Integração já aplicada.');
  process.exit(0);
}

const setupAnchor = 'async function setupGuild(guild) {';
const interactionAnchor = "client.on(Events.InteractionCreate, async (interaction) => {\n  try {\n    if (!interaction.inGuild()) return;";

if (!source.includes(setupAnchor) || !source.includes(interactionAnchor)) {
  console.error('[SERVER-PROFILE] Estrutura esperada não encontrada em src/index.js.');
  process.exit(1);
}

const helper = [
  'const MANGAMORPH_SERVER_PROFILE_COMMAND_V1 = true;',
  '',
  'const SERVER_PROFILE_COMMAND = {',
  "  name: 'perfil',",
  "  description: 'Perfis e informações do MangaMorph',",
  '  options: [',
  '    {',
  '      type: 1,',
  "      name: 'servidor',",
  "      description: 'Mostra o perfil e as informações do servidor'",
  '    }',
  '  ]',
  '};',
  '',
  'function serverBoostLevel(guild) {',
  '  const tier = Number(guild?.premiumTier || 0);',
  "  return tier > 0 ? 'Nível ' + tier : 'Sem nível';",
  '}',
  '',
  'function verificationLabel(level) {',
  '  const labels = {',
  "    0: 'Nenhuma',",
  "    1: 'Baixa',",
  "    2: 'Média',",
  "    3: 'Alta',",
  "    4: 'Muito alta'",
  '  };',
  "  return labels[Number(level)] || 'Não informado';",
  '}',
  '',
  'async function ensureServerProfileCommand(guild) {',
  '  const commands = await guild.commands.fetch();',
  "  const existing = commands.find((command) => command.name === 'perfil');",
  '',
  '  if (existing) {',
  '    await guild.commands.edit(existing.id, SERVER_PROFILE_COMMAND);',
  '  } else {',
  '    await guild.commands.create(SERVER_PROFILE_COMMAND);',
  '  }',
  '',
  "  console.log('[SERVER-PROFILE] /perfil servidor registrado em ' + guild.name + '.');",
  '}',
  '',
  'async function sendServerProfile(interaction) {',
  '  const guild = interaction.guild;',
  '  const [channels, roles] = await Promise.all([',
  '    guild.channels.fetch(),',
  '    guild.roles.fetch()',
  '  ]);',
  '',
  "  const icon = guild.iconURL({ extension: 'png', size: 1024 });",
  "  const banner = guild.bannerURL({ extension: 'png', size: 1024 });",
  '  const createdAt = Math.floor(guild.createdTimestamp / 1000);',
  "  const description = guild.description?.trim() || 'Comunidade para quem acompanha mangás, manhwas, manhuas e webtoons.';",
  '',
  '  const embed = new EmbedBuilder()',
  '    .setColor(0x6f7cff)',
  '    .setAuthor({',
  "      name: 'MangaMorph • Perfil do servidor',",
  '      iconURL: icon || client.user.displayAvatarURL()',
  '    })',
  '    .setTitle(guild.name)',
  '    .setDescription(description)',
  '    .addFields(',
  "      { name: 'Status', value: '🟢 Online', inline: true },",
  "      { name: 'Membros', value: String(guild.memberCount), inline: true },",
  "      { name: 'Canais', value: String(channels.size), inline: true },",
  "      { name: 'Cargos', value: String(Math.max(0, roles.size - 1)), inline: true },",
  "      { name: 'Boosts', value: String(guild.premiumSubscriptionCount || 0) + ' • ' + serverBoostLevel(guild), inline: true },",
  "      { name: 'Verificação', value: verificationLabel(guild.verificationLevel), inline: true },",
  "      { name: 'Dono', value: '<@' + guild.ownerId + '>', inline: true },",
  "      { name: 'Criado em', value: '<t:' + createdAt + ':D>\\n<t:' + createdAt + ':R>', inline: true },",
  "      { name: 'ID do servidor', value: '`' + guild.id + '`', inline: true }",
  '    )',
  "    .setFooter({ text: 'MangaMorph • Informações atualizadas em tempo real' })",
  '    .setTimestamp();',
  '',
  '  if (icon) embed.setThumbnail(icon);',
  '  if (banner) embed.setImage(banner);',
  '',
  '  await interaction.reply({ embeds: [embed] });',
  '}',
  '',
  'async function setupGuild(guild) {',
  '  await ensureServerProfileCommand(guild).catch((error) => {',
  "    console.error('[SERVER-PROFILE] Falha ao registrar em ' + guild.name + ':', error);",
  '  });'
].join('\n');

source = source.replace(setupAnchor, helper);

const interactionPatch = interactionAnchor + [
  '',
  "    if (interaction.isChatInputCommand() && interaction.commandName === 'perfil') {",
  '      const subcommand = interaction.options.getSubcommand(false);',
  "      if (subcommand === 'servidor') {",
  '        await sendServerProfile(interaction);',
  '        return;',
  '      }',
  '    }'
].join('\n');

source = source.replace(interactionAnchor, interactionPatch);

await writeFile(indexPath, source, 'utf-8');
console.log('[SERVER-PROFILE] /perfil servidor integrado ao bot.');
