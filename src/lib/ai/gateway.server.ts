import { createOpenAI } from "@ai-sdk/openai";
import { APICallError } from "ai";

import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId } from "./run-id.server";

export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
export const CHAT_MODEL = "openai/gpt-6-astra";

/** Creates a request-scoped Responses provider for the Lovable AI Gateway. */
export function createGateway(request: Request) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  return { model: provider.responses(CHAT_MODEL), runIdFetch };
}

export function reasoningOptions(effort: "low" | "medium") {
  return {
    openai: {
      forceReasoning: true,
      reasoningEffort: effort,
      reasoningSummary: "auto",
      store: false,
      include: ["reasoning.encrypted_content"],
    },
  };
}

/** Maps gateway failures to a status + message safe to show in the UI. */
export function describeAiError(error: unknown): { status: number; message: string } {
  const status = APICallError.isInstance(error) ? (error.statusCode ?? 500) : 500;
  if (status === 402)
    return {
      status,
      message: "AI credits have run out for this workspace. Add credits in Lovable to keep using AI features.",
    };
  if (status === 429) return { status, message: "Too many AI requests right now. Please wait a moment and try again." };
  if (status === 403)
    return { status, message: "AI access is currently blocked for this workspace. A workspace admin can check AI settings." };
  if (status === 401) return { status, message: "AI is not configured correctly. Please contact the app owner." };
  if (status === 400) return { status, message: "That request couldn't be processed. Try shortening or rephrasing it." };
  if (error instanceof Error && error.name === "AbortError") return { status: 499, message: "Stopped." };
  return { status, message: "The AI service had a problem. Please try again in a moment." };
}
