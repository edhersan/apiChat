export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API Chat — Pokedex Expo',
    version: '1.0.0',
    description:
      'API de chat con Gemini limitada a los temas de la app Pokedex Expo: Pokémon, videojuegos y profesores. Cualquier mensaje fuera de esos temas recibe una respuesta fija de rechazo. La conversación se hila enviando el interactionId de cada respuesta como previousInteractionId en el siguiente mensaje.',
  },
  paths: {
    '/': {
      get: {
        summary: 'Información de la API',
        description: 'Lista de endpoints disponibles.',
        responses: {
          200: {
            description: 'Información de bienvenida',
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Estado del servicio',
        description:
          'Sin autenticación. Útil para monitoreo. geminiConfigured indica si GEMINI_API_KEY está configurada en el servidor.',
        responses: {
          200: {
            description: 'Servicio operativo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/chat': {
      post: {
        summary: 'Enviar un mensaje al asistente',
        description:
          'El asistente solo responde sobre Pokémon, videojuegos del catálogo de la app y el directorio de profesores. Para continuar una conversación, envía el interactionId recibido como previousInteractionId.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' },
              example: { message: '¿Qué sabes de Pikachu?' },
            },
          },
        },
        responses: {
          200: {
            description: 'Respuesta del asistente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatResponse' },
                example: {
                  reply: 'Pikachu es el Pokémon ratón de tipo eléctrico, conocido por sus mejillas que almacenan electricidad. Es la mascota de la franquicia y evoluciona a Raichu con una piedra trueno.',
                  interactionId: 'v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg',
                },
              },
            },
          },
          400: {
            description: 'Body inválido: falta message, supera 2000 caracteres o el JSON está malformado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: 'INVALID_BODY',
                  message: 'El campo "message" es obligatorio y no puede estar vacío.',
                },
              },
            },
          },
          502: {
            description: 'Error de Gemini: key inválida, cuota agotada o servicio caído',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: 'GEMINI_ERROR',
                  message: 'No se pudo obtener respuesta del asistente. Intenta de nuevo.',
                },
              },
            },
          },
          503: {
            description: 'El servidor no tiene GEMINI_API_KEY configurada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
                example: {
                  error: 'GEMINI_NOT_CONFIGURED',
                  message: 'Falta configurar GEMINI_API_KEY en las variables de entorno del servidor.',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ChatRequest: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            maxLength: 2000,
            description: 'Mensaje del usuario. Solo se responde sobre Pokémon, videojuegos y profesores.',
            example: '¿Qué sabes de Pikachu?',
          },
          previousInteractionId: {
            type: 'string',
            description:
              'interactionId de la respuesta anterior, para continuar la conversación con contexto.',
            example: 'v1_ChdPU0F4YWFtNkFwS2kxZThQZ05lbXdROBIXT1NBeGFhbTZBcEtpMWU4UGdOZW13UTg',
          },
        },
      },
      ChatResponse: {
        type: 'object',
        properties: {
          reply: {
            type: 'string',
            description: 'Respuesta del asistente en español.',
          },
          interactionId: {
            type: 'string',
            description: 'Identificador de la interacción. Envíalo como previousInteractionId en el siguiente mensaje.',
          },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          geminiConfigured: {
            type: 'boolean',
            description: 'true si GEMINI_API_KEY está configurada en el servidor.',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', description: 'Código de error.' },
          message: { type: 'string', description: 'Descripción legible del error.' },
        },
      },
    },
  },
};

export const docsHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>API Chat — Docs</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({ url: '/openapi.json', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`;
