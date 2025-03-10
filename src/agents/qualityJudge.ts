import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StateGraph } from "@langchain/langgraph";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { evaluateOutput } from "../tools/evaluateOutput";
import { QualityJudgeStateAnnotation } from "../utils/agentInstrumentation";
import { createWithTimeout } from "@langchain/langgraph/prebuilt";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use configured model for the QualityJudge
const model = new ChatOpenAI({
  modelName: process.env.QUALITY_JUDGE_MODEL || "gpt-4o",
  apiKey: apiKey,
  temperature: 0.1, // Lower temperature for more consistent evaluations
  maxRetries: 3, // Add retries to handle any API errors
});

// Create a custom handoff tool that uses Command.PARENT for proper state management
const createCustomHandoffTool = ({
  agentName,
  description,
}: {
  agentName: string;
  description: string;
}) => {
  const handoffTool = tool(
    async (args: { taskDescription?: string; feedback?: string; analysisOutput?: string; metricsOutput?: string; reportOutput?: string }, config) => {
      const toolMessage = new ToolMessage({
        content: `Successfully transferred to ${agentName}`,
        name: "handoff_tool",
        tool_call_id: config.toolCall.id,
      });

      // Get the current agent state
      const { judgeMessages, currentEvaluation, evaluationPassed, evaluationScore } = (getCurrentTaskInput() as { 
        judgeMessages: BaseMessage[];
        currentEvaluation: string;
        evaluationPassed: boolean;
        evaluationScore: number;
      });
      
      // Get the last message from the agent
      const lastAgentMessage = judgeMessages[judgeMessages.length - 1];
      
      // Prepare state update based on agent being handed off to
      const stateUpdate: any = {
        messages: [lastAgentMessage, toolMessage],
        activeAgent: agentName,
        completedSteps: [`QualityJudge sent ${evaluationPassed ? 'passed' : 'failed'} evaluation to ${agentName}`],
        evaluationPassed,
        evaluationScore
      };
      
      // Handle specific data based on target agent
      if (agentName === "SessionAnalyzer") {
        stateUpdate.feedbackReceived = args.feedback || currentEvaluation;
        stateUpdate.needsRevision = true;
      } else if (agentName === "MetricsCalculator") {
        stateUpdate.analysis = args.analysisOutput || "";
      } else if (agentName === "ReportGenerator") {
        stateUpdate.metrics = args.metricsOutput || "";
      }
      
      return new Command({
        goto: agentName,
        graph: Command.PARENT,
        // Update the parent graph state with our data
        update: stateUpdate,
      });
    },
    {
      name: `handoff_to_${agentName.toLowerCase()}`,
      schema: z.object({
        taskDescription: z.string().optional().describe("Description of the task for the next agent"),
        feedback: z.string().optional().describe("Feedback for the analysis or other output"),
        analysisOutput: z.string().optional().describe("The analysis output to pass to the next agent"),
        metricsOutput: z.string().optional().describe("The metrics output to pass to the next agent"),
        reportOutput: z.string().optional().describe("The report output to pass to the next agent")
      }),
      description,
    }
  );

  return handoffTool;
};

// Create the QualityJudge state graph
export const createQualityJudge = () => {
  // Build the state graph
  const qualityJudgeGraph = new StateGraph<typeof QualityJudgeStateAnnotation.State>({
    channels: QualityJudgeStateAnnotation,
  });

  // Create the model node
  qualityJudgeGraph.addNode(
    "model", 
    createWithTimeout({
      llm: model,
      channelOption: "judgeMessages"
    })
  );

  // Create the tools node with all tools
  qualityJudgeGraph.addNode("tools", async (state) => {
    // Process evaluation results if present in the last message
    const lastMessage = state.judgeMessages[state.judgeMessages.length - 1];
    if (lastMessage?.content && typeof lastMessage.content === 'string') {
      const content = lastMessage.content;
      
      // Store evaluation results
      if (content.includes("Evaluation Output:")) {
        // Extract the evaluation JSON and check if it passed
        try {
          const evalJson = JSON.parse(content.substring(content.indexOf('{')));
          return { 
            currentEvaluation: content,
            evaluationPassed: evalJson.passed,
            evaluationScore: evalJson.score
          };
        } catch (e) {
          console.error("Error parsing evaluation JSON:", e);
        }
      }
    }
    
    return {};
  });

  // Define edges
  qualityJudgeGraph.addEdge("model", "tools");
  qualityJudgeGraph.addEdge("tools", "model");
  qualityJudgeGraph.setEntryPoint("model");

  // Compile the graph
  return qualityJudgeGraph.compile();
};

// Create the QualityJudge wrapper function for the parent graph
export const callQualityJudge = async (state: any) => {
  // Transform parent state to QualityJudge state
  const judgeState = {
    judgeMessages: [
      ...state.messages,
      {
        role: "system",
        content: `You are the Quality Judge responsible for ensuring all outputs meet rigorous professional standards.
        You are the guardian of quality and will not allow substandard work to progress.
        
        # QUALITY ASSURANCE MISSION
        Your role is to apply exacting standards to each output, ensuring:
        1. Evidence-based evaluation (every score and claim must be supported by evidence)
        2. Balanced assessment (both strengths and limitations must be addressed)
        3. Precise calibration (ratings must match evidence quality and quantity)
        4. Logical reasoning (analysis must follow clear, structured thinking)
        5. Comprehensive coverage (all required competencies must be thoroughly assessed)
        
        # EXACT STEP-BY-STEP PROCESS
        
        ## STEP 1: Identify the output type and source
        - If it contains "Analysis Output:" → type="Analysis", source="SessionAnalyzer"
        - If it contains "Metrics Output:" → type="Metrics", source="MetricsCalculator" 
        - If it contains "Report Output:" → type="Report", source="ReportGenerator"
        - If it contains "Evaluation Output:" → This is feedback from your evaluation
        
        CRITICAL: When receiving a handoff from any agent, look for these EXACT prefixes above. The most common case is receiving "Analysis Output:" from SessionAnalyzer. In this case, IMMEDIATELY treat this as an Analysis output for evaluation.
        
        ## STEP 2: For new content to evaluate (Analysis, Metrics, or Report):
          a. Extract the JSON content after the output label
          b. IMMEDIATELY use the evaluate_output tool with:
             - outputType: The type you identified (e.g., "Analysis", "Metrics", or "Report")
             - content: The COMPLETE message text INCLUDING the original output label
             - sourceAgent: The source you identified (e.g., "SessionAnalyzer", "MetricsCalculator", "ReportGenerator")
          c. DO NOT proceed to any other steps until you have evaluation results
          d. If you receive a message with "Analysis Output:", make sure to use outputType="Analysis" and sourceAgent="SessionAnalyzer"
        
        ## STEP 3: When you receive evaluation results:
          a. Check if the output passed (score ≥ 8.0)
          b. If PASSED:
             - For Analysis: IMMEDIATELY hand off to MetricsCalculator using the "handoff_to_metricscalculator" tool, including the COMPLETE analysis in your handoff
             - For Metrics: IMMEDIATELY hand off to ReportGenerator using the "handoff_to_reportgenerator" tool
             - For Report: Respond with "Process completed. Final report approved with quality score [SCORE]. Key strengths: [LIST 3 STRENGTHS]"
          
          c. If FAILED:
             - Review the issues and feedback in the evaluation thoroughly
             - Create a clear, specific feedback message explaining what needs to be fixed
             - Include numbered points for each issue that needs addressing
             - Organize feedback by competency or section for clarity
             - Provide specific examples of how to improve
             - Explicitly state what quality threshold must be met
             - IMMEDIATELY hand off back to the original source agent with your feedback
             - Use the "handoff_to_sessionanalyzer" tool for SessionAnalyzer
             - Include the COMPLETE evaluation output AND all feedback in your handoff message
        
        # QUALITY STANDARDS BY OUTPUT TYPE
        
        ## ANALYSIS STANDARDS
        - Every competency score 8+ MUST have at least 4 specific evidence examples
        - Every competency score 6-7 MUST have at least 3 specific evidence examples
        - Every competency score below 6 MUST have at least 2 specific evidence examples
        - Analysis MUST include BOTH strengths AND limitations for each competency
        - Each competency must have specific development areas identified
        - Evidence must include direct quotes from the transcript
        - Overall assessment must be balanced and evidence-based
        - Visualization data must accurately reflect competency scores
        
        ## METRICS STANDARDS
        - Numerical scores must match evidence quantity and quality
        - Benchmarks must be evidence-based and realistic, not arbitrary
        - Gap analysis must specify development areas with realistic timelines
        - Competency correlations must be logical and evidence-supported
        - Distribution metrics must be accurate reflections of the data
        - Strengths/weaknesses ratios must match the actual evidence count
        
        ## REPORT STANDARDS
        - Executive summary must be concise and evidence-grounded
        - All findings must cite specific evidence from the analysis
        - Development recommendations must be specific, actionable, and evidence-tied
        - Visual representations must accurately reflect the data
        - Language must be clear, professional, and free of jargon
        - Report must maintain consistent focus on evidence-based assessment
        - Format must be structured with clear section organization
        
        # EXAMPLES OF THOROUGH FEEDBACK
        
        ## For Analysis:
        "Your analysis requires significant improvement before it can proceed to metrics calculation:
        
        ### Business Acumen Assessment Issues:
        1. Score of 9/10 is not supported by sufficient evidence - you provided only 2 examples, but 4+ are required for scores 8+
        2. The examples provided don't demonstrate exceptional performance (required for 9/10)
        3. No limitations identified - every competency requires balanced assessment
        
        ### Quantitative Skills Assessment Issues:
        1. Evidence lacks direct quotes from the transcript - add exact quotes
        2. Analysis doesn't connect evidence to specific subcomponents (calculation ability, data interpretation, etc.)
        
        ### Overall Issues:
        1. Visualization data doesn't match competency scores (leadership shows 8 in visualization but 7 in assessment)
        2. Development areas are too generic - provide specific, actionable recommendations
        
        REQUIREMENTS TO PASS: Add 2+ evidence examples with direct quotes for business acumen, identify limitations for each competency, align visualization data with scores, and provide specific development areas."
        
        ## For Metrics:
        "Your metrics calculation requires improvement in the following areas:
        
        ### Benchmark Accuracy Issues:
        1. The 90th percentile ranking for leadership lacks justification - explain methodology
        2. Industry benchmarks appear arbitrary - provide reference points or comparative data
        
        ### Competency Correlation Issues:
        1. The claimed correlation between problem-solving and quantitative skills (0.85) lacks supporting evidence
        2. No explanation of correlation methodology or significance
        
        ### Gap Analysis Issues:
        1. Development timeline claims (3 months for structured thinking improvement) lack justification
        2. Recommended interventions aren't tied to specific evidence from the analysis
        
        REQUIREMENTS TO PASS: Provide methodology for percentile rankings, explain correlation calculations, and tie development recommendations to specific analysis evidence."
        
        ## For Report:
        "Your report requires revision in these specific areas:
        
        ### Executive Summary Issues:
        1. The summary claims 'exceptional business acumen' without citing evidence
        2. Overall assessment contradicts detailed competency scores
        
        ### Development Recommendation Issues:
        1. All 3 recommendations lack direct ties to evidence from the analysis
        2. No prioritization or timeline for implementation
        3. No measurement criteria for success
        
        ### Visualization Issues:
        1. Radar chart doesn't match competency scores in the metrics
        2. Strengths/weaknesses visualization misrepresents the data (shows 5:1 ratio for leadership when metrics show 2:1)
        
        REQUIREMENTS TO PASS: Align executive summary with evidence, connect development recommendations to specific analysis evidence, correct visualization inconsistencies, and add success measurement criteria."
        
        # EVALUATION TRANSPARENCY
        When providing feedback, always explain your quality reasoning process by:
        1. Specifying exactly which standards were not met
        2. Providing numeric details where applicable (e.g., "found only 2 evidence examples where 4 are required")
        3. Highlighting both major issues (must be fixed) and minor issues (should be improved)
        4. Setting clear expectations for what a passing revision must include
        
        IMPORTANT: Be rigorous and uncompromising. Do not approve outputs that lack sufficient evidence or have inflated scores. Your job is to ensure high-quality, evidence-based reporting. The entire value of this analysis depends on your strict quality enforcement.`
      }
    ],
    currentEvaluation: state.currentEvaluation || "",
    evaluationPassed: state.evaluationPassed || false,
    evaluationScore: state.evaluationScore || 0
  };
  
  // Initialize the QualityJudge agent with tools
  const qualityJudge = createQualityJudge();
  
  // Add tools to the model
  qualityJudge.addTool("evaluate_output", evaluateOutput);
  qualityJudge.addTool(
    "handoff_to_sessionanalyzer", 
    createCustomHandoffTool({
      agentName: "SessionAnalyzer",
      description: "Hand off back to SessionAnalyzer with feedback."
    })
  );
  qualityJudge.addTool(
    "handoff_to_metricscalculator", 
    createCustomHandoffTool({
      agentName: "MetricsCalculator",
      description: "Hand off to MetricsCalculator with the analysis."
    })
  );
  qualityJudge.addTool(
    "handoff_to_reportgenerator", 
    createCustomHandoffTool({
      agentName: "ReportGenerator",
      description: "Hand off to ReportGenerator with the metrics."
    })
  );
  
  try {
    // Invoke the QualityJudge with the state
    const response = await qualityJudge.invoke(judgeState);
    
    // Transform QualityJudge state back to parent state
    return {
      messages: response.judgeMessages,
      currentEvaluation: response.currentEvaluation,
      evaluationPassed: response.evaluationPassed,
      evaluationScore: response.evaluationScore,
      completedSteps: [`QualityJudge completed evaluation with score ${response.evaluationScore.toFixed(1)}, ${response.evaluationPassed ? 'PASSED' : 'FAILED'}`]
    };
  } catch (error) {
    console.error("Error in QualityJudge:", error);
    throw error;
  }
};
