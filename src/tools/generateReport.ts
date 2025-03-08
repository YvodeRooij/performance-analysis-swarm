import { z } from "zod";
import { tool } from "@langchain/core/tools";

export const generateReport = tool(
  async ({ metricsData }: { metricsData: string }) => {
    const data = JSON.parse(metricsData);
    const humanReadable = `Performance Report:
- Communication Score: ${data.skills.communication}/10
- Problem Solving Score: ${data.skills.problemSolving}/10
- Skill Gaps: ${data.gaps.length > 0 ? data.gaps.join(", ") : "None identified"}`;
    const structuredData = { forLearningPath: data };
    const report = { humanReadable, structuredData };
    return `Report Output: ${JSON.stringify(report)}`;
  },
  {
    name: "generate_report",
    description: "Generate a human-readable report and structured data from metrics",
    schema: z.object({ metricsData: z.string() }),
  }
);
