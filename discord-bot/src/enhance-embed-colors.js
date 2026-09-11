import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const studioPath = path.join(__dirname, 'embed-studio.js');

let source = fs.readFileSync(studioPath, 'utf8');
let changed = false;

const paletteBlock = `
const EMBED_COLOR_PALETTE = [
  { name: 'Blurple Discord', value: '#5865F2', emoji: '🟦' },
  { name: 'Azul', value: '#3498DB', emoji: '🔵' },
  { name: 'Azul Royal', value: '#4169E1', emoji: '🔵' },
  { name: 'Azul Marinho', value: '#1F3A93', emoji: '🔵' },
  { name: 'Azul Céu', value: '#5DADE2', emoji: '🩵' },
  { name: 'Ciano', value: '#00B8D9', emoji: '🩵' },
  { name: 'Turquesa', value: '#1ABC9C', emoji: '🩵' },
  { name: 'Teal', value: '#008080', emoji: '🟢' },
  { name: 'Esmeralda', value: '#2ECC71', emoji: '🟢' },
  { name: 'Verde Discord', value: '#57F287', emoji: '🟢' },
  { name: 'Lima', value: '#A3E635', emoji: '🟢' },
  { name: 'Oliva', value: '#808000', emoji: '🟢' },
  { name: 'Amarelo', value: '#F1C40F', emoji: '🟡' },
  { name: 'Dourado', value: '#F0B232', emoji: '🟡' },
  { name: 'Âmbar', value: '#F59E0B', emoji: '🟠' },
  { name: 'Laranja', value: '#E67E22', emoji: '🟠' },
  { name: 'Coral', value: '#FF7F50', emoji: '🟠' },
  { name: 'Vermelho Discord', value: '#ED4245', emoji: '🔴' },
  { name: 'Carmesim', value: '#DC143C', emoji: '🔴' },
  { name: 'Rubi', value: '#C0392B', emoji: '🔴' },
  { name: 'Rosa Rubi', value: '#F43F5E', emoji: '🩷' },
  { name: 'Rosa Discord', value: '#EB459E', emoji: '🩷' },
  { name: 'Rosa Choque', value: '#FF69B4', emoji: '🩷' },
  { name: 'Magenta', value: '#E91E63', emoji: '🩷' },
  { name: 'Roxo', value: '#9B59B6', emoji: '🟣' },
  { name: 'Violeta', value: '#8B5CF6', emoji: '🟣' },
  { name: 'Índigo', value: '#4B0082', emoji: '🟣' },
  { name: 'Lavanda', value: '#A78BFA', emoji: '🟣' },
  { name: 'Ameixa', value: '#8E4585', emoji: '🟣' },
  { name: 'Marrom', value: '#8B4513', emoji: '🟤' },
  { name: 'Chocolate', value: '#D2691E', emoji: '🟤' },
  { name: 'Areia', value: '#C2B280', emoji: '🟤' },
  { name: 'Bege', value: '#D6C7A1', emoji: '⚪' },
  { name: 'Branco', value: '#FFFFFF', emoji: '⚪' },
  { name: 'Prata', value: '#B8BEC9', emoji: '⚪' },
  { name: 'Cinza', value: '#95A5A6', emoji: '⚪' },
  { name: 'Slate', value: '#64748B', emoji: '⚫' },
  { name: 'Cinza Escuro', value: '#36393F', emoji: '⚫' },
  { name: 'Carvão', value: '#23272A', emoji: '⚫' },
  { name: 'Preto', value: '#000000', emoji: '⚫' },
  { name: 'Meia-noite', value: '#0F172A', emoji: '⚫' },
  { name: 'MangaMorph Blue', value: '#2F6BFF', emoji: '🔵' },
  { name: 'MangaMorph Cyan', value: '#4CC9F0', emoji: '🩵' },
  { name: 'Menta', value: '#98FF98', emoji: '🟢' },
  { name: 'Pêssego', value: '#FFB07C', emoji: '🟠' }
];
`;

if (!source.includes('const EMBED_COLOR_PALETTE = [')) {
  const marker = "const keyFor = (interaction) => `${interaction.guildId}:${interaction.user.id}`;\n";
  if (!source.includes(marker)) throw new Error('Não foi possível localizar o ponto de inserção da paleta.');
  source = source.replace(marker, marker + paletteBlock);
  changed = true;
}

const paletteFunctions = `
function colorSelectRow(colors, customId, placeholder, currentColor) {
  const current = String(currentColor || '').toUpperCase();
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(colors.map((entry) => ({
        label: entry.name,
        description: entry.value,
        value: entry.value,
        emoji: entry.emoji,
        default: entry.value.toUpperCase() === current
      })))
  );
}

function colorPaletteComponents(currentColor) {
  const first = EMBED_COLOR_PALETTE.slice(0, 23);
  const second = EMBED_COLOR_PALETTE.slice(23);
  return [
    colorSelectRow(first, 'es_color_palette_1', 'Cores 1/2 • azul, verde, amarelo, vermelho...', currentColor),
    colorSelectRow(second, 'es_color_palette_2', 'Cores 2/2 • rosa, roxo, neutros e MangaMorph...', currentColor),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('es_color_custom').setLabel('Cor personalizada').setEmoji('🎯').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('es_color_back').setLabel('Voltar').setEmoji('↩️').setStyle(ButtonStyle.Secondary)
    )
  ];
}

async function colorPalettePayload(interaction, session) {
  const item = activeEmbed(session);
  return {
    content:
      '## 🎨 Cor do Embed\\n' +
      `**45 cores prontas** • cor atual: \\`${item.color}\\`\\n` +
      'Escolha uma cor nas listas abaixo. Para qualquer outra tonalidade, use **Cor personalizada**.',
    embeds: [buildOneEmbed(item)],
    components: colorPaletteComponents(item.color),
    allowedMentions: { parse: [] }
  };
}
`;

if (!source.includes('function colorPaletteComponents(')) {
  const marker = 'function authorModal(session) {';
  if (!source.includes(marker)) throw new Error('Não foi possível localizar authorModal para inserir a paleta.');
  source = source.replace(marker, paletteFunctions + '\n' + marker);
  changed = true;
}

if (source.includes("const isSelect = interaction.isStringSelectMenu() && interaction.customId === 'es_select_embed';")) {
  source = source.replace(
    "const isSelect = interaction.isStringSelectMenu() && interaction.customId === 'es_select_embed';",
    "const isEmbedSelect = interaction.isStringSelectMenu() && interaction.customId === 'es_select_embed';\n  const isColorSelect = interaction.isStringSelectMenu() && interaction.customId.startsWith('es_color_palette_');"
  );
  source = source.replace(
    'if (!isButton && !isSelect && !isChannel && !isModal) return false;',
    'if (!isButton && !isEmbedSelect && !isColorSelect && !isChannel && !isModal) return false;'
  );
  source = source.replace('    if (isSelect) {', '    if (isEmbedSelect) {');
  changed = true;
}

if (!source.includes("if (isColorSelect) {")) {
  const marker = `    if (isChannel) {\n      session.channelId = interaction.values[0];\n      await interaction.update(await selectionPayload(interaction, session));\n      return true;\n    }\n`;
  const block = `\n    if (isColorSelect) {\n      const selectedColor = interaction.values[0];\n      if (parseColor(selectedColor) === null) throw new Error('A cor selecionada é inválida.');\n      activeEmbed(session).color = selectedColor.toUpperCase();\n      await interaction.update(await editorPayload(interaction, session));\n      return true;\n    }\n`;
  if (!source.includes(marker)) throw new Error('Não foi possível localizar o seletor de canal para inserir seleção de cor.');
  source = source.replace(marker, marker + block);
  changed = true;
}

const oldColorHandler = "      if (interaction.customId === 'es_color') { await interaction.showModal(colorModal(session)); return true; }";
const newColorHandler = "      if (interaction.customId === 'es_color') { await interaction.update(await colorPalettePayload(interaction, session)); return true; }\n      if (interaction.customId === 'es_color_custom') { await interaction.showModal(colorModal(session)); return true; }\n      if (interaction.customId === 'es_color_back') { await interaction.update(await editorPayload(interaction, session)); return true; }";
if (source.includes(oldColorHandler)) {
  source = source.replace(oldColorHandler, newColorHandler);
  changed = true;
}

if (!source.includes("interaction.customId === 'es_color_custom'")) {
  throw new Error('Não foi possível aplicar o novo fluxo de seleção de cores.');
}

if (changed) {
  fs.writeFileSync(studioPath, source, 'utf8');
  console.log('[EMBED-COLORS] Paleta de 45 cores aplicada ao Embed Studio.');
} else {
  console.log('[EMBED-COLORS] Paleta de 45 cores já aplicada.');
}
