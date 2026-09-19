type DeepLTranslationResponse = {
  translations?: Array<{
    text?: string;
    detected_source_language?: string;
  }>;
};

export async function translateSynopsisPtBr(text: string | null): Promise<string | null> {
  const sourceText = text?.trim();
  if (!sourceText) return null;

  const apiKey = process.env.DEEPL_API_KEY?.trim();
  if (!apiKey) return null;

  const endpoint = process.env.DEEPL_API_URL?.trim()
    || 'https://api-free.deepl.com/v2/translate';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      text: [sourceText],
      target_lang: 'PT-BR',
      preserve_formatting: true,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error(`DeepL respondeu com status ${response.status}.`);
  }

  const payload = (await response.json()) as DeepLTranslationResponse;
  const translated = payload.translations?.[0]?.text?.trim();

  return translated || null;
}
