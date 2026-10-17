import dotenv from 'dotenv';

if (!process.env.VERCEL) {
  dotenv.config({ path: ['.env.local', '.env'], quiet: true });
}

export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY?.trim() || undefined,
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  corsOrigin: process.env.CORS_ORIGIN?.trim() || '*',
  port: Number(process.env.PORT) || 3000,
};

if (!config.geminiApiKey) {
  console.warn(
    '[config] GEMINI_API_KEY no está configurada: /chat responderá 503 hasta configurarla.',
  );
}
