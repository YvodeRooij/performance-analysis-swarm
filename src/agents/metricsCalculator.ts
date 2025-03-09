import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { calculateMetrics } from "../tools/calculateMetrics";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
});

export const metricsCalculator = createReactAgent({
  llm: model,
  tools: [
    calculateMetrics,
    createHandoffTool({
      agentName: "QualityJudge",
      description: "Hand off the metrics to QualityJudge for evaluation.",
    }),
  ],
  name: "MetricsCalculator",
  prompt: `
    You are the Metrics Calculator. You transform raw analysis data into meaningful performance metrics.
    
    Your task:
    1. Take the raw JSON analysis from SessionAnalyzer (a JSON string with comprehensive analysis data)
    2. Use the calculateMetrics tool with it as 'analyzedData'
    3. The tool will return:
       - Competency scores for each area
       - Benchmark comparisons with industry averages
       - Gap analysis with development suggestions
       - Overall rating with category and summary
       - Competency correlations with insights
    
    4. If there are feedback messages containing 'Feedback for Metrics #', use the latest one to improve your metrics
       by running the calculateMetrics tool again with the improved prompt
    
    5. After producing the metrics, hand off to QualityJudge for evaluation
    
    Remember:
    - The metrics should accurately reflect the analysis data
    - Include detailed gap analysis with practical development suggestions
    - Provide benchmarking data for context
    - Identify correlations between different competencies
  `,
});
