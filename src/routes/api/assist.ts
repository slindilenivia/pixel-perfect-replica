import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { z } from "zod";

import { createGateway, describeAiError, reasoningOptions } from "@/lib/ai/gateway.server";
import { ASSIST_INSTRUCTIONS, ASSIST_MODES } from "@/lib/ai/prompts";

const bodySchema = z.object({
  mode: z.enum(ASSIST_MODES),
  input: z.string().trim().min(1).max(8000),
  context: z.string().max(8000).optional(),
});

/**
 * Streams plain text for the planner and research tools.
 * Waits for the first token so gateway failures return a real HTTP status + JSON error.
 */
async function handleAssist(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "Please enter some text first." }, { status: 400 });
  const { mode, input, context } = parsed.data;

  const { model } = createGateway(request);
  const today = new Date().toISOString().slice(0, 10);
  const prompt = context ? `${input}\n\n---\nContext:\n${context}` : input;

  const result = streamText({
    model,
    instructions: `${ASSIST_INSTRUCTIONS[mode]}\nToday's date is ${today}.`,
    prompt,
    abortSignal: request.signal,
    providerOptions: reasoningOptions("low"),
  });

  const iterator = result.fullStream[Symbol.asyncIterator]();
  let first = "";
  try {
    while (true) {
      const { value, done } = await iterator.next();
      if (done) break;
      if (value.type === "error") throw value.error;
      if (value.type === "text-delta" && value.text) {
        first = value.text;
        break;
      }
    }
  } catch (error) {
    console.error("assist error", error);
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
  if (!first) return Response.json({ error: "The AI returned an empty answer. Try rephrasing." }, { status: 502 });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(first));
      try {
        while (true) {
          const { value, done } = await iterator.next();
          if (done) break;
          if (value.type === "text-delta") controller.enqueue(encoder.encode(value.text));
          if (value.type === "error") {
            controller.enqueue(encoder.encode(`\n\n_${describeAiError(value.error).message}_`));
            break;
          }
        }
      } catch (error) {
        controller.enqueue(encoder.encode(`\n\n_${describeAiError(error).message}_`));
      }
      controller.close();
    },
    async cancel() {
      await iterator.return?.();
    },
  });

  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8" } });
}

export const Route = createFileRoute("/api/assist")({
  server: { handlers: { POST: ({ request }) => handleAssist(request) } },
});
