import { config } from '../config.js';

export class DataApiNotFoundError extends Error {
  constructor(url: string) {
    super(`NOT_FOUND: ${url}`);
    this.name = 'DataApiNotFoundError';
  }
}

export class DataApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataApiUnavailableError';
  }
}

export interface PokemonListItem {
  id: number;
  name: string;
}

export interface PokemonDetail extends PokemonListItem {
  height_m: number | null;
  weight_kg: number | null;
  moves: string[];
}

export interface GameInfo {
  title: string;
  short_description: string | null;
  description: string | null;
  publisher: string | null;
  developer: string | null;
  genre: string | null;
  platform: string | null;
  release_date: string | null;
  minimum_system_requirements: Record<string, string> | null;
}

export interface Professor {
  id: number;
  nombre: string;
  apellido: string;
  resumen: string;
  titulos: string;
  experiencia_laboral: string;
  url_imagen: string;
}

export interface ProfessorSummary {
  id: number;
  nombre: string;
  apellido: string;
}

export interface CatalogIndex {
  pokemon: PokemonListItem[] | null;
  games: string[] | null;
  professors: ProfessorSummary[] | null;
}

const MAX_MOVES = 60;
const MAX_DESCRIPTION_LENGTH = 1500;
const MAX_TEXT_LENGTH = 2000;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.dataApiTimeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 404) {
      throw new DataApiNotFoundError(url);
    }

    if (!response.ok) {
      throw new DataApiUnavailableError(`HTTP ${response.status} en ${url}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DataApiNotFoundError || error instanceof DataApiUnavailableError) {
      throw error;
    }

    console.warn('[catalog] Error consultando', url, error);
    throw new DataApiUnavailableError(`No se pudo consultar ${url}`);
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(value: string | null | undefined): string | null {
  if (!value) return null;

  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value: string | null, max: number): string | null {
  if (value === null || value.length <= max) return value;
  return `${value.slice(0, max).trimEnd()}…`;
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export async function listPokemon(): Promise<PokemonListItem[]> {
  const data = await fetchJson<unknown>(`${config.pokemonApiUrl}/pokemon`);

  if (!Array.isArray(data)) {
    throw new DataApiUnavailableError('Respuesta inválida de la API de Pokémon');
  }

  return data
    .filter((item): item is { id: number; name: string } => (
      typeof item === 'object' && item !== null
      && typeof (item as { id?: unknown }).id === 'number'
      && typeof (item as { name?: unknown }).name === 'string'
    ))
    .map((item) => ({ id: item.id, name: item.name }));
}

export async function getPokemon(identifier: string): Promise<PokemonDetail> {
  const data = await fetchJson<Record<string, unknown>>(
    `${config.pokemonApiUrl}/pokemon/${encodeURIComponent(identifier)}`,
  );

  const moves = Array.isArray(data.moves)
    ? (data.moves as unknown[]).filter((move): move is string => typeof move === 'string')
    : [];

  return {
    id: toNumber(data.id) ?? 0,
    name: typeof data.name === 'string' ? data.name : identifier,
    height_m: toNumber(data.height_m),
    weight_kg: toNumber(data.weight_kg),
    moves: moves.slice(0, MAX_MOVES),
  };
}

export async function listGames(): Promise<string[]> {
  const data = await fetchJson<unknown>(`${config.gamesApiUrl}/games`);

  if (!Array.isArray(data)) {
    throw new DataApiUnavailableError('Respuesta inválida de la API de juegos');
  }

  return data.filter((title): title is string => typeof title === 'string');
}

export async function getGame(identifier: string): Promise<GameInfo> {
  const data = await fetchJson<Record<string, unknown>>(
    `${config.gamesApiUrl}/games/${encodeURIComponent(identifier)}/info`,
  );

  return {
    title: typeof data.title === 'string' ? data.title : identifier,
    short_description: stripHtml(typeof data.short_description === 'string' ? data.short_description : null),
    description: truncate(
      stripHtml(typeof data.description === 'string' ? data.description : null),
      MAX_DESCRIPTION_LENGTH,
    ),
    publisher: typeof data.publisher === 'string' ? data.publisher : null,
    developer: typeof data.developer === 'string' ? data.developer : null,
    genre: typeof data.genre === 'string' ? data.genre : null,
    platform: typeof data.platform === 'string' ? data.platform : null,
    release_date: typeof data.release_date === 'string' ? data.release_date : null,
    minimum_system_requirements:
      typeof data.minimum_system_requirements === 'object' && data.minimum_system_requirements !== null
        ? (data.minimum_system_requirements as Record<string, string>)
        : null,
  };
}

export async function listProfessors(): Promise<Professor[]> {
  const data = await fetchJson<unknown>(`${config.profesoresApiUrl}/api/profesores`);

  if (!Array.isArray(data)) {
    throw new DataApiUnavailableError('Respuesta inválida de la API de profesores');
  }

  return data
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      id: toNumber(item.id) ?? 0,
      nombre: typeof item.nombre === 'string' ? item.nombre : '',
      apellido: typeof item.apellido === 'string' ? item.apellido : '',
      resumen: truncate(typeof item.resumen === 'string' ? item.resumen : '', MAX_TEXT_LENGTH) ?? '',
      titulos: truncate(typeof item.titulos === 'string' ? item.titulos : '', MAX_TEXT_LENGTH) ?? '',
      experiencia_laboral:
        truncate(typeof item.experiencia_laboral === 'string' ? item.experiencia_laboral : '', MAX_TEXT_LENGTH) ?? '',
      url_imagen: typeof item.url_imagen === 'string' ? item.url_imagen : '',
    }));
}

export async function findProfessors(query: { id?: number; nombre?: string }): Promise<Professor[]> {
  const professors = await listProfessors();

  if (typeof query.id === 'number') {
    return professors.filter((professor) => professor.id === query.id);
  }

  const search = normalizeText(query.nombre?.trim() ?? '');
  if (!search) {
    return [];
  }

  const tokens = search.split(/\s+/).filter(Boolean);

  return professors.filter((professor) => {
    const haystack = normalizeText(`${professor.nombre} ${professor.apellido}`);
    return tokens.every((token) => haystack.includes(token));
  });
}

const FAILED_SECTION_TTL_MS = 30_000;

let cachedIndex: { data: CatalogIndex; expiresAt: number } | null = null;
let inflightIndex: Promise<CatalogIndex> | null = null;

function sectionFailure(section: string) {
  return (error: unknown) => {
    console.warn(
      `[catalog] No se pudo cargar la sección "${section}" del índice:`,
      error instanceof Error ? error.message : error,
    );
    return null;
  };
}

async function loadCatalogIndex(): Promise<CatalogIndex> {
  const [pokemon, games, professors] = await Promise.all([
    listPokemon().catch(sectionFailure('pokémon')),
    listGames().catch(sectionFailure('juegos')),
    listProfessors().catch(sectionFailure('profesores')),
  ]);

  return {
    pokemon,
    games,
    professors: professors?.map(({ id, nombre, apellido }) => ({ id, nombre, apellido })) ?? null,
  };
}

export async function getCatalogIndex(): Promise<CatalogIndex> {
  const now = Date.now();

  if (cachedIndex && cachedIndex.expiresAt > now) {
    return cachedIndex.data;
  }

  inflightIndex ??= loadCatalogIndex()
    .then((data) => {
      const allLoaded = data.pokemon !== null && data.games !== null && data.professors !== null;
      cachedIndex = {
        data,
        expiresAt: Date.now() + (allLoaded ? config.catalogIndexTtlMs : FAILED_SECTION_TTL_MS),
      };
      return data;
    })
    .finally(() => {
      inflightIndex = null;
    });

  return inflightIndex;
}
