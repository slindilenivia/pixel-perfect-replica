import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { createGateway, describeAiError, reasoningOptions } from "@/lib/ai/gateway.server";
import { withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id.server";
import { CHAT_INSTRUCTIONS } from "@/lib/ai/prompts";

async function handleChat(request: Request) {
  let body: { messages?: UIMessage[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-60) : [];
  if (messages.length === 0) return Response.json({ error: "No messages" }, { status: 400 });

  const { model, runIdFetch } = createGateway(request);
  const result = streamText({
    model,
    instructions: CHAT_INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
    abortSignal: request.signal,
    providerOptions: reasoningOptions("medium"),
  });

  return withLovableAiGatewayRunIdHeader(
    result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      onError: (error) => {
        console.error("chat error", error);
        return describeAiError(error).message;
      },
    }),
    runIdFetch,
  );
}

export const Route = createFileRoute("/api/chat")({
  server: { handlers: { POST: ({ request }) => handleChat(request) } },
});
