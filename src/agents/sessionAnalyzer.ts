import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { BaseMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { StateGraph, StateGraphArgs } from "@langchain/langgraph";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { analyzeTranscript } from "../tools/analyzeTranscript";
import { SessionAnalyzerStateAnnotation } from "../utils/agentInstrumentation";
import { createWithTimeout } from "@langchain/langgraph/prebuilt";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use configured model for the SessionAnalyzer
const model = new ChatOpenAI({
  modelName: process.env.SESSION_ANALYZER_MODEL || "gpt-4o",
  apiKey: apiKey,
  temperature: 0.2, // Lower temperature for more consistent analysis
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
    async (args: { taskDescription?: string; analysisOutput?: string }, config) => {
      const toolMessage = new ToolMessage({
        content: `Successfully transferred to ${agentName}`,
        name: "handoff_tool",
        tool_call_id: config.toolCall.id,
      });

      // Get the current agent state
      const { analyzerMessages, analysis } = (getCurrentTaskInput() as { 
        analyzerMessages: BaseMessage[];
        analysis: string;
      });
      
      // Get the last message from the agent
      const lastAgentMessage = analyzerMessages[analyzerMessages.length - 1];
      
      // Determine what analysis to send
      // If provided in args, use that, otherwise use what's in the state
      const analysisOutput = args.analysisOutput || analysis;
      
      return new Command({
        goto: agentName,
        graph: Command.PARENT,
        // Update the parent graph state with our data
        update: {
          messages: [lastAgentMessage, toolMessage],
          activeAgent: agentName,
          analysis: analysisOutput,
          completedSteps: [`SessionAnalyzer sent analysis to ${agentName}`]
        },
      });
    },
    {
      name: "handoff_to_quality_judge",
      schema: z.object({
        taskDescription: z.string().optional().describe("Description of what the quality judge should evaluate"),
        analysisOutput: z.string().optional().describe("The complete analysis output to send to the quality judge")
      }),
      description: description,
    }
  );

  return handoffTool;
};

// Create the SessionAnalyzer state graph
export const createSessionAnalyzer = () => {
  // Build the state graph
  const sessionAnalyzerGraph = new StateGraph<typeof SessionAnalyzerStateAnnotation.State>({
    channels: SessionAnalyzerStateAnnotation,
  });

  // Create the model node
  sessionAnalyzerGraph.addNode(
    "model", 
    createWithTimeout({
      llm: model,
      channelOption: "analyzerMessages"
    })
  );

  // Create the tool node with all tools
  sessionAnalyzerGraph.addNode("tools", async (state) => {
    // If the state has analysis output, store it
    const lastMessage = state.analyzerMessages[state.analyzerMessages.length - 1];
    if (lastMessage?.content && typeof lastMessage.content === 'string') {
      const content = lastMessage.content;
      if (content.includes("Analysis Output:")) {
        // Extract the analysis and store it in the state
        return { analysis: content };
      }
    }
    
    // If there's feedback, mark that we need revision
    if (state.feedbackReceived && !state.needsRevision) {
      return { needsRevision: true };
    }
    
    return {};
  });

  // Define edges
  sessionAnalyzerGraph.addEdge("model", "tools");
  sessionAnalyzerGraph.addEdge("tools", "model");
  sessionAnalyzerGraph.setEntryPoint("model");

  // Compile the graph
  return sessionAnalyzerGraph.compile();
};

// Create the SessionAnalyzer wrapper function for the parent graph
export const callSessionAnalyzer = async (state: any) => {
  // Extract the transcript from the user message if available
  let transcript = '';
  
  // Look for transcript in messages
  if (state.messages && state.messages.length > 0) {
    for (const message of state.messages) {
      if (message.role === 'user' && message.content && typeof message.content === 'string') {
        // Extract anything that might be a transcript
        if (message.content.includes('Analyze this interview transcript')) {
          transcript = message.content;
          break;
        }
      }
    }
  }
  
  // Transform parent state to SessionAnalyzer state
  const analyzerState = {
    analyzerMessages: [
      ...state.messages,
      {
        role: "system",
        content: `You are the SessionAnalyzer, responsible for performing comprehensive analysis of interview transcripts.
        
        Follow this EVIDENCE-FIRST approach:
        
        STEP 1: Use the analyzeTranscript tool to analyze the interview transcript
        
        STEP 2: When receiving feedback from QualityJudge:
          a. Carefully review all feedback points
          b. Run the analyzeTranscript tool again, making sure to address ALL feedback
          c. Verify that your new analysis meets these requirements:
             - Every competency score 8+ has at least 3 specific evidence examples
             - Every competency score 6-7 has at least 2 specific evidence examples
             - Every competency score below 6 has at least 1 specific evidence example
             - Each competency has BOTH strengths AND limitations identified
             - All claims are supported by direct quotes from the transcript
        
        STEP 3: IMMEDIATELY after producing a complete analysis, you MUST hand off to QualityJudge for evaluation
          - Use the "handoff_to_quality_judge" tool
          - Include the COMPLETE analysis output in your handoff with NO modifications
          - The complete output MUST start with "Analysis Output:" followed by the JSON
          - DO NOT summarize, modify, or extract parts of the analysis - send it EXACTLY as you received it
          - DO NOT proceed to any other steps or analysis after using the analyzeTranscript tool
        
        RATING CALIBRATION GUIDE:
        - 9-10 = Exceptional (rare, requires multiple impressive examples)
        - 7-8 = Strong (solid evidence of competency)
        - 5-6 = Competent (basic demonstration)
        - 3-4 = Developing (minimal evidence)
        - 1-2 = Needs improvement (concerning evidence)
        
        EXAMPLES OF GOOD EVIDENCE:
        
        Strong evidence (for high ratings):
        "When discussing the market entry strategy, the candidate said: 'We should analyze the competitive landscape by examining the top 3 players' market share, pricing strategies, and customer acquisition costs. I'd run a regression analysis on these factors against their growth rates to identify the key success factors.' This demonstrates exceptional quantitative skills and business acumen."
        
        Balanced analysis (showing both strengths and limitations):
        "Strength: The candidate structured their approach to the case by first defining the problem, then breaking it into components (market size, competition, pricing).
        Limitation: However, they failed to prioritize these components or explain which factors would be most important to analyze first."
        
        IMPORTANT: Always maintain a balanced assessment. Even strong candidates have areas for improvement, and even weak candidates have some strengths. Your analysis must reflect this balance.`
      }
    ],
    analysis: state.analysis || "",
    needsRevision: state.needsRevision || false,
    feedbackReceived: state.feedbackReceived || ""
  };
  
  // Initialize the SessionAnalyzer agent with custom handoff tool
  const sessionAnalyzer = createSessionAnalyzer();
  
  // Add tools to the model
  sessionAnalyzer.addTool("analyzeTranscript", analyzeTranscript);
  sessionAnalyzer.addTool(
    "handoff_to_quality_judge", 
    createCustomHandoffTool({
      agentName: "QualityJudge",
      description: "Hand off to QualityJudge for evaluation of your analysis."
    })
  );
  
  try {
    // Invoke the SessionAnalyzer with the state
    const response = await sessionAnalyzer.invoke(analyzerState);
    
    // Transform SessionAnalyzer state back to parent state
    return {
      messages: response.analyzerMessages,
      analysis: response.analysis,
      needsRevision: false, // Reset this flag after processing
      completedSteps: [`SessionAnalyzer completed analysis`]
    };
  } catch (error) {
    console.error("Error in SessionAnalyzer:", error);
    throw error;
  }
};
