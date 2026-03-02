// src/app/api/chat/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { TUTOR_MODE_PROMPT, QUIZ_MODE_PROMPT, SCENARIO_MODE_PROMPT, REFERENCE_MODE_PROMPT } from "../../lib/prompts";
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PROMPT_MAP: Record<string, string> = {
  tutor: TUTOR_MODE_PROMPT,
  quiz: QUIZ_MODE_PROMPT,
  scenario: SCENARIO_MODE_PROMPT,
  reference: REFERENCE_MODE_PROMPT,
};

export async function POST(request: Request) {
  try {
    const { messages, mode = "tutor" } = await request.json();

    const systemPrompt = PROMPT_MAP[mode] || TUTOR_MODE_PROMPT;

    // For quiz mode, we don't stream — we need the full JSON response
    if (mode === "quiz") {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 2000,
        system: systemPrompt,
        messages: messages,
        temperature: 0.4,
      });

      const textContent = response.content.find((block) => block.type === "text");
      const text = textContent ? textContent.text : "";

      return Response.json({ content: text });
    }

    // For all other modes, stream the response
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 4000,
      system: systemPrompt,
      messages: messages,
      temperature: 0.3,
    });

    // Create a ReadableStream that sends chunks as they arrive
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              controller.enqueue(new TextEncoder().encode(chunk));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error: unknown) {
    console.error("API error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return Response.json({ error: message }, { status: 500 });
  }
}