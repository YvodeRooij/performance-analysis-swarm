import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { generateReport } from "../tools/generateReport";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const reportGenerator = createReactAgent({
  llm: model,
  tools: [generateReport],
  name: "ReportGenerator",
  prompt:
    "You are the Report Generator. Take the raw JSON metrics from MetricsCalculator (a JSON string with 'skills' and 'gaps'), use the generateReport tool with it as 'metricsData', and return the result.",
});
