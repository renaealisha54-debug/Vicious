import 'server-only';

/**
 * One Groq client shared by every tab in the Vicious suite (Offline, Archi,
 * Spark, Script). All four previously called different providers/keys
 * (Gemini via Genkit, Gemini via raw REST, and Groq via Genkit). They now
 * all go through this single module, which reads ONE env var:
 *
 *   GROQ_API_KEY   – required, from https://console.groq.com/keys
 *   GROQ_MODEL     – optional, defaults to llama-3.3-70b-versatile
 *
 * Nothing here ever runs in the browser ('server-only' guards that), so the
 * key is never shipped to the client bundle.
 */

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

export class GroqConfigError extends Error {}

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new GroqConfigError(
      'GROQ_API_KEY is not set. Add it to your .env file (see .env.example).'
    );
  }
  return key;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqCallOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
}

async function callGroq(
  userPrompt: string,
  options: GroqCallOptions = {}
): Promise<string> {
  const apiKey = getApiKey();

  const messages: ChatMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: 'system', content: options.systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model ?? DEFAULT_MODEL,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 2048,
      ...(options.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Groq returned no content.');
  }
  return content;
}

/** Plain-text completion. Used by Offline (summarize/explain/detect) and
 * Script (error interpreter, code generator, titler). */
export async function groqText(
  userPrompt: string,
  options: GroqCallOptions = {}
): Promise<string> {
  return callGroq(userPrompt, options);
}

/** JSON-mode completion — asks Groq to return a JSON object and parses it.
 * Used by Archi (README synthesis as structured content) and Spark
 * (HTML/CSS component generation). */
export async function groqJSON<T = unknown>(
  userPrompt: string,
  options: GroqCallOptions = {}
): Promise<T> {
  const raw = await callGroq(userPrompt, { ...options, jsonMode: true });
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as T;
}
