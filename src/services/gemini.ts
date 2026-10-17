import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { SYSTEM_PROMPT } from '../prompt/systemPrompt.js';

export class GeminiKeyMissingError extends Error {
  constructor() {
    super('GEMINI_KEY_MISSING');
    this.name = 'GeminiKeyMissingError';
  }
}

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (!config.geminiApiKey) {
    throw new GeminiKeyMissingError();
  }

  client ??= new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

export interface ChatResult {
  reply: string;
  interactionId?: string;
}

export async function chat(message: string, previousInteractionId?: string): Promise<ChatResult> {
  const ai = getClient();

  const interaction = await ai.interactions.create({
    model: config.geminiModel,
    input: message,
    system_instruction: SYSTEM_PROMPT,
    generation_config: { temperature: 0.3 },
    ...(previousInteractionId ? { previous_interaction_id: previousInteractionId } : {}),
  });

  const reply = interaction.output_text?.trim();

  if (!reply) {
    throw new Error('EMPTY_GEMINI_RESPONSE');
  }

  return {
    reply,
    interactionId: interaction.id ?? undefined,
  };
}
