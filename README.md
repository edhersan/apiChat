# API Chat — Pokedex Expo

API Express + TypeScript que envuelve la API de Gemini con un **prompt limitador**: el asistente solo responde sobre los tres temas de la app Pokedex Expo:

1. **Pokémon** (Pokédex e Info Pokémon)
2. **Videojuegos** (Juegos e Info Juego)
3. **Profesores** (directorio de docentes)

Cualquier mensaje fuera de esos temas recibe una respuesta fija de rechazo, sin importar cómo se pida (incluye instrucciones para cambiar de rol).

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

4. Deploy. Cada push a `main` republica producción automáticamente; los PRs generan preview deployments.

## Notas

- **CORS**: en la app nativa (Android/iOS) no aplica; en web sí. Ajusta `CORS_ORIGIN` cuando tengas el dominio final.
- **API abierta**: sin autenticación por ser un proyecto académico. La `GEMINI_API_KEY` vive solo en el servidor; si el proyecto crece, considera agregar auth y rate limiting.
- **`GEMINI_MODEL`**: puedes cambiar de modelo sin tocar código (ej. `gemini-3.8-flash` si algún día quieres más capacidad).
