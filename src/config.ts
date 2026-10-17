import dotenv from 'dotenv';

if (!process.env.VERCEL) {
  dotenv.config({ path: ['.env.local', '.env'], quiet: true });
}

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  return (value?.trim() || fallback).replace(/\/+$/, '');
}

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  corsOrigin: process.env.CORS_ORIGIN?.trim() || '*',
  port: Number(process.env.PORT) || 3000,
  pokemonApiUrl: normalizeBaseUrl(process.env.POKEMON_API_URL, 'https://pokemon-api-edhersan.vercel.app'),
  gamesApiUrl: normalizeBaseUrl(process.env.GAMES_API_URL, 'https://games-api-iota.vercel.app'),
  profesoresApiUrl: normalizeBaseUrl(process.env.PROFESORES_API_URL, 'https://docentes-api.vercel.app'),
  dataApiTimeoutMs: Number(process.env.DATA_API_TIMEOUT_MS) || 8000,
  catalogIndexTtlMs: Number(process.env.CATALOG_INDEX_TTL_MS) || 300_000,
};

if (!config.geminiApiKey) {
  console.warn(
    '[config] GEMINI_API_KEY no está configurada: /chat responderá 503 hasta configurarla.',
  );
}
