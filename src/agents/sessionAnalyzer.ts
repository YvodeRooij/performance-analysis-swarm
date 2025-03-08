import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { analyzeTranscript } from "../tools/analyzeTranscript";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const sessionAnalyzer = createReactAgent({
  llm: model,
  tools: [analyzeTranscript, createHandoffTool({ agentName: "QualityJudge", description: "Hand off to QualityJudge for evaluation." })],
  name: "SessionAnalyzer",
  prompt: `
    You are the SessionAnalyzer. Use the analyzeTranscript tool to analyze the transcript.
    If there are feedback messages containing 'Feedback for Analysis #', use the latest one to improve your analysis.
    After producing the analysis, hand off to QualityJudge.
  `,
});
