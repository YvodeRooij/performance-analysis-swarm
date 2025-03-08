import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { calculateMetrics } from "../tools/calculateMetrics";

const model = new ChatOpenAI({ modelName: "o3-mini" });

export const metricsCalculator = createReactAgent({
  llm: model,
  tools: [
    calculateMetrics,
    createHandoffTool({
      agentName: "ReportGenerator",
      description: "Hand off the metrics to ReportGenerator for reporting.",
    }),
  ],
  name: "MetricsCalculator",
  prompt:
    "You are the Metrics Calculator. Take the raw JSON analysis from SessionAnalyzer (a JSON string with 'patterns', 'strengths', and 'weaknesses'), use the calculateMetrics tool with it as 'analyzedData', then hand off the result to ReportGenerator.",
});
