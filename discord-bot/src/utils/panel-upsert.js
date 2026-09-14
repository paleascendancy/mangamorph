export async function upsertUniquePanel(channel, {
  panelKey,
  payload,
  matchTitles = [],
  matchCustomIds = []
}) {
  const recent = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!recent) return channel.send(payload).catch(() => null);

  const matches = [...recent.values()].filter((message) => {
    if (message.author?.id !== channel.client.user.id) return false;

    const footerMatch = message.embeds.some((embed) =>
      embed?.footer?.text?.includes(panelKey)
    );
    const titleMatch = message.embeds.some((embed) =>
      matchTitles.includes(embed?.title)
    );
    const componentMatch = message.components.some((row) =>
      row.components.some((component) => matchCustomIds.includes(component.customId))
    );

    return footerMatch || titleMatch || componentMatch;
  });

  matches.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
  const primary = matches[0] || null;

  if (primary) {
    await primary.edit(payload).catch(() => null);
    for (const duplicate of matches.slice(1)) {
      await duplicate.delete().catch(() => null);
    }
    return primary;
  }

  return channel.send(payload).catch(() => null);
}
