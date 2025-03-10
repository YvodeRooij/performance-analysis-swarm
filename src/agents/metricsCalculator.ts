import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StateGraph } from "@langchain/langgraph";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { calculateMetrics } from "../tools/calculateMetrics";
import { MetricsCalculatorStateAnnotation } from "../utils/agentInstrumentation";
import { createWithTimeout } from "@langchain/langgraph/prebuilt";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use configured model for the MetricsCalculator
const model = new ChatOpenAI({
  modelName: process.env.METRICS_CALCULATOR_MODEL || "gpt-4o",
  apiKey: apiKey,
  temperature: 0.2, // Lower temperature for more consistent calculations
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
    async (args: { taskDescription?: string; metricsOutput?: string }, config) => {
      const toolMessage = new ToolMessage({
        content: `Successfully transferred to ${agentName}`,
        name: "handoff_tool",
        tool_call_id: config.toolCall.id,
      });

      // Get the current agent state
      const { metricsMessages, metrics } = (getCurrentTaskInput() as { 
        metricsMessages: BaseMessage[];
        metrics: string;
      });
      
      // Get the last message from the agent
      const lastAgentMessage = metricsMessages[metricsMessages.length - 1];
      
      // Determine what metrics to send
      // If provided in args, use that, otherwise use what's in the state
      const metricsOutput = args.metricsOutput || metrics;
      
      return new Command({
        goto: agentName,
        graph: Command.PARENT,
        // Update the parent graph state with our data
        update: {
          messages: [lastAgentMessage, toolMessage],
          activeAgent: agentName,
          metrics: metricsOutput,
          completedSteps: [`MetricsCalculator sent metrics to ${agentName}`]
        },
      });
    },
    {
      name: "handoff_to_quality_judge",
      schema: z.object({
        taskDescription: z.string().optional().describe("Description of what the quality judge should evaluate"),
        metricsOutput: z.string().optional().describe("The complete metrics output to send to the quality judge")
      }),
      description,
    }
  );

  return handoffTool;
};

// Create the MetricsCalculator state graph
export const createMetricsCalculator = () => {
  // Build the state graph
  const metricsCalculatorGraph = new StateGraph<typeof MetricsCalculatorStateAnnotation.State>({
    channels: MetricsCalculatorStateAnnotation,
  });

  // Create the model node
  metricsCalculatorGraph.addNode(
    "model", 
    createWithTimeout({
      llm: model,
      channelOption: "metricsMessages"
    })
  );

  // Create the tool node with all tools
  metricsCalculatorGraph.addNode("tools", async (state) => {
    // If the state has metrics output, store it
    const lastMessage = state.metricsMessages[state.metricsMessages.length - 1];
    if (lastMessage?.content && typeof lastMessage.content === 'string') {
      const content = lastMessage.content;
      if (content.includes("Metrics Output:")) {
        // Extract the metrics and store it in the state
        return { metrics: content };
      }
    }
    
    return {};
  });

  // Define edges
  metricsCalculatorGraph.addEdge("model", "tools");
  metricsCalculatorGraph.addEdge("tools", "model");
  metricsCalculatorGraph.setEntryPoint("model");

  // Compile the graph
  return metricsCalculatorGraph.compile();
};

// Create the MetricsCalculator wrapper function for the parent graph
export const callMetricsCalculator = async (state: any) => {
  // Transform parent state to MetricsCalculator state
  const metricsState = {
    metricsMessages: [
      ...state.messages,
      {
        role: "system",
        content: `You are the Metrics Calculator. You transform raw analysis data into meaningful performance metrics.
    
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
          - Use the "handoff_to_quality_judge" tool
          - Include the COMPLETE metrics output in your handoff with NO modifications
          - The complete output MUST start with "Metrics Output:" followed by the JSON
          - DO NOT summarize, modify, or extract parts of the metrics - send it EXACTLY as you received it
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
        
        Remember: Quality metrics are based on EVIDENCE, not assumptions. Be conservative in your assessments and transparent about limitations.`
      }
    ],
    metrics: state.metrics || ""
  };
  
  // Initialize the MetricsCalculator agent with tools
  const metricsCalculator = createMetricsCalculator();
  
  // Add tools to the model
  metricsCalculator.addTool("calculateMetrics", calculateMetrics);
  metricsCalculator.addTool(
    "handoff_to_quality_judge", 
    createCustomHandoffTool({
      agentName: "QualityJudge",
      description: "Hand off to QualityJudge for evaluation of your metrics."
    })
  );
  
  try {
    // Invoke the MetricsCalculator with the state
    const response = await metricsCalculator.invoke(metricsState);
    
    // Transform MetricsCalculator state back to parent state
    return {
      messages: response.metricsMessages,
      metrics: response.metrics,
      completedSteps: [`MetricsCalculator calculated metrics`]
    };
  } catch (error) {
    console.error("Error in MetricsCalculator:", error);
    throw error;
  }
};
