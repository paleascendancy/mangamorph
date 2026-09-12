import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.join(__dirname, 'pale-professional-services.js');

let source = fs.readFileSync(targetPath, 'utf8');
let changed = false;

const archiveHelper = String.raw`
async function ensureProfessionalArchive(guild) {
  let category = await findCategory(guild, 'paarquivodeservicos');
  const { approvers } = await roleSets(guild);

  if (!category) {
    category = await guild.channels.create({
      name: '「 PA 」 ARQUIVO DE SERVIÇOS',
      type: ChannelType.GuildCategory,
      reason: 'Arquivo privado de atendimentos profissionais da Pale Ascendancy'
    });
  } else {
    await category.edit({ name: '「 PA 」 ARQUIVO DE SERVIÇOS' }).catch(() => {});
  }

  await category.permissionOverwrites.edit(guild.roles.everyone.id, {
    ViewChannel: false
  }).catch(() => {});

  await category.permissionOverwrites.edit(guild.client.user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    ManageChannels: true,
    ManageMessages: true
  }).catch(() => {});

  for (const role of approvers.values()) {
    await category.permissionOverwrites.edit(role.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    }).catch(() => {});
  }

  return category;
}
`;

if (!source.includes('async function ensureProfessionalArchive(guild)')) {
  const marker = 'export async function handlePaleProfessionalInteraction(interaction) {';
  if (!source.includes(marker)) {
    throw new Error('Não foi possível localizar o handler profissional para inserir o arquivo.');
  }
  source = source.replace(marker, `${archiveHelper}\n${marker}`);
  changed = true;
}

const newCloseBlock = String.raw`    if (interaction.customId === 'pa_pro_service_close') {
      if (!isTicketStaff(member, interaction.guild)) {
        await interaction.reply({ content: 'Somente a equipe pode encerrar este atendimento.', ephemeral: true });
        return true;
      }

      if (data.STATUS === 'closed') {
        await interaction.reply({ content: 'Este atendimento já foi encerrado.', ephemeral: true });
        return true;
      }

      await interaction.reply({
        content: '🔒 Atendimento encerrado. O canal será removido da área ativa e arquivado para a administração.',
        ephemeral: true
      });

      data.STATUS = 'closed';
      await setServiceData(channel, data);

      const archive = await ensureProfessionalArchive(interaction.guild);
      const professionalRole = await getEditorRole(interaction.guild);

      await channel.permissionOverwrites.edit(data.PA_PRO_SERVICE, {
        ViewChannel: false,
        SendMessages: false
      }).catch(() => {});

      for (const id of editors) {
        await channel.permissionOverwrites.edit(id, {
          ViewChannel: false,
          SendMessages: false
        }).catch(() => {});
      }

      await channel.permissionOverwrites.edit(professionalRole.id, {
        ViewChannel: false,
        SendMessages: false
      }).catch(() => {});

      const cleanName = safeName(
        channel.name.replace(/^(?:(?:finalizado|cliente)-)+/i, '')
      );

      await interaction.message.edit({ components: [] }).catch(() => {});
      await channel.setParent(archive.id, { lockPermissions: false }).catch(() => {});
      await channel.setName('finalizado-' + cleanName).catch(() => {});

      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2f3545)
            .setTitle('🔒 Atendimento encerrado')
            .setDescription(
              'Encerrado por ' + interaction.user + '. O histórico da negociação foi preservado neste arquivo privado da administração.'
            )
            .setTimestamp()
        ]
      }).catch(() => {});
      return true;
    }`;

if (!source.includes("content: '🔒 Atendimento encerrado. O canal será removido da área ativa e arquivado para a administração.'")) {
  const closePattern = /    if \(interaction\.customId === 'pa_pro_service_close'\) \{[\s\S]*?await interaction\.reply\(\{ content: '🔒 Atendimento finalizado e bloqueado para novas mensagens de cliente\/editor\.' \}\);\s*return true;\s*    \}/;
  if (!closePattern.test(source)) {
    throw new Error('Bloco antigo de encerramento profissional não encontrado.');
  }
  source = source.replace(closePattern, newCloseBlock);
  changed = true;
}

if (changed) {
  fs.writeFileSync(targetPath, source, 'utf8');
  console.log('[PA-PRO-CLOSE] Fechamento real com arquivo privado aplicado.');
} else {
  console.log('[PA-PRO-CLOSE] Correção de fechamento já aplicada.');
}
