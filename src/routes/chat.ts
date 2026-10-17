import { Router } from 'express';
import { requireApiKey } from '../middleware/auth';
import { chat } from '../services/gemini';

const MAX_MESSAGE_LENGTH = 2000;

export const chatRouter = Router();

chatRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

chatRouter.post('/chat', requireApiKey, async (req, res) => {
  const body = (req.body ?? {}) as { message?: unknown; previousInteractionId?: unknown };
  const { message, previousInteractionId } = body;

  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      error: 'INVALID_BODY',
      message: 'El campo "message" es obligatorio y no puede estar vacío.',
    });
    return;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({
      error: 'INVALID_BODY',
      message: `El campo "message" no puede superar ${MAX_MESSAGE_LENGTH} caracteres.`,
    });
    return;
  }

  if (previousInteractionId !== undefined && typeof previousInteractionId !== 'string') {
    res.status(400).json({
      error: 'INVALID_BODY',
      message: 'El campo "previousInteractionId" debe ser un string cuando se envía.',
    });
    return;
  }

  try {
    const result = await chat(message.trim(), previousInteractionId);
    res.json(result);
  } catch (error) {
    console.error('[chat] Error al llamar a Gemini:', error);
    res.status(502).json({
      error: 'GEMINI_ERROR',
      message: 'No se pudo obtener respuesta del asistente. Intenta de nuevo.',
    });
  }
});
