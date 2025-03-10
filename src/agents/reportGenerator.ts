import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StateGraph } from "@langchain/langgraph";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { generateReport } from "../tools/generateReport";
import { ReportGeneratorStateAnnotation } from "../utils/agentInstrumentation";
import { createWithTimeout } from "@langchain/langgraph/prebuilt";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use configured model for the ReportGenerator
const model = new ChatOpenAI({
  modelName: process.env.REPORT_GENERATOR_MODEL || "gpt-4o",
  apiKey: apiKey,
  temperature: 0.2, // Lower temperature for more consistent reports
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
    async (args: { taskDescription?: string; reportOutput?: string }, config) => {
      const toolMessage = new ToolMessage({
        content: `Successfully transferred to ${agentName}`,
        name: "handoff_tool",
        tool_call_id: config.toolCall.id,
      });

      // Get the current agent state
      const { reportMessages, report } = (getCurrentTaskInput() as { 
        reportMessages: BaseMessage[];
        report: string;
      });
      
      // Get the last message from the agent
      const lastAgentMessage = reportMessages[reportMessages.length - 1];
      
      // Determine what report to send
      // If provided in args, use that, otherwise use what's in the state
      const reportOutput = args.reportOutput || report;
      
      return new Command({
        goto: agentName,
        graph: Command.PARENT,
        // Update the parent graph state with our data
        update: {
          messages: [lastAgentMessage, toolMessage],
          activeAgent: agentName,
          report: reportOutput,
          completedSteps: [`ReportGenerator sent report to ${agentName}`]
        },
      });
    },
    {
      name: "handoff_to_quality_judge",
      schema: z.object({
        taskDescription: z.string().optional().describe("Description of what the quality judge should evaluate"),
        reportOutput: z.string().optional().describe("The complete report output to send to the quality judge")
      }),
      description,
    }
  );

  return handoffTool;
};

// Create the ReportGenerator state graph
export const createReportGenerator = () => {
  // Build the state graph
  const reportGeneratorGraph = new StateGraph<typeof ReportGeneratorStateAnnotation.State>({
    channels: ReportGeneratorStateAnnotation,
  });

  // Create the model node
  reportGeneratorGraph.addNode(
    "model", 
    createWithTimeout({
      llm: model,
      channelOption: "reportMessages"
    })
  );

  // Create the tool node with all tools
  reportGeneratorGraph.addNode("tools", async (state) => {
    // If the state has report output, store it
    const lastMessage = state.reportMessages[state.reportMessages.length - 1];
    if (lastMessage?.content && typeof lastMessage.content === 'string') {
      const content = lastMessage.content;
      if (content.includes("Report Output:")) {
        // Extract the report and store it in the state
        return { report: content };
      }
    }
    
    return {};
  });

  // Define edges
  reportGeneratorGraph.addEdge("model", "tools");
  reportGeneratorGraph.addEdge("tools", "model");
  reportGeneratorGraph.setEntryPoint("model");

  // Compile the graph
  return reportGeneratorGraph.compile();
};

// Create the ReportGenerator wrapper function for the parent graph
export const callReportGenerator = async (state: any) => {
  // Transform parent state to ReportGenerator state
  const reportState = {
    reportMessages: [
      ...state.messages,
      {
        role: "system",
        content: `You are the ReportGenerator. You create evidence-based, actionable reports from performance metrics.
    
        Follow this EVIDENCE-CENTERED approach:
        
        STEP 1: Take the metrics data produced by the MetricsCalculator
        
        STEP 2: Use the generateReport tool with the metrics as 'metricsData'
        
        STEP 3: When receiving feedback from QualityJudge:
          a. Carefully review all feedback points
          b. Run the generateReport tool again, making sure to address ALL feedback
          c. Verify that your report meets these requirements:
             - Every finding cites specific evidence from the analysis
             - No redundant information across sections
             - Development recommendations are specific and evidence-based
             - Clear, straightforward language without excessive jargon
             - Logical structure with proper information hierarchy
        
        STEP 4: IMMEDIATELY after producing a report, you MUST hand off to QualityJudge for evaluation
          - Use the "handoff_to_quality_judge" tool
          - Include the COMPLETE report output in your handoff with NO modifications
          - The complete output MUST start with "Report Output:" followed by the JSON
          - DO NOT summarize, modify, or extract parts of the report - send it EXACTLY as you received it
          - DO NOT proceed to any other steps or analysis after using the generateReport tool
        
        IMPORTANT GUIDELINES:
        
        1. EVIDENCE-BASED FINDINGS:
           - Every key finding must cite specific evidence from the analysis
           - Connect all observations directly to what was demonstrated in the interview
           - Avoid making claims that go beyond what the evidence supports
        
        2. SPECIFIC RECOMMENDATIONS:
           - All development suggestions must address specific limitations identified in the evidence
           - Avoid generic recommendations like "improve communication skills"
           - Instead, provide specific, actionable guidance like "Practice explaining technical concepts using analogies, as the interview showed difficulty translating complex ideas into simple terms"
        
        3. BALANCED REPORTING:
           - Present both capabilities and limitations
           - Acknowledge assessment limitations when evidence is limited
           - Avoid repetition across different sections
        
        4. REALISTIC TIMEFRAMES:
           - Do not include arbitrary timeframes like "achieve target within 3 months"
           - Only suggest timeframes that are justified by the evidence and nature of the skill
        
        Remember: A quality report connects all findings directly to evidence, presents a balanced view, and provides specific, actionable recommendations.`
      }
    ],
    report: state.report || ""
  };
  
  // Initialize the ReportGenerator agent with tools
  const reportGenerator = createReportGenerator();
  
  // Add tools to the model
  reportGenerator.addTool("generateReport", generateReport);
  reportGenerator.addTool(
    "handoff_to_quality_judge", 
    createCustomHandoffTool({
      agentName: "QualityJudge",
      description: "Hand off to QualityJudge for evaluation of your report."
    })
  );
  
  try {
    // Invoke the ReportGenerator with the state
    const response = await reportGenerator.invoke(reportState);
    
    // Transform ReportGenerator state back to parent state
    return {
      messages: response.reportMessages,
      report: response.report,
      completedSteps: [`ReportGenerator generated report`]
    };
  } catch (error) {
    console.error("Error in ReportGenerator:", error);
    throw error;
  }
};
