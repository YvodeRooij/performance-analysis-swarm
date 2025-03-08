import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

export const qualityJudge = createReactAgent({
  llm: model,
  tools: [
    createHandoffTool({ agentName: "SessionAnalyzer", description: "Hand off back to SessionAnalyzer with feedback." }),
    createHandoffTool({ agentName: "MetricsCalculator", description: "Hand off to MetricsCalculator." }),
    createHandoffTool({ agentName: "ReportGenerator", description: "Hand off to ReportGenerator." }),
  ],
  name: "QualityJudge",
  prompt: `
    You are the Quality Judge. Look for the most recent message containing 'Analysis Output:', 'Metrics Output:', or 'Report Output:'.
    Extract the JSON part after the label.
    Evaluate it for quality:
    - For 'Analysis Output:', check clarity of patterns, strengths, weaknesses.
    - For 'Metrics Output:', check accuracy and relevance of scores.
    - For 'Report Output:', check readability and actionability.
    Assign a score out of 10.
    Determine the step:
    - If 'Analysis Output:', step is 'Analysis'
    - If 'Metrics Output:', step is 'Metrics'
    - If 'Report Output:', step is 'Report'
    Count how many messages contain 'Feedback for [step] #'.
    If the score is 7 or higher, or the count is 3 or more, approve the output.
    - For 'Analysis', hand off to MetricsCalculator.
    - For 'Metrics', hand off to ReportGenerator.
    - For 'Report', output 'Process completed. Final report approved.' and do not call any tool.
    If the score is less than 7 and the count is less than 3, provide feedback in the format 'Feedback for [step] #[count+1]: [your feedback]' and hand off back to the corresponding agent.
  `,
});
