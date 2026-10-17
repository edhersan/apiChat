# API Chat — Pokedex Expo

API Express + TypeScript que envuelve la API de Gemini con **grounding por function calling**: el asistente solo responde sobre los tres temas de la app Pokedex Expo, y solo con los registros que existen en las bases de datos de las otras APIs:

1. **Pokémon** (Pokédex e Info Pokémon) — `pokemon-api` (TiDB)
2. **Videojuegos** (Juegos e Info Juego) — `games-api` (MongoDB)
3. **Profesores** (directorio de docentes) — `docentes-api` (MySQL)

Cómo funciona el límite a los registros reales:

- En cada mensaje el servidor carga un índice de los registros existentes (cacheado ~5 min) y lo inyecta en el system prompt.
- El modelo cuenta con herramientas (`listar_pokemon`, `buscar_pokemon`, `listar_juegos`, `buscar_juego`, `listar_profesores`, `buscar_profesor`) que el servidor ejecuta contra las tres APIs; el modelo solo puede afirmar datos que provengan de esas consultas.
- Si el usuario pide un Pokémon, juego o profesor que no está en las bases de datos (p. ej. Charizard), el asistente lo niega y sugiere los que sí existen.
- Si una de las APIs de datos está caída, el asistente lo indica y pide reintentar.

Cualquier mensaje fuera de esos tres temas recibe una respuesta fija de rechazo, sin importar cómo se pida (incluye instrucciones para cambiar de rol).

- Modelo: `gemini-3.5-flash-lite` (configurable con `GEMINI_MODEL`)
- SDK: `@google/genai` (Interactions API) — la conversación se hila con `previous_interaction_id`, así que la API no guarda estado
- Sin autenticación: API abierta (proyecto académico); la key de Gemini vive solo en el servidor
- Documentación interactiva: Swagger UI en `/docs` (spec OpenAPI en `/openapi.json`)

## Requisitos

- Node.js >= 20
- Una API key de Gemini: <https://aistudio.google.com/apikey>

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa GEMINI_API_KEY (https://aistudio.google.com/apikey)
npm run dev                  # http://localhost:3000
```

Alternativa con paridad total a producción (Vercel CLI):

```bash
vercel link                  # vincula el proyecto (una sola vez)
vercel env pull .env.local   # trae las variables del dashboard
vercel dev                   # http://localhost:3000
```

## Endpoints

### `GET /health`

```bash
curl http://localhost:3000/health
# {"status":"ok","geminiConfigured":true}
```

Útil para monitoreo.

### `POST /chat`

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Qué sabes de Pikachu?"}'
```

Respuesta:

```json
{
  "reply": "Pikachu es el Pokémon ratón eléctrico...",
  "interactionId": "v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg"
}
```

Para continuar la conversación, envía el `interactionId` recibido como `previousInteractionId` en el siguiente mensaje:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"¿Y sus evoluciones?","previousInteractionId":"v1_..."}'
```

| Código | Cuándo ocurre |
| --- | --- |
| 200 | Respuesta del asistente |
| 400 | Body inválido (falta `message`, excede 2000 caracteres, JSON malformado) |
| 502 | Error de Gemini (key inválida, cuota, caída del servicio) |
| 503 | Falta `GEMINI_API_KEY` en el servidor (confírmalo en `/health` con `geminiConfigured`) |
| 404 | Ruta inexistente |

### `GET /docs`

Documentación interactiva (Swagger UI) generada desde la spec OpenAPI. Incluye botón **Try it out** para probar `POST /chat` desde el navegador.

```bash
curl http://localhost:3000/openapi.json   # la spec en JSON
```

## Uso desde la app Expo

```ts
const API_CHAT_URL = 'https://TU-PROYECTO.vercel.app';

export async function enviarMensaje(message: string, previousInteractionId?: string) {
  const response = await fetch(`${API_CHAT_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, previousInteractionId }),
  });

  if (!response.ok) {
    throw new Error(`API_CHAT_${response.status}`);
  }

  return response.json() as Promise<{ reply: string; interactionId?: string }>;
}
```

Guarda el `interactionId` de cada respuesta y reenvíalo en el siguiente mensaje para que Gemini recuerde el hilo de la conversación.

## Despliegue: GitHub → Vercel

Vercel detecta Express automáticamente (zero-config): el archivo `src/index.ts` exporta la app como default export y se despliega como una sola Vercel Function. No se necesita `vercel.json` ni build command.

1. Sube el repo a GitHub (tú ejecutas estos comandos):

   ```bash
   git init
   git add .
   git commit -m "API chat con Gemini limitada a temas de la app"
   git remote add origin git@github.com:TU_USUARIO/apiChat.git
   git push -u origin main
   ```

2. En Vercel: **Add New → Project → Import Git Repository** → selecciona `apiChat`.
   Framework preset: se detecta solo. Sin build command ni output directory.

3. **Environment Variables** (marca Production y Preview):

   | Variable | Valor |
   | --- | --- |
   | `GEMINI_API_KEY` | tu key de AI Studio |
   | `CORS_ORIGIN` | `*` o tu(s) origen(es) separados por coma |

   Opcionales (tienen valores por defecto):

   | Variable | Default |
   | --- | --- |
   | `POKEMON_API_URL` | `https://pokemon-api-edhersan.vercel.app` |
   | `GAMES_API_URL` | `https://games-api-iota.vercel.app` |
   | `PROFESORES_API_URL` | `https://docentes-api.vercel.app` |
   | `DATA_API_TIMEOUT_MS` | `8000` |
   | `CATALOG_INDEX_TTL_MS` | `300000` |

4. Deploy. Cada push a `main` republica producción automáticamente; los PRs generan preview deployments.

## Notas

- **CORS**: en la app nativa (Android/iOS) no aplica; en web sí. Ajusta `CORS_ORIGIN` cuando tengas el dominio final.
- **API abierta**: sin autenticación por ser un proyecto académico. La `GEMINI_API_KEY` vive solo en el servidor; si el proyecto crece, considera agregar auth y rate limiting.
- **`GEMINI_MODEL`**: puedes cambiar de modelo sin tocar código (ej. `gemini-3.8-flash` si algún día quieres más capacidad). El modelo debe soportar **function calling**, porque el asistente consulta las APIs de datos con herramientas.
- **APIs de datos**: las URLs por defecto apuntan a los despliegues actuales de `pokemon-api`, `games-api` y `docentes-api`; cámbialas con las variables de entorno si mueves esos proyectos.
- **Índice de catálogo**: se cachea en memoria ~5 min (por instancia). Si una API falla, esa sección queda marcada como no disponible y se reintenta ~30 s después; el asistente no inventa registros de esa sección.
