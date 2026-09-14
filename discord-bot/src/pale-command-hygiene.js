export async function sanitizePaleCommands(guild) {
  if (guild.id !== '1513757281311916042') return false;

  const commands = await guild.commands.fetch();
  let changed = 0;

  const staleWelcome = commands.find((command) => command.name === 'boas-vindas') || null;
  if (staleWelcome) {
    await staleWelcome.delete().catch(() => {});
    changed += 1;
  }

  const embed = commands.find((command) => command.name === 'embed') || null;
  if (embed) {
    const data = embed.toJSON();
    const options = (data.options || []).filter((option) => option.name !== 'webhook');
    if (options.length !== (data.options || []).length) {
      const payload = {
        name: data.name,
        description: data.description,
        options
      };
      if (embed.defaultMemberPermissions) payload.defaultMemberPermissions = embed.defaultMemberPermissions;
      await embed.edit(payload).catch((error) => {
        console.warn('[PA-COMMANDS] Não consegui retirar /embed webhook:', error?.message || error);
      });
      changed += 1;
    }
  }

  for (const command of commands.values()) {
    if (['embed', 'boas-vindas'].includes(command.name)) continue;
    const searchable = `${command.name} ${command.description || ''}`.toLowerCase();
    if (!searchable.includes('mangamorph')) continue;
    await command.delete().catch(() => {});
    changed += 1;
  }

  const finalCommands = await guild.commands.fetch();
  const names = [...finalCommands.values()].map((command) => `/${command.name}`).sort();
  console.log(`[PA-COMMANDS] Higiene concluída • alterações=${changed} • comandos=${names.join(', ')}`);
  return true;
}
