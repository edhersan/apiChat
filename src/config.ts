import dotenv from 'dotenv';

if (!process.env.VERCEL) {
  dotenv.config({ path: ['.env.local', '.env'], quiet: true });
}

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Falta la variable de entorno ${name}. Revisa .env.example y crea tu .env.local (o configúrala en Vercel).`,
    );
  }
  return value.trim();
}

export const config = {
  geminiApiKey: required('GEMINI_API_KEY'),
  appApiKey: required('APP_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite',
  corsOrigin: process.env.CORS_ORIGIN?.trim() || '*',
  port: Number(process.env.PORT) || 3000,
};
