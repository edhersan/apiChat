import type { Interactions } from '@google/genai';
import {
  DataApiNotFoundError,
  DataApiUnavailableError,
  findProfessors,
  getGame,
  getPokemon,
  listGames,
  listPokemon,
  listProfessors,
} from './catalog.js';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  callId: string;
  result: string;
  isError: boolean;
}

export const TOOL_DECLARATIONS: Interactions.Tool[] = [
  {
    type: 'function',
    name: 'listar_pokemon',
    description:
      'Lista todos los Pokémon que existen en la base de datos de la app (id y nombre). Úsala cuando el usuario pregunte qué Pokémon hay disponibles.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'buscar_pokemon',
    description:
      'Busca un Pokémon por nombre o número de ID en la base de datos de la app y devuelve su altura (metros), peso (kg) y movimientos. Si no existe, el resultado tendrá encontrado=false.',
    parameters: {
      type: 'object',
      properties: {
        identificador: {
          type: 'string',
          description: 'Nombre o número de ID del Pokémon, por ejemplo "pikachu" o "25".',
        },
      },
      required: ['identificador'],
    },
  },
  {
    type: 'function',
    name: 'listar_juegos',
    description:
      'Lista los títulos de todos los videojuegos que existen en la base de datos de la app.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'buscar_juego',
    description:
      'Busca un videojuego por su título exacto en la base de datos de la app y devuelve su información (desarrollador, género, fecha, descripción, requisitos). Si no existe, el resultado tendrá encontrado=false.',
    parameters: {
      type: 'object',
      properties: {
        titulo: {
          type: 'string',
          description: 'Título del juego tal como aparece en la base de datos, por ejemplo "Path of Exile".',
        },
      },
      required: ['titulo'],
    },
  },
  {
    type: 'function',
    name: 'listar_profesores',
    description:
      'Lista todos los profesores del directorio de la app con su ficha completa (nombre, títulos, experiencia y resumen).',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function',
    name: 'buscar_profesor',
    description:
      'Busca profesores por nombre, apellido o ID en el directorio de la app y devuelve su ficha completa. Si no hay coincidencias, el resultado tendrá encontrado=false.',
    parameters: {
      type: 'object',
      properties: {
        nombre: {
          type: 'string',
          description: 'Nombre y/o apellido del profesor, por ejemplo "Morantes".',
        },
        id: {
          type: 'number',
          description: 'ID numérico del profesor en el directorio.',
        },
      },
    },
  },
];

function toResult(name: string, callId: string, payload: unknown, isError = false): ToolResult {
  return { name, callId, result: JSON.stringify(payload), isError };
}

function toStringArgument(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

async function runTool(call: ToolCall): Promise<ToolResult> {
  const args = call.arguments ?? {};

  switch (call.name) {
    case 'listar_pokemon': {
      const pokemon = await listPokemon();
      return toResult(call.name, call.id, { total: pokemon.length, pokemon });
    }

    case 'buscar_pokemon': {
      const identificador = toStringArgument(args.identificador);
      if (!identificador) {
        return toResult(call.name, call.id, { error: 'Falta el parámetro identificador.' }, true);
      }

      const pokemon = await getPokemon(identificador);
      return toResult(call.name, call.id, { encontrado: true, pokemon });
    }

    case 'listar_juegos': {
      const games = await listGames();
      return toResult(call.name, call.id, { total: games.length, juegos: games });
    }

    case 'buscar_juego': {
      const titulo = toStringArgument(args.titulo);
      if (!titulo) {
        return toResult(call.name, call.id, { error: 'Falta el parámetro titulo.' }, true);
      }

      const game = await getGame(titulo);
      return toResult(call.name, call.id, { encontrado: true, juego: game });
    }

    case 'listar_profesores': {
      const professors = await listProfessors();
      return toResult(call.name, call.id, { total: professors.length, profesores: professors });
    }

    case 'buscar_profesor': {
      const nombre = toStringArgument(args.nombre) || undefined;
      const id = args.id === undefined || args.id === null ? Number.NaN : Number(args.id);

      if (!nombre && !Number.isFinite(id)) {
        return toResult(call.name, call.id, { error: 'Envía al menos nombre o id.' }, true);
      }

      const professors = await findProfessors({
        ...(nombre ? { nombre } : {}),
        ...(Number.isFinite(id) ? { id } : {}),
      });

      return toResult(call.name, call.id, {
        encontrado: professors.length > 0,
        total: professors.length,
        profesores: professors,
      });
    }

    default:
      return toResult(call.name, call.id, { error: `Herramienta desconocida: ${call.name}` }, true);
  }
}

export async function executeToolCall(call: ToolCall): Promise<ToolResult> {
  try {
    return await runTool(call);
  } catch (error) {
    if (error instanceof DataApiNotFoundError) {
      return toResult(call.name, call.id, {
        encontrado: false,
        mensaje: 'No existe ningún registro con ese identificador en la base de datos de la app.',
      });
    }

    if (error instanceof DataApiUnavailableError) {
      console.warn('[tools] Base de datos no disponible:', error.message);
      return toResult(
        call.name,
        call.id,
        { error: 'La base de datos no está disponible en este momento. Pide al usuario intentar de nuevo.' },
        true,
      );
    }

    console.error('[tools] Error inesperado ejecutando', call.name, error);
    return toResult(call.name, call.id, { error: 'Error inesperado al consultar la base de datos.' }, true);
  }
}
