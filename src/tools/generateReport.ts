import { z } from "zod";
import { tool } from "@langchain/core/tools";

const reportSchema = z.object({
  humanReadable: z.string(),
  structuredData: z.object({
    forLearningPath: z.object({
      skills: z.object({
        communication: z.number().min(0).max(10),
        problemSolving: z.number().min(0).max(10),
      }),
      gaps: z.array(z.string()),
    }),
  }),
});

export const generateReport = tool(
  async ({ metricsData }: { metricsData: string }) => {
    const data = JSON.parse(metricsData);
    const humanReadable = `
  **Performance Report**
  
  **Summary**
  - Communication Score: ${data.skills.communication}/10
  - Problem Solving Score: ${data.skills.problemSolving}/10
  
  **Skill Gaps**
  - ${data.gaps.join("\n- ")}
  
  **Recommendations**
  - Focus on reducing filler words to improve communication fluency.
  - Practice structured responses to minimize hesitation.
  - Provide specific examples to enhance clarity.
      `.trim();
    const structuredData = { forLearningPath: data };
    const report = { humanReadable, structuredData };
    return JSON.stringify(report);
  },
  {
    name: "generate_report",
    description: "Generate a human-readable report and structured data from performance metrics",
    schema: z.object({ metricsData: z.string() }),
  }
);
