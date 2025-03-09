import { BaseMessage } from "@langchain/core/messages";
import { StateGraph } from "@langchain/langgraph";

// Type for the compiled agent graph
interface CompiledAgentGraph {
  name?: string;
  invoke: (input: any, config?: any) => Promise<any>;
  // Additional properties that might exist
  [key: string]: any;
}

// Define a type for objects that have addMiddleware method
interface HasAddMiddleware {
  addMiddleware: (middleware: {
    beforeNode?: (nodeName: string, input: any) => Promise<any>;
    afterNode?: (nodeName: string, output: any) => Promise<any>;
  }) => any;
}

// Wrapper to log agent inputs and outputs
export function instrumentAgent(agent: CompiledAgentGraph): CompiledAgentGraph {
  // Keep the original agent intact
  const originalInvoke = agent.invoke;

  // Create a wrapper with the same interface
  const wrappedAgent = {
    ...agent,
    invoke: async (input: any, config?: any) => {
      const agentName = agent.name || "UnnamedAgent";

      console.log(`\n===== [${agentName}] STARTING at ${new Date().toISOString()} =====`);
      console.log(`Input: ${JSON.stringify(input, null, 2)}`);
      console.time(`${agentName} execution time`);

      try {
        const result = await originalInvoke(input, config);
        console.timeEnd(`${agentName} execution time`);
        console.log(`\n===== [${agentName}] COMPLETED at ${new Date().toISOString()} =====`);
        console.log(`Output: ${JSON.stringify(result, null, 2)}`);

        // Track control flow
        if (result.activeAgent) {
          console.log(`\n>>>>> CONTROL PASSED TO: ${result.activeAgent} <<<<<`);
        }

        return result;
      } catch (error) {
        console.timeEnd(`${agentName} execution time`);
        console.error(`\n===== [${agentName}] ERROR at ${new Date().toISOString()} =====`);
        console.error(error);
        throw error;
      }
    },
  };

  return wrappedAgent;
}

// Add tracing middleware to a workflow
// Use explicit type constraint to ensure workflow has addMiddleware
export function addTracingMiddleware<T extends HasAddMiddleware>(workflow: T): T {
  workflow.addMiddleware({
    beforeNode: async (nodeName: string, input: any) => {
      console.log(`\n${nodeName} RECEIVING:`, JSON.stringify(input, null, 2));
      return input;
    },
    afterNode: async (nodeName: string, output: any) => {
      console.log(`${nodeName} PRODUCING:`, JSON.stringify(output, null, 2));
      return output;
    },
  });

  return workflow;
}

// Extract content from a message
function extractContent(msg: any): string | null {
  if (!msg) return null;

  if (typeof msg.content === "string") {
    return msg.content;
  }

  if (Array.isArray(msg.content)) {
    return msg.content.map((item: any) => (typeof item === "string" ? item : item?.text || JSON.stringify(item))).join("\n");
  }

  try {
    return JSON.stringify(msg.content);
  } catch (e) {
    return null;
  }
}

// Interface for agent outputs
interface AgentOutput {
  type: string;
  content: string;
  target?: string;
}

// Interface for categorized outputs
interface OutputsByAgent {
  SessionAnalyzer: AgentOutput[];
  MetricsCalculator: AgentOutput[];
  ReportGenerator: AgentOutput[];
  QualityJudge: AgentOutput[];
}

// Categorize outputs by agent
export function categorizeOutputs(result: { messages?: any[] }): OutputsByAgent {
  const messages = result?.messages || [];

  const outputsByAgent: OutputsByAgent = {
    SessionAnalyzer: [],
    MetricsCalculator: [],
    ReportGenerator: [],
    QualityJudge: [],
  };

  // Process each message and categorize by agent and output type
  messages.forEach((msg) => {
    const content = extractContent(msg);
    if (!content) return;

    // Categorize by agent
    if (content.includes("Analysis Output:")) {
      outputsByAgent.SessionAnalyzer.push({ type: "output", content });
    } else if (content.includes("Metrics Output:")) {
      outputsByAgent.MetricsCalculator.push({ type: "output", content });
    } else if (content.includes("Report Output:")) {
      outputsByAgent.ReportGenerator.push({ type: "output", content });
    } else if (content.includes("Evaluation Output:")) {
      outputsByAgent.QualityJudge.push({ type: "evaluation", content });
    } else if (content.includes("Feedback for Analysis #")) {
      outputsByAgent.QualityJudge.push({ type: "feedback", target: "Analysis", content });
    } else if (content.includes("Feedback for Metrics #")) {
      outputsByAgent.QualityJudge.push({ type: "feedback", target: "Metrics", content });
    } else if (content.includes("Feedback for Report #")) {
      outputsByAgent.QualityJudge.push({ type: "feedback", target: "Report", content });
    }
  });

  return outputsByAgent;
}

// Interface for execution stats
interface ExecutionStats {
  iterations: Record<string, number>;
  feedbackCounts: Record<string, number>;
  totalMessages: number;
  totalFeedback: number;
}

// Calculate execution statistics
export function calculateExecutionStats(result: { messages?: any[] }): ExecutionStats {
  const outputsByAgent = categorizeOutputs(result);

  // Calculate iterations per agent
  const iterations = {
    SessionAnalyzer: outputsByAgent.SessionAnalyzer.length,
    MetricsCalculator: outputsByAgent.MetricsCalculator.length,
    ReportGenerator: outputsByAgent.ReportGenerator.length,
    QualityJudge: outputsByAgent.QualityJudge.filter((item) => item.type === "evaluation").length,
  };

  // Calculate feedback counts
  const feedbackCounts = {
    Analysis: outputsByAgent.QualityJudge.filter((item) => item.type === "feedback" && item.target === "Analysis").length,
    Metrics: outputsByAgent.QualityJudge.filter((item) => item.type === "feedback" && item.target === "Metrics").length,
    Report: outputsByAgent.QualityJudge.filter((item) => item.type === "feedback" && item.target === "Report").length,
  };

  return {
    iterations,
    feedbackCounts,
    totalMessages: result?.messages?.length || 0,
    totalFeedback: feedbackCounts.Analysis + feedbackCounts.Metrics + feedbackCounts.Report,
  };
}
