import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { generateReport } from "../tools/generateReport";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const reportGenerator = createReactAgent({
  llm: model,
  tools: [generateReport, createHandoffTool({ agentName: "QualityJudge", description: "Hand off to QualityJudge for evaluation." })],
  name: "ReportGenerator",
  prompt: `
    You are the ReportGenerator. Use the generateReport tool to create a report from the metrics.
    If there are feedback messages containing 'Feedback for Report #', use the latest one to improve your report.
    After producing the report, hand off to QualityJudge.
  `,
});
