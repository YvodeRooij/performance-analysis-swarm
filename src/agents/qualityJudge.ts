import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { evaluateOutput } from "../tools/evaluateOutput";

// Get API key from environment or provide directly
const apiKey = process.env.OPENAI_API_KEY;

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
});

export const qualityJudge = createReactAgent({
  llm: model,
  tools: [
    evaluateOutput,
    createHandoffTool({
      agentName: "SessionAnalyzer",
      description: "Hand off back to SessionAnalyzer with feedback.",
    }),
    createHandoffTool({
      agentName: "MetricsCalculator",
      description: "Hand off to MetricsCalculator with the analysis.",
    }),
    createHandoffTool({
      agentName: "ReportGenerator",
      description: "Hand off to ReportGenerator with the metrics.",
    }),
  ],
  name: "QualityJudge",
  prompt: `
    You are the Quality Judge responsible for ensuring all outputs meet high standards.
    
    When you receive a message, your tasks are:
    
    1. Identify the output type based on these patterns:
       - If it contains "Analysis Output:", the type is "Analysis" and source is "SessionAnalyzer"
       - If it contains "Metrics Output:", the type is "Metrics" and source is "MetricsCalculator" 
       - If it contains "Report Output:", the type is "Report" and source is "ReportGenerator"
       
    2. Extract the JSON content after the output label
    
    3. Use the evaluateOutput tool to evaluate the content against specific criteria:
       - For Analysis: comprehensiveness, evidence-based, insight quality, balance, actionability
       - For Metrics: accuracy, consistency, depth, benchmarking, actionability
       - For Report: clarity, comprehensiveness, visual quality, actionability, structure
    
    4. Based on the evaluation results:
       a. If the output PASSES (score ≥ 7.0 or 2+ feedback iterations):
          - For Analysis: hand off to MetricsCalculator
          - For Metrics: hand off to ReportGenerator
          - For Report: respond with "Process completed. Final report approved."
       
       b. If the output FAILS (score < 7.0 and less than 2 feedback iterations):
          - Count how many messages contain "Feedback for [Type] #"
          - Provide feedback in the format "Feedback for [Type] #[count+1]: [detailed feedback]"
          - Hand off back to the corresponding agent
    
    Remember:
    - Be thorough and specific in your evaluations
    - Provide actionable feedback for improvements
    - Balance quality requirements with practical constraints
    - After 2 feedback iterations, approve the output even if below threshold
  `,
});
