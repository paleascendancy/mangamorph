import 'dotenv/config';
import {
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits
} from 'discord.js';

const { DISCORD_TOKEN } = process.env;
const PALE_GUILD_ID = '1513757281311916042';

if (!DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN não configurado.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const normalize = (value = '') => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const STAFF_NAMES = new Set(['dono', 'desenvolvedor', 'administrador', 'moderador', 'suporte']);

function roleLabel(roles, normalizedName, fallback) {
  const role = roles.find((item) => normalize(item.name) === normalizedName);
  return role ? `${role}` : fallback;
}

function buildEmbeds(guild, roles) {
  const owner = roleLabel(roles, 'dono', '**Dono / Direção**');
  const developer = roleLabel(roles, 'desenvolvedor', '**Desenvolvedor**');
  const administrator = roleLabel(roles, 'administrador', '**Administrador**');
  const moderator = roleLabel(roles, 'moderador', '**Moderador**');
  const support = roleLabel(roles, 'suporte', '**Suporte**');

  const header = new EmbedBuilder()
    .setColor(0x7b61ff)
    .setAuthor({
      name: 'Pale Ascendancy • Manual da Staff',
      iconURL: guild.iconURL({ size: 128 }) || client.user.displayAvatarURL()
    })
    .setTitle('✅ Funções, tarefas e responsabilidades')
    .setDescription(
      'Este canal define **quem faz o quê**, como cada função deve agir e quando um assunto precisa ser encaminhado para outro nível da equipe.\n\n' +
      `**Estrutura operacional:** ${owner} → ${developer} / ${administrator} → ${moderator} → ${support}.\n\n` +
      'A regra principal é simples: **cada cargo resolve o que está dentro da própria responsabilidade e escala o restante com contexto, evidências e registro.**'
    )
    .setFooter({ text: 'Pale Ascendancy • Organização interna' });

  const ownerEmbed = new EmbedBuilder()
    .setColor(0x9b7cff)
    .setTitle('👑 DONO / DIREÇÃO')
    .setDescription(
      `**Função:** direção final da Pale Ascendancy e autoridade máxima sobre decisões estratégicas.\n\n` +
      '**Responsabilidades principais**\n' +
      '• definir visão, posicionamento, metas e prioridades do projeto;\n' +
      '• aprovar mudanças grandes no servidor, identidade, serviços e estrutura;\n' +
      '• decidir promoções, rebaixamentos, entrada e saída de membros da staff;\n' +
      '• aprovar parcerias importantes, investimentos, despesas e decisões financeiras;\n' +
      '• definir políticas para clientes, comunidade, serviços e segurança;\n' +
      '• decidir casos excepcionais ou conflitos sem solução nos níveis abaixo;\n' +
      '• manter o controle dos acessos mais sensíveis e dos responsáveis por cada área.\n\n' +
      '**Rotina esperada**\n' +
      '• revisar problemas importantes e pendências de alto impacto;\n' +
      '• acompanhar resultados da equipe e redistribuir prioridades;\n' +
      '• validar alterações estruturais antes de mudanças irreversíveis.\n\n' +
      '**Não deve**\n' +
      '• centralizar tarefas simples que podem ser resolvidas pela equipe;\n' +
      '• tomar decisões críticas sem registro quando o assunto envolve punição grave, dinheiro ou acesso.'
    );

  const devEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🧩 DESENVOLVEDOR')
    .setDescription(
      `**Cargo:** ${developer}\n**Função:** responsável técnico por site, bots, integrações e infraestrutura.\n\n` +
      '**Responsabilidades principais**\n' +
      '• desenvolver e manter bots, site, automações e integrações;\n' +
      '• corrigir bugs, falhas de permissões e problemas de funcionamento;\n' +
      '• revisar código antes de alterações relevantes em produção;\n' +
      '• cuidar de deploys, variáveis de ambiente, APIs, banco de dados e serviços externos;\n' +
      '• manter backups, logs técnicos e procedimentos de recuperação quando aplicável;\n' +
      '• reduzir riscos de segurança e nunca expor tokens, senhas ou chaves privadas;\n' +
      '• documentar mudanças técnicas que afetem a staff ou os usuários;\n' +
      '• investigar lentidão, quedas, erros recorrentes e integrações quebradas.\n\n' +
      '**Antes de publicar uma mudança**\n' +
      '• entender o impacto; testar; preservar dados e configurações; confirmar se há forma de reversão; registrar a alteração.\n\n' +
      '**Escalar para Direção quando**\n' +
      '• houver custo, risco de perda de dados, mudança estrutural, acesso sensível ou impacto grande nos usuários.'
    );

  const adminEmbed = new EmbedBuilder()
    .setColor(0x4e73df)
    .setTitle('🛡️ ADMINISTRADOR')
    .setDescription(
      `**Cargo:** ${administrator}\n**Função:** garantir que o servidor e a operação da equipe funcionem corretamente no dia a dia.\n\n` +
      '**Responsabilidades principais**\n' +
      '• organizar categorias, canais, cargos, permissões e acessos;\n' +
      '• supervisionar Moderadores e Suporte;\n' +
      '• conferir se tickets importantes estão sendo atendidos;\n' +
      '• aplicar decisões administrativas aprovadas pela Direção;\n' +
      '• revisar punições graves antes ou depois da aplicação, conforme a urgência;\n' +
      '• garantir que canais privados e logs estejam acessíveis apenas a quem precisa;\n' +
      '• organizar entrada, treinamento e acompanhamento de novos membros da staff;\n' +
      '• resolver conflitos internos e redistribuir tarefas quando necessário;\n' +
      '• manter padrões de atendimento, organização e conduta.\n\n' +
      '**Checklist recorrente**\n' +
      '• permissões corretas; canais funcionando; tickets sem abandono; denúncias tratadas; logs disponíveis; nenhuma integração causando desordem.\n\n' +
      '**Escalar para Direção/Dev quando**\n' +
      '• o problema envolver estratégia, dinheiro, infraestrutura, segurança, perda de dados ou mudança técnica.'
    );

  const modEmbed = new EmbedBuilder()
    .setColor(0x3f8cff)
    .setTitle('⚔️ MODERADOR')
    .setDescription(
      `**Cargo:** ${moderator}\n**Função:** manter a comunidade segura, organizada e dentro das diretrizes.\n\n` +
      '**Responsabilidades principais**\n' +
      '• acompanhar conversas e agir quando houver quebra clara das regras;\n' +
      '• orientar antes de punir quando o caso for leve e corrigível;\n' +
      '• aplicar advertência, timeout ou outras medidas permitidas de forma proporcional;\n' +
      '• remover spam, flood, golpes, links suspeitos e conteúdo indevido;\n' +
      '• intervir em brigas e impedir perseguição, provocação ou assédio;\n' +
      '• registrar contexto e evidências de casos importantes;\n' +
      '• encaminhar denúncias sensíveis para Administração;\n' +
      '• evitar discussões públicas sobre decisões internas da staff.\n\n' +
      '**Padrão para qualquer ação**\n' +
      '`1.` identificar a regra; `2.` conferir contexto; `3.` agir proporcionalmente; `4.` registrar; `5.` escalar se necessário.\n\n' +
      '**Não deve**\n' +
      '• punir por opinião pessoal, usar cargo para vencer discussão ou apagar evidências sem necessidade.'
    );

  const supportEmbed = new EmbedBuilder()
    .setColor(0x42a5f5)
    .setTitle('🎫 SUPORTE')
    .setDescription(
      `**Cargo:** ${support}\n**Função:** ser o primeiro ponto de contato para dúvidas, tickets e solicitações.\n\n` +
      '**Responsabilidades principais**\n' +
      '• responder tickets com educação, clareza e objetividade;\n' +
      '• entender o pedido antes de encaminhar;\n' +
      '• coletar informações úteis: serviço, problema, referência, prazo, prints e contexto;\n' +
      '• separar atendimento comum, denúncia, parceria, candidatura e solicitação de serviço;\n' +
      '• manter o cliente ou membro informado quando o caso depender de outra pessoa;\n' +
      '• encaminhar problemas técnicos ao Desenvolvedor;\n' +
      '• encaminhar conflitos, denúncias graves e exceções à Administração/Moderação;\n' +
      '• marcar o atendimento como concluído apenas quando a dúvida ou encaminhamento estiver resolvido.\n\n' +
      '**Em solicitações de serviço**\n' +
      '• confirmar escopo, referências, prazo e orçamento informado pelo cliente;\n' +
      '• não prometer preço, entrega ou resultado sem autorização de quem executará o serviço.\n\n' +
      '**Objetivo:** ninguém deve sair de um ticket sem saber qual é o próximo passo.'
    );

  const workflow = new EmbedBuilder()
    .setColor(0x2b2f3a)
    .setTitle('📋 FLUXO DE TRABALHO DA STAFF')
    .setDescription(
      '**Prioridade**\n' +
      '🔴 **P0 — Crítico:** invasão, vazamento, bot comprometido, perda de dados ou risco imediato → Dev + Admin + Direção.\n' +
      '🟠 **P1 — Alto:** falha importante, denúncia grave, cliente bloqueado ou problema afetando muitos membros → responsável da área + Admin.\n' +
      '🟡 **P2 — Normal:** ticket, dúvida, conflito simples, ajuste de canal ou recurso → Suporte/Moderação.\n' +
      '🟢 **P3 — Melhoria:** sugestão, organização, estética e otimização → fila de tarefas.\n\n' +
      '**Ao assumir uma tarefa**\n' +
      '`1.` confirme o problema; `2.` registre o contexto; `3.` diga que assumiu; `4.` execute ou encaminhe; `5.` informe o resultado; `6.` feche somente depois da confirmação.\n\n' +
      '**Handoff entre funções**\n' +
      'Sempre encaminhe com **resumo + evidências + o que já foi tentado + o que precisa ser decidido**. Evite simplesmente dizer “veja isso”.\n\n' +
      '**Privacidade interna**\n' +
      'Informações de tickets, denúncias, clientes e decisões internas não devem ser espalhadas fora dos canais necessários.'
    );

  const cadence = new EmbedBuilder()
    .setColor(0x232833)
    .setTitle('🗓️ ROTINA RECOMENDADA')
    .setDescription(
      '**Durante o dia:** conferir tickets, denúncias, falhas e pendências da própria função.\n' +
      '**Ao finalizar turno/período:** deixar contexto do que ficou pendente para a próxima pessoa.\n' +
      '**Semanalmente:** revisar problemas repetidos, canais desorganizados, tickets atrasados, sugestões úteis e melhorias de processo.\n' +
      '**Sempre:** usar o canal de staff para alinhamento e o canal de logs para histórico quando a ação precisar ficar registrada.\n\n' +
      '🎬 **Editor de Elite** e 🎨 **Editor** continuam como cargos criativos; não recebem automaticamente poderes administrativos da staff.'
    )
    .setFooter({ text: 'Pale Ascendancy • Clareza de função evita conflito e retrabalho' });

  return [header, ownerEmbed, devEmbed, adminEmbed, modEmbed, supportEmbed, workflow, cadence];
}

client.once(Events.ClientReady, async () => {
  try {
    const guild = await client.guilds.fetch(PALE_GUILD_ID).catch(() => null);
    if (!guild) {
      console.log('[PA-STAFF] Pale Ascendancy não encontrada.');
      return;
    }

    const channels = await guild.channels.fetch();
    const roles = await guild.roles.fetch();
    const staffCategory = channels.find((channel) =>
      channel?.type === ChannelType.GuildCategory && normalize(channel.name) === 'paequipe'
    ) || null;

    let tasks = channels.find((channel) =>
      channel?.type === ChannelType.GuildText && ['tarefas', 'stafftarefas'].includes(normalize(channel.name))
    ) || null;

    if (!tasks) {
      tasks = await guild.channels.create({
        name: '✅・tarefas',
        type: ChannelType.GuildText,
        parent: staffCategory?.id || null,
        topic: 'Manual interno da staff • funções, responsabilidades, prioridades e fluxo de trabalho.',
        reason: 'Criar manual operacional da staff da Pale Ascendancy'
      });
    } else {
      await tasks.edit({
        name: '✅・tarefas',
        parent: staffCategory?.id || tasks.parentId,
        topic: 'Manual interno da staff • funções, responsabilidades, prioridades e fluxo de trabalho.'
      }).catch(() => {});
    }

    await tasks.permissionOverwrites.edit(guild.roles.everyone.id, {
      ViewChannel: false
    }).catch(() => {});

    const staffRoles = roles.filter((role) => STAFF_NAMES.has(normalize(role.name)));
    for (const role of staffRoles.values()) {
      await tasks.permissionOverwrites.edit(role.id, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: false,
        SendMessagesInThreads: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
        AddReactions: false
      }).catch(() => {});
    }

    await tasks.permissionOverwrites.edit(client.user.id, {
      ViewChannel: true,
      ReadMessageHistory: true,
      SendMessages: true,
      EmbedLinks: true,
      ManageMessages: true
    }).catch(() => {});

    const panelTitle = '✅ Funções, tarefas e responsabilidades';
    const recent = await tasks.messages.fetch({ limit: 50 }).catch(() => null);
    const panels = recent?.filter((message) =>
      message.author.id === client.user.id &&
      message.embeds.some((embed) => embed.title === panelTitle)
    );

    const payload = { embeds: buildEmbeds(guild, roles) };
    const primary = panels?.first() || null;

    if (primary) {
      await primary.edit(payload);
      const duplicates = panels.filter((message) => message.id !== primary.id);
      for (const duplicate of duplicates.values()) {
        await duplicate.delete().catch(() => {});
      }
    } else {
      await tasks.send(payload);
    }

    const detectedStaff = [...staffRoles.values()].map((role) => role.name).join(', ') || 'nenhum cargo identificado';
    console.log(`[PA-STAFF] Cargos verificados: ${detectedStaff}`);
    console.log('[PA-STAFF] ✅・tarefas configurado com manual detalhado.');
  } catch (error) {
    console.error('[PA-STAFF] Falha ao configurar manual da staff:', error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(DISCORD_TOKEN);
