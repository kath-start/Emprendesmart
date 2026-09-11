import { env } from '../../config/env.js';
import { ApiError } from '../../utils/apiError.js';

/** Llama al endpoint de chat completions de Groq (compatible con OpenAI) y devuelve el mensaje del asistente. */
export async function groqChatCompletion({ messages, tools, responseFormat, temperature = 0.3, maxTokens = 700, timeoutMs = 60_000 }) {
  if (!env.ai.groqApiKey) {
    throw ApiError.badGateway(
      'Falta configurar GROQ_API_KEY en el backend. Consigue una API key en console.groq.com/keys y agrégala a backend/.env.',
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.ai.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.ai.groqModel,
        messages,
        ...(tools ? { tools, tool_choice: 'auto' } : {}),
        ...(responseFormat ? { response_format: responseFormat } : {}),
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw ApiError.badGateway('El servicio de IA (Groq) tardó demasiado en responder.');
    }
    throw ApiError.badGateway('No se pudo conectar con el servicio de IA (Groq). Verifica tu conexión a internet.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw ApiError.badGateway('La API key de Groq (GROQ_API_KEY) es inválida o expiró.');
    }
    if (response.status === 429) {
      throw ApiError.badGateway('Se alcanzó el límite de uso de la API de Groq. Intenta de nuevo en unos minutos.');
    }
    const text = await response.text().catch(() => '');
    throw ApiError.badGateway(`El servicio de IA respondió con un error (HTTP ${response.status}).`, { body: text });
  }

  const payload = await response.json();
  const message = payload.choices?.[0]?.message;
  if (!message) {
    throw ApiError.badGateway('El servicio de IA devolvió una respuesta vacía.');
  }
  return message;
}
