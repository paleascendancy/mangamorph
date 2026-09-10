import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, 'index.js');

const source = fs.readFileSync(indexPath, 'utf8');

const pattern = /    if \(welcomeChannel\) \{[\s\S]*?    \} else \{\n      console\.warn\('Canal de boas-vindas não encontrado\.'\);\n    \}/;

const replacement = `    if (welcomeChannel) {
      const [startHereChannel, rulesChannel, rolesChannel, generalChannel, launchesChannel, supportChannel] = await Promise.all([
        findTextChannel(member.guild, null, ['🧭・comece-aqui', 'comece-aqui', 'comeceaqui']),
        findRulesChannel(member.guild),
        findTextChannel(member.guild, null, ['🎨・cargos', 'cargos', 'identidade', 'personalizacao']),
        findTextChannel(member.guild, null, ['💬・geral', 'geral']),
        findTextChannel(member.guild, null, ['🚀・lançamentos', '🚀・lancamentos', 'lançamentos', 'lancamentos']),
        findTicketPanelChannel(member.guild)
      ]);

      const channelLink = (channel, fallback) => channel ? \\`<#\${channel.id}>\\` : \\`#\${fallback}\\`;

      const embed = new EmbedBuilder()
        .setColor(0x6f7cff)
        .setAuthor({
          name: 'MangaMorph • Comunidade Oficial',
          iconURL: member.guild.iconURL({ size: 128 }) || client.user.displayAvatarURL()
        })
        .setTitle('✨ Bem-vindo ao MangaMorph')
        .setDescription(
          \\`Olá, \${member}! Você é o **membro #\${member.guild.memberCount}** da comunidade.\\n\\n\\` +
          'Descubra novas obras, acompanhe capítulos e participe das discussões. Para começar sem se perder, siga este caminho:'
        )
        .addFields(
          {
            name: '🧭  PRIMEIROS PASSOS',
            value:
              \\`**1.** \${channelLink(startHereChannel, 'comece-aqui')} — entenda como o servidor funciona\\n\\` +
              \\`**2.** \${channelLink(rulesChannel, 'regras')} — leia as regras da comunidade\\n\\` +
              \\`**3.** \${channelLink(rolesChannel, 'cargos')} — escolha seus cargos e interesses\\`
          },
          {
            name: '🌐  EXPLORE',
            value:
              \\`\${channelLink(generalChannel, 'geral')} — converse com a comunidade\\n\\` +
              \\`\${channelLink(launchesChannel, 'lançamentos')} — acompanhe novidades e capítulos\\n\\` +
              \\`\${channelLink(supportChannel, 'abrir-ticket')} — fale em privado com a equipe\\`
          }
        )
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setFooter({ text: 'Boa leitura e seja bem-vindo • MangaMorph' })
        .setTimestamp();

      await welcomeChannel.send({ content: \\`Bem-vindo, \${member}!\\`, embeds: [embed] });
    } else {
      console.warn('Canal de boas-vindas não encontrado.');
    }`;

if (!pattern.test(source)) {
  console.log('Welcome patch: bloco já atualizado ou não encontrado.');
  process.exit(0);
}

fs.writeFileSync(indexPath, source.replace(pattern, replacement));
console.log('Welcome patch: boas-vindas atualizadas com menções clicáveis de canais.');
