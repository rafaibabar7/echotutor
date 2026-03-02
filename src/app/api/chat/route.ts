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
    // RETRY LOGIC: If Claude returns malformed JSON, we retry up to 2 more times.
    // This handles the ~5% of responses where Claude wraps JSON in markdown or adds preamble.
    if (mode === "quiz") {
      const MAX_RETRIES = 2;
      let lastError = "";

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 2000,
            system: systemPrompt,
            messages: messages,
            temperature: 0.4,
          });

          const textContent = response.content.find(
            (block) => block.type === "text"
          );
          const text = textContent ? textContent.text : "";

          if (!text) {
            throw new Error("Empty response from Claude");
          }

          // Clean markdown fences if present, then parse
          const cleaned = text
            .replace(/```json\s*/g, "")
            .replace(/```\s*/g, "")
            .trim();

          const jsonStart = cleaned.indexOf("{");
          const jsonEnd = cleaned.lastIndexOf("}");

          if (jsonStart === -1 || jsonEnd === -1) {
            throw new Error("No JSON object found in response");
          }

          const jsonString = cleaned.substring(jsonStart, jsonEnd + 1);
          JSON.parse(jsonString); // Validate it's valid JSON — throws if not

          return Response.json({ content: jsonString });
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Unknown error";
          console.warn(`Quiz attempt ${attempt + 1} failed: ${lastError}`);

          if (attempt === MAX_RETRIES) {
            return Response.json(
              { error: `Failed to generate quiz after ${MAX_RETRIES + 1} attempts: ${lastError}` },
              { status: 422 }
            );
          }

          // Brief pause before retry
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
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