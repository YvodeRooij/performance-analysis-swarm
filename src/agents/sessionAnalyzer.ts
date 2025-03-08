import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { analyzeTranscript } from "../tools/analyzeTranscript";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const sessionAnalyzer = createReactAgent({
  llm: model,
  tools: [
    analyzeTranscript,
    createHandoffTool({
      agentName: "MetricsCalculator",
      description: "Hand off the analysis to MetricsCalculator for scoring.",
    }),
  ],
  name: "SessionAnalyzer",
  prompt:
    "You are the Session Analyzer. Your job is to analyze the provided interview transcript using the analyzeTranscript tool. Once you have the analysis, hand off the result to MetricsCalculator in a separate step.",
});
