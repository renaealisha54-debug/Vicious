'use server';

import { groqText, groqJSON } from '@/lib/groq';

/* ---------------------------------------------------------------------- */
/* Offline: summarize / explain / detect-language                         */
/* ---------------------------------------------------------------------- */

export async function summarizeText(text: string): Promise<string> {
  return groqText(text, {
    systemPrompt:
      'Summarize the following text concisely and accurately. Focus on the main points and omit any extraneous details.',
  });
}

export async function explainCodeSnippet(codeSnippet: string): Promise<string> {
  return groqText(codeSnippet, {
    systemPrompt:
      'You are an AI assistant specialized in explaining code snippets clearly and concisely for someone reading the code for the first time. Explain functionality and purpose in a way that is easy for developers to understand.',
  });
}

export async function detectLanguage(text: string): Promise<string> {
  return groqText(text, {
    systemPrompt:
      'You are an expert language classifier. Analyze the content and respond with only the name of the programming language or text type (e.g. "JavaScript", "Python", "Markdown", "Plain Text"). No other words.',
    temperature: 0,
    maxTokens: 16,
  });
}

/* ---------------------------------------------------------------------- */
/* Archi: README synthesis                                                */
/* ---------------------------------------------------------------------- */

export async function generateCodebaseReadme(
  codebaseDescription: string
): Promise<string> {
  return groqText(codebaseDescription, {
    systemPrompt: `You are an expert software engineer and technical writer.
Generate a comprehensive, developer-friendly README.md for the codebase described in the user message.

The README must include:
1. A clear project title and one-sentence description
2. Key features (bullet list)
3. Tech stack / dependencies
4. Getting started: prerequisites, install, env setup, run instructions
5. Project structure overview
6. How to use / contribute (if relevant)

Use clean Markdown. Be concise but complete. Do not invent features not evidenced in the code. Return only the Markdown content, nothing else.`,
    maxTokens: 3000,
  });
}

/* ---------------------------------------------------------------------- */
/* Spark: HTML/CSS component generator                                    */
/* ---------------------------------------------------------------------- */

interface SparkComponent {
  html: string;
  css: string;
}

export async function generateComponentCode(
  description: string
): Promise<SparkComponent> {
  try {
    const result = await groqJSON<SparkComponent>(description, {
      systemPrompt: `You are an expert HTML/CSS developer. Generate clean, modern HTML and CSS for the component description given by the user.
Return ONLY a JSON object with two fields: "html" and "css". No markdown, no explanation, just the JSON.

Rules:
- HTML should be self-contained, no external dependencies
- CSS should use class names prefixed with "spark-" to avoid conflicts
- Use CSS variables for colors where possible
- Make it responsive`,
      temperature: 0.7,
      maxTokens: 2048,
    });
    if (typeof result.html !== 'string' || typeof result.css !== 'string') {
      throw new Error('Malformed response');
    }
    return result;
  } catch (err) {
    return {
      html: `<div class="spark-error"><p>Could not generate component.</p><pre>${
        err instanceof Error ? err.message : 'Unknown error'
      }</pre></div>`,
      css: '.spark-error { padding: 1rem; background: #fee2e2; border-radius: 8px; font-family: monospace; color: #7f1d1d; }',
    };
  }
}

/* ---------------------------------------------------------------------- */
/* Script: AI error interpreter / code generator / titler                 */
/* ---------------------------------------------------------------------- */

export async function aiErrorInterpreter(
  code: string,
  errorMessage: string
): Promise<string> {
  return groqText(
    `Code:\n\`\`\`javascript\n${code}\n\`\`\`\n\nError:\n${errorMessage}`,
    {
      systemPrompt:
        'You are an expert JavaScript debugger. Given a code snippet and the error it produced, explain in plain language what went wrong and suggest an actionable fix. Be concise.',
      maxTokens: 1024,
    }
  );
}

export async function aiCodeGenerator(description: string): Promise<string> {
  return groqText(description, {
    systemPrompt:
      'You are an expert JavaScript developer. Generate a clean, runnable, well-commented JavaScript code snippet based on the description. Only return the code, no explanations or markdown fences outside the code.',
    maxTokens: 1024,
  });
}

export async function aiTitler(code: string): Promise<string> {
  const result = await groqText(code, {
    systemPrompt:
      'Suggest a short, "viciously" cool title (max 6 words) for the given JavaScript script, based on what it does. Respond with only the title, no quotes, no punctuation at the end.',
    temperature: 0.8,
    maxTokens: 24,
  });
  return result.trim();
}
