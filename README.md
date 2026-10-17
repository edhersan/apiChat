# API Chat — Pokedex Expo

API Express + TypeScript que envuelve la API de Gemini con un **prompt limitador**: el asistente solo responde sobre los tres temas de la app Pokedex Expo:

1. **Pokémon** (Pokédex e Info Pokémon)
2. **Videojuegos** (Juegos e Info Juego)
3. **Profesores** (directorio de docentes)

Cualquier mensaje fuera de esos temas recibe una respuesta fija de rechazo, sin importar cómo se pida (incluye instrucciones para cambiar de rol).

- Modelo: `gemini-3.5-flash-lite` (configurable con `GEMINI_MODEL`)
- SDK: `@google/genai` (Interactions API) — la conversación se hila con `previous_interaction_id`, así que la API no guarda estado
- Autenticación: header `X-API-Key` compartido con la app

## Requisitos

- Node.js >= 20
- Una API key de Gemini: <https://aistudio.google.com/apikey>

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completa GEMINI_API_KEY y genera APP_API_KEY:
openssl rand -hex 32         # pega el resultado como APP_API_KEY
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
# {"status":"ok"}
```

Sin autenticación. Útil para monitoreo.

### `POST /chat`

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: TU_APP_API_KEY" \
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
  -H "X-API-Key: TU_APP_API_KEY" \
  -d '{"message":"¿Y sus evoluciones?","previousInteractionId":"v1_..."}'
```

| Código | Cuándo ocurre |
| --- | --- |
| 200 | Respuesta del asistente |
| 400 | Body inválido (falta `message`, excede 2000 caracteres, JSON malformado) |
| 401 | `X-API-Key` ausente o incorrecta |
| 502 | Error de Gemini (key inválida, cuota, caída del servicio) |
| 404 | Ruta inexistente |

## Uso desde la app Expo

```ts
const API_CHAT_URL = 'https://TU-PROYECTO.vercel.app';
const API_CHAT_KEY = 'TU_APP_API_KEY';

export async function enviarMensaje(message: string, previousInteractionId?: string) {
  const response = await fetch(`${API_CHAT_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_CHAT_KEY,
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
   | `APP_API_KEY` | la misma que usarás en la app Expo (`openssl rand -hex 32`) |
   | `CORS_ORIGIN` | `*` o tu(s) origen(es) separados por coma |

4. Deploy. Cada push a `main` republica producción automáticamente; los PRs generan preview deployments.

## Notas

- **CORS**: en la app nativa (Android/iOS) no aplica; en web sí. Ajusta `CORS_ORIGIN` cuando tengas el dominio final.
- **Seguridad de la key de la app**: `APP_API_KEY` viaja dentro del bundle de la app (cualquiera puede extraerla). Es aceptable para este caso; si necesitas auth real por usuario habría que agregar login + rate limiting con un store externo.
- **`GEMINI_MODEL`**: puedes cambiar de modelo sin tocar código (ej. `gemini-3.8-flash` si algún día quieres más capacidad).
