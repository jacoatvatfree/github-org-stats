import Fastify from "fastify";
import cors from "@fastify/cors";

const fastify = Fastify({
  logger: true,
});

// Enable CORS
await fastify.register(cors, {
  origin: true,
});

// AI Summary endpoint
fastify.post("/api/ai-summary", async (request, reply) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return reply.code(404).send({ error: "AI summary not configured" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: `Given this GitHub organization data, write a 2-3 sentence summary highlighting the most significant metrics and trends. Focus on activity level and growth:
            ${JSON.stringify(request.body)}`,
          },
        ],
      }),
    });

    const result = await response.json();
    return { summary: result.content[0].text };
  } catch (error) {
    request.log.error("Failed to generate summary:", error);
    return reply.code(500).send({ error: "Failed to generate summary" });
  }
});

try {
  await fastify.listen({ port: 3001 });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
