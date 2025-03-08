import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

const analysisSchema = z.object({
  patterns: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
});

export const analyzeTranscript = tool(
  async ({ transcript }: { transcript: string }) => {
    const prompt = `
      Analyze the following interview transcript and identify:
      - Patterns (e.g., filler words, pacing, repetition)
      - Strengths (e.g., clarity, confidence, detail)
      - Weaknesses (e.g., hesitation, vagueness, lack of structure)
      Return your analysis as a JSON object with keys "patterns", "strengths", and "weaknesses", each containing an array of strings.

      Transcript: "${transcript}"
    `;

    const response = await model.invoke(prompt);
    let content = response.content as string;
    content = content.replace(/```json\n|\n```/g, "").trim();
    try {
      const parsed = JSON.parse(content);
      analysisSchema.parse(parsed);
      return `Analysis Output: ${JSON.stringify(parsed)}`;
    } catch (error) {
      throw new Error(`Invalid LLM response: ${content}`);
    }
  },
  {
    name: "analyze_transcript",
    description: "Analyze an interview transcript using the LLM to identify patterns, strengths, and weaknesses",
    schema: z.object({ transcript: z.string() }),
  }
);
