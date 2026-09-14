function publicFooter(text = '') {
  if (text.includes('PA_START_PANEL')) return 'rimuru-bot • Pale Ascendancy';
  if (text.includes('PA_ABOUT_PANEL')) return 'rimuru-bot • Pale Ascendancy';
  return text;
}

function sanitizeEmbeds(embeds = []) {
  return embeds.map((embed) => {
    const data = typeof embed?.toJSON === 'function' ? embed.toJSON() : { ...embed };
    if (data.footer?.text) {
      data.footer = { ...data.footer, text: publicFooter(data.footer.text) };
    }
    return data;
  });
}

function hasInternalMarker(embeds = []) {
  return embeds.some((embed) => {
    const text = embed?.footer?.text || '';
    return text.includes('PA_START_PANEL') || text.includes('PA_ABOUT_PANEL');
  });
}

export async function upsertUniquePanel(channel, {
  panelKey,
  payload,
  matchTitles = [],
  matchCustomIds = [],
  preserveExisting = true
}) {
  const safePayload = {
    ...payload,
    embeds: sanitizeEmbeds(payload?.embeds || [])
  };

  const recent = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!recent) return channel.send(safePayload).catch(() => null);

  const matches = [...recent.values()].filter((message) => {
    if (message.author?.id !== channel.client.user.id) return false;

    const footerMatch = panelKey
      ? message.embeds.some((embed) => embed?.footer?.text?.includes(panelKey))
      : false;
    const titleMatch = message.embeds.some((embed) => matchTitles.includes(embed?.title));
    const componentMatch = message.components.some((row) =>
      row.components.some((component) => matchCustomIds.includes(component.customId))
    );

    return footerMatch || titleMatch || componentMatch;
  });

  matches.sort((a, b) => b.createdTimestamp - a.createdTimestamp);
  const primary = matches[0] || null;

  if (primary) {
    if (preserveExisting) {
      if (hasInternalMarker(primary.embeds)) {
        await primary.edit({ embeds: sanitizeEmbeds(primary.embeds) }).catch(() => null);
      }
    } else {
      await primary.edit(safePayload).catch(() => null);
    }

    for (const duplicate of matches.slice(1)) {
      await duplicate.delete().catch(() => null);
    }
    return primary;
  }

  return channel.send(safePayload).catch(() => null);
}
