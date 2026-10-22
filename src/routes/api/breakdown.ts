import { createFileRoute } from "@tanstack/react-router";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";

import { createGateway, describeAiError, reasoningOptions } from "@/lib/ai/gateway.server";
import { BREAKDOWN_INSTRUCTIONS } from "@/lib/ai/prompts";

const bodySchema = z.object({
  goal: z.string().trim().min(3).max(1000),
  deadline: z.string().max(20).nullable().optional(),
});

const outputSchema = z.object({
  subtasks: z.array(
    z.object({
      title: z.string(),
      priority: z.enum(["low", "medium", "high"]),
      dayOffset: z.number(),
    }),
  ),
});

async function handleBreakdown(request: Request) {
  let parsed;
  try {
    parsed = bodySchema.safeParse(await request.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!parsed.success) return Response.json({ error: "Describe your goal in a few words first." }, { status: 400 });
  const { goal, deadline } = parsed.data;

  const { model } = createGateway(request);
  const today = new Date().toISOString().slice(0, 10);
  try {
    const result = streamText({
      model,
      instructions: `${BREAKDOWN_INSTRUCTIONS}\nToday's date is ${today}.`,
      prompt: `Goal: ${goal}\nDeadline: ${deadline || "none"}`,
      output: Output.object({ schema: outputSchema }),
      abortSignal: request.signal,
      providerOptions: reasoningOptions("low"),
    });
    const output = await result.output;
    const subtasks = output.subtasks.slice(0, 8).map((s) => ({
      title: s.title.trim().slice(0, 120),
      priority: s.priority,
      dayOffset: Math.max(0, Math.min(90, Math.round(s.dayOffset))),
    }));
    return Response.json({ subtasks });
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return Response.json({ error: "The AI couldn't structure that goal. Try describing it differently." }, { status: 502 });
    }
    console.error("breakdown error", error);
    const { status, message } = describeAiError(error);
    return Response.json({ error: message }, { status });
  }
}

export const Route = createFileRoute("/api/breakdown")({
  server: { handlers: { POST: ({ request }) => handleBreakdown(request) } },
});
