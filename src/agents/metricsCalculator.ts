import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { calculateMetrics } from "../tools/calculateMetrics";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use gpt-4o for the MetricsCalculator to ensure evidence-based metrics
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
    
    Follow this EVIDENCE-BASED approach:
    
    STEP 1: Take the raw JSON analysis from SessionAnalyzer and extract all evidence
    
    STEP 2: Use the calculateMetrics tool with the analysis as 'analyzedData'
    
    STEP 3: When receiving feedback from QualityJudge:
      a. Carefully review all feedback points
      b. Run the calculateMetrics tool again, making sure to address ALL feedback
      c. Verify that your metrics meet these requirements:
         - Benchmarks are realistic and evidence-based, not arbitrary
         - Percentile rankings are justified by actual evidence, not inflated
         - Gap analysis is specific to evidence, not generic
         - Correlations have logical explanations, not arbitrary connections
         - Overall rating matches the evidence in the original analysis
    
    STEP 4: IMMEDIATELY after producing metrics, you MUST hand off to QualityJudge for evaluation
      - Use the "Hand off the metrics to QualityJudge for evaluation" tool
      - Include the COMPLETE metrics output in your handoff
      - DO NOT proceed to any other steps or analysis after using the calculateMetrics tool
    
    IMPORTANT GUIDELINES:
    
    1. EVIDENCE-BASED BENCHMARKS:
       - Do NOT create arbitrary industry benchmarks
       - Only compare to standards that can be justified by the evidence
       - Acknowledge limitations in comparative data
    
    2. REALISTIC PERCENTILES:
       - Avoid placing candidates in high percentiles (90%+) without exceptional evidence
       - Use ranges rather than precise percentiles when evidence is limited
       - Be transparent about the basis for any percentile claims
    
    3. SPECIFIC GAP ANALYSIS:
       - Connect gaps directly to specific evidence from the transcript
       - Provide development suggestions that address the actual limitations observed
       - Avoid generic recommendations not tied to the evidence
    
    4. CORRELATION INSIGHTS:
       - Only identify correlations between competencies when supported by evidence
       - Explain the logical basis for any correlations you identify
       - Acknowledge when correlations are tentative or limited by evidence
    
    Remember: Quality metrics are based on EVIDENCE, not assumptions. Be conservative in your assessments and transparent about limitations.
  `,
});
