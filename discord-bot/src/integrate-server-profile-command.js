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

const helper = `const MANGAMORPH_SERVER_PROFILE_COMMAND_V1 = true;\n\nconst SERVER_PROFILE_COMMAND = {\n  name: 'perfil',\n  description: 'Perfis e informações do MangaMorph',\n  options: [\n    {\n      type: 1,\n      name: 'servidor',\n      description: 'Mostra o perfil e as informações do servidor'\n    }\n  ]\n};\n\nfunction serverBoostLevel(guild) {\n  const tier = Number(guild?.premiumTier || 0);\n  return tier > 0 ? \\`Nível \\${tier}\\` : 'Sem nível';\n}\n\nfunction verificationLabel(level) {\n  const labels = {\n    0: 'Nenhuma',\n    1: 'Baixa',\n    2: 'Média',\n    3: 'Alta',\n    4: 'Muito alta'\n  };\n  return labels[Number(level)] || 'Não informado';\n}\n\nasync function ensureServerProfileCommand(guild) {\n  const commands = await guild.commands.fetch();\n  const existing = commands.find((command) => command.name === 'perfil');\n\n  if (existing) {\n    await guild.commands.edit(existing.id, SERVER_PROFILE_COMMAND);\n  } else {\n    await guild.commands.create(SERVER_PROFILE_COMMAND);\n  }\n\n  console.log(\\`[SERVER-PROFILE] /perfil servidor registrado em \\${guild.name}.\\`);\n}\n\nasync function sendServerProfile(interaction) {\n  const guild = interaction.guild;\n  const [channels, roles] = await Promise.all([\n    guild.channels.fetch(),\n    guild.roles.fetch()\n  ]);\n\n  const icon = guild.iconURL({ extension: 'png', size: 1024 });\n  const banner = guild.bannerURL({ extension: 'png', size: 1024 });\n  const createdAt = Math.floor(guild.createdTimestamp / 1000);\n  const description = guild.description?.trim() ||\n    'Comunidade para quem acompanha mangás, manhwas, manhuas e webtoons.';\n\n  const embed = new EmbedBuilder()\n    .setColor(0x6f7cff)\n    .setAuthor({\n      name: 'MangaMorph • Perfil do servidor',\n      iconURL: icon || client.user.displayAvatarURL()\n    })\n    .setTitle(guild.name)\n    .setDescription(description)\n    .addFields(\n      { name: 'Status', value: '🟢 Online', inline: true },\n      { name: 'Membros', value: String(guild.memberCount), inline: true },\n      { name: 'Canais', value: String(channels.size), inline: true },\n      { name: 'Cargos', value: String(Math.max(0, roles.size - 1)), inline: true },\n      { name: 'Boosts', value: \\`\\${guild.premiumSubscriptionCount || 0} • \\${serverBoostLevel(guild)}\\`, inline: true },\n      { name: 'Verificação', value: verificationLabel(guild.verificationLevel), inline: true },\n      { name: 'Dono', value: \\`<@\\${guild.ownerId}>\\`, inline: true },\n      { name: 'Criado em', value: \\`<t:\\${createdAt}:D>\\n<t:\\${createdAt}:R>\\`, inline: true },\n      { name: 'ID do servidor', value: \\`\\`\\`\\${guild.id}\\`\\`\\`\\`, inline: true }\n    )\n    .setFooter({ text: 'MangaMorph • Informações atualizadas em tempo real' })\n    .setTimestamp();\n\n  if (icon) embed.setThumbnail(icon);\n  if (banner) embed.setImage(banner);\n\n  await interaction.reply({ embeds: [embed] });\n}\n\nasync function setupGuild(guild) {\n  await ensureServerProfileCommand(guild).catch((error) => {\n    console.error(\\`[SERVER-PROFILE] Falha ao registrar em \\${guild.name}:\\`, error);\n  });`;

source = source.replace(setupAnchor, helper);

source = source.replace(
  interactionAnchor,
  `${interactionAnchor}\n\n    if (interaction.isChatInputCommand() && interaction.commandName === 'perfil') {\n      const subcommand = interaction.options.getSubcommand(false);\n      if (subcommand === 'servidor') {\n        await sendServerProfile(interaction);\n        return;\n      }\n    }`
);

await writeFile(indexPath, source, 'utf-8');
console.log('[SERVER-PROFILE] /perfil servidor integrado ao bot.');
