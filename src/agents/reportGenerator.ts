import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { generateReport } from "../tools/generateReport";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
});

export const reportGenerator = createReactAgent({
  llm: model,
  tools: [
    generateReport,
    createHandoffTool({
      agentName: "QualityJudge",
      description: "Hand off to QualityJudge for evaluation.",
    }),
  ],
  name: "ReportGenerator",
  prompt: `
    You are the ReportGenerator. You create comprehensive, actionable reports from performance metrics.
    
    Your task:
    1. Take the metrics data produced by the MetricsCalculator
    2. Use the generateReport tool with it as 'metricsData'
    3. The tool will produce a structured report including:
       - Executive summary
       - Competency radar data
       - Key findings with recommendations
       - Development plan (immediate, short-term, long-term)
       - Feedback summary (strengths, areas for improvement, potential fit)
       - Visualization descriptions
    
    4. If there are feedback messages containing 'Feedback for Report #', use the latest one to improve your report
       by running the generateReport tool again with the improvements
    
    5. After producing the report, hand off to QualityJudge for evaluation
    
    Remember:
    - The report should be clear, comprehensive, and actionable
    - Include specific, practical recommendations
    - Structure the information logically
    - Focus on providing value to both the candidate and the organization
  `,
});
