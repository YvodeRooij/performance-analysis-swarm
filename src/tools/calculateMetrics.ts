import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

const metricsSchema = z.object({
  skills: z.object({
    communication: z.number().min(0).max(10),
    problemSolving: z.number().min(0).max(10),
  }),
  gaps: z.array(z.string()),
});

export const calculateMetrics = tool(
  async ({ analyzedData }: { analyzedData: string }) => {
    const prompt = `
      Given the following analysis of an interview transcript, calculate performance metrics:
      - Assign scores (0-10) for "communication" and "problemSolving" based on the patterns, strengths, and weaknesses.
      - Identify skill gaps (e.g., areas needing improvement) as an array of strings.
      Return your result as a JSON object with keys "skills" (containing "communication" and "problemSolving" scores) and "gaps".

      Analysis: ${analyzedData}
    `;

    const response = await model.invoke(prompt);
    let content = response.content as string;
    content = content.replace(/```json\n|\n```/g, "").trim();
    try {
      const parsed = JSON.parse(content);
      metricsSchema.parse(parsed);
      return `Metrics Output: ${JSON.stringify(parsed)}`;
    } catch (error) {
      throw new Error(`Invalid LLM response: ${content}`);
    }
  },
  {
    name: "calculate_metrics",
    description: "Calculate performance metrics from analyzed data",
    schema: z.object({ analyzedData: z.string() }),
  }
);
