import express from "express";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

router.post("/api/ai-summary", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(404).json({ error: "AI summary not configured" });
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
            ${JSON.stringify(req.body)}`,
          },
        ],
      }),
    });

    const result = await response.json();
    res.json({ summary: result.content[0].text });
  } catch (error) {
    console.error("Failed to generate summary:", error);
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
