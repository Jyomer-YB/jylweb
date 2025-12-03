// src/lib/openai.ts
import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI() {
  const apiKey =
    process.env.OPENAI_API_KEY ?? import.meta.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY manquant dans .env");
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
    });
  }

  return client;
}
