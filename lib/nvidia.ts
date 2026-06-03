import OpenAI from "openai";

/**
 * NVIDIA NIM exposes an OpenAI-compatible API, so we drive it with the
 * official `openai` client pointed at NVIDIA's base URL. The key stays
 * server-side — this module must only ever be imported from server code.
 */
let client: OpenAI | null = null;

export function nvidia(): OpenAI {
  if (!process.env.NVIDIA_API_KEY) {
    throw new Error(
      "NVIDIA_API_KEY is not set. Add it to .env (local) or your Vercel project environment variables."
    );
  }
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      // The shared NVIDIA build endpoint is rate-limited and has variable
      // latency. The SDK's default 2 retries (with exponential backoff) can
      // turn a single 429 into a multi-minute hang, so we fail fast instead
      // and let the panel degrade gracefully.
      maxRetries: 1,
    });
  }
  return client;
}

interface CompletionOpts {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  maxTokens?: number;
  /** Hard wall-clock timeout for this single call, in ms. */
  timeoutMs?: number;
}

/**
 * Run a single chat completion and return the raw text. We keep temperature
 * moderate so reviews read like considered human judgement rather than either
 * robotic boilerplate or wild speculation.
 */
export async function complete({
  model,
  system,
  user,
  temperature = 0.5,
  maxTokens = 2400,
  timeoutMs = 90_000,
}: CompletionOpts): Promise<string> {
  const res = await nvidia().chat.completions.create(
    {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    },
    { timeout: timeoutMs, signal: AbortSignal.timeout(timeoutMs) }
  );
  return res.choices[0]?.message?.content ?? "";
}

/**
 * Models vary in how cleanly they emit JSON — some wrap it in ```json fences,
 * some add a sentence of preamble, some (reasoning models) prepend <think>.
 * This pulls the first balanced JSON object out of the text.
 */
export function extractJson<T>(text: string): T {
  let s = text.trim();

  // Strip reasoning blocks some models emit.
  s = s.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // Strip markdown code fences.
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  // Find the first '{' and walk to its matching '}'.
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model output.");

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        const candidate = s.slice(start, i + 1);
        return JSON.parse(candidate) as T;
      }
    }
  }
  throw new Error("Could not parse a complete JSON object from model output.");
}
