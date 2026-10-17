import { GoogleGenAI } from '@google/genai';
import type { GoogleGenAIInteraction, Interactions } from '@google/genai';
import { config } from '../config.js';
import { buildSystemPrompt } from '../prompt/systemPrompt.js';
import { getCatalogIndex } from './catalog.js';
import { executeToolCall, TOOL_DECLARATIONS } from './tools.js';

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

const MAX_TOOL_ROUNDS = 4;

function isFunctionCall(step: Interactions.Step): step is Interactions.FunctionCallStep {
  return step.type === 'function_call';
}

export async function chat(message: string, previousInteractionId?: string): Promise<ChatResult> {
  const ai = getClient();
  const catalogIndex = await getCatalogIndex();
  const systemInstruction = buildSystemPrompt(catalogIndex);

  let input: string | Interactions.Step[] = message;
  let previousId = previousInteractionId;

  for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
    const interaction: GoogleGenAIInteraction = await ai.interactions.create({
      model: config.geminiModel,
      input,
      system_instruction: systemInstruction,
      tools: TOOL_DECLARATIONS,
      generation_config: { temperature: 0.3 },
      ...(previousId ? { previous_interaction_id: previousId } : {}),
    });

    const functionCalls = (interaction.steps ?? []).filter(isFunctionCall);

    if (functionCalls.length === 0) {
      const reply = interaction.output_text?.trim();

      if (!reply) {
        throw new Error('EMPTY_GEMINI_RESPONSE');
      }

      return { reply, interactionId: interaction.id };
    }

    const results = await Promise.all(
      functionCalls.map((call) =>
        executeToolCall({
          id: call.id,
          name: call.name,
          arguments: call.arguments ?? {},
        }),
      ),
    );

    input = results.map((result): Interactions.FunctionResultStep => ({
      type: 'function_result',
      name: result.name,
      call_id: result.callId,
      result: [{ type: 'text', text: result.result }],
      ...(result.isError ? { is_error: true } : {}),
    }));

    previousId = interaction.id;
  }

  throw new Error('TOO_MANY_TOOL_ROUNDS');
}
