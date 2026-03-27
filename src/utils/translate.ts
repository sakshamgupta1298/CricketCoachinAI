/**
 * Translate English text to Hindi using MyMemory Translation API (free, no API key).
 * Rate limit: ~1000 words/day on free tier; for production consider a dedicated API.
 */

import { currentConfig } from '../../config';

const MYMEMORY_URL = 'https://api.mymemory.translated.net/get';
const MAX_CHUNK_LENGTH = 450; // Stay under ~500 words per request

function splitIntoChunks(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  const trimmed = text.trim();
  if (trimmed.length <= MAX_CHUNK_LENGTH) return [trimmed];

  const chunks: string[] = [];
  let remaining = trimmed;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHUNK_LENGTH) {
      chunks.push(remaining);
      break;
    }
    const slice = remaining.slice(0, MAX_CHUNK_LENGTH);
    const lastSpace = slice.lastIndexOf(' ');
    const breakAt = lastSpace > MAX_CHUNK_LENGTH / 2 ? lastSpace : MAX_CHUNK_LENGTH;
    chunks.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  return chunks;
}

async function translateChunkWithGoogle(chunk: string): Promise<string | null> {
  const apiKey =
    // Preferred: set in config.js as GOOGLE_TRANSLATE_API_KEY
    (currentConfig as any)?.GOOGLE_TRANSLATE_API_KEY ||
    // Optional: allow ENV usage in non-Expo setups
    (process as any)?.env?.GOOGLE_TRANSLATE_API_KEY;

  if (!apiKey) return null;

  try {
    // Google Cloud Translation API v2 REST endpoint.
    const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: chunk,
        source: 'en',
        target: 'hi',
        format: 'text',
      }),
    });

    if (!res.ok) {
      console.warn('[translate] Google API error', res.status, chunk.slice(0, 50));
      return null;
    }

    const data = await res.json();
    const translated = data?.data?.translations?.[0]?.translatedText;
    return typeof translated === 'string' && translated.trim().length > 0 ? translated : null;
  } catch (e) {
    console.warn('[translate] Google request failed', e);
    return null;
  }
}

export async function translateToHindi(englishText: string): Promise<string> {
  if (!englishText || englishText.trim().length === 0) return '';

  const chunks = splitIntoChunks(englishText);
  const results: string[] = [];

  for (const chunk of chunks) {
    try {
      // 1) Try Google Translate first (best quality).
      const googleTranslated = await translateChunkWithGoogle(chunk);
      if (googleTranslated) {
        results.push(googleTranslated);
        continue;
      }

      // 2) Fallback to MyMemory (existing behavior).
      const params = new URLSearchParams({ q: chunk, langpair: 'en|hi' });
      const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        console.warn('[translate] MyMemory API error', res.status, chunk.slice(0, 50));
        results.push(chunk); // Fallback to original
        continue;
      }

      const data = await res.json();
      const translated = data?.responseData?.translatedText ?? chunk;
      results.push(translated);
    } catch (e) {
      console.warn('[translate] Request failed', e);
      results.push(chunk);
    }
  }

  return results.join(' ').trim();
}
