import { BaseMessage } from "@langchain/core/messages";
import { StateGraph, Annotation, messagesStateReducer } from "@langchain/langgraph";

// Define custom state schemas for each agent
export const SessionAnalyzerStateAnnotation = Annotation.Root({
  analyzerMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  analysis: Annotation<string>({
    default: () => "",
  }),
  needsRevision: Annotation<boolean>({
    default: () => false,
  }),
  feedbackReceived: Annotation<string>({
    default: () => "",
  }),
});

export const QualityJudgeStateAnnotation = Annotation.Root({
  judgeMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  currentEvaluation: Annotation<string>({
    default: () => "",
  }),
  evaluationPassed: Annotation<boolean>({
    default: () => false,
  }),
  evaluationScore: Annotation<number>({
    default: () => 0,
  }),
});

export const MetricsCalculatorStateAnnotation = Annotation.Root({
  metricsMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  metrics: Annotation<string>({
    default: () => "",
  }),
});

export const ReportGeneratorStateAnnotation = Annotation.Root({
  reportMessages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  report: Annotation<string>({
    default: () => "",
  }),
});

// Define the swarm state schema
export const SwarmState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  activeAgent: Annotation<string>({
    default: () => "SessionAnalyzer",
  }),
  analysis: Annotation<string>({
    default: () => "",
  }),
  metrics: Annotation<string>({
    default: () => "",
  }),
  report: Annotation<string>({
    default: () => "",
  }),
  evaluationPassed: Annotation<boolean>({
    default: () => false,
  }),
  evaluationScore: Annotation<number>({
    default: () => 0,
  }),
  feedbackReceived: Annotation<string>({
    default: () => "",
  }),
  needsRevision: Annotation<boolean>({
    default: () => false,
  }),
  completedSteps: Annotation<string[]>({
    default: () => [],
    reducer: (curr, update) => [...curr, ...update]
  })
});

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
  compile: (options: any) => any;
}

// Detailed QualityJudge evaluation information
interface QualityEvaluation {
  sourceAgent: string;
  outputType: string;
  score: number;
  passed: boolean;
  feedback: string;
  issues: string[];
  timestamp: string;
  feedbackCounts: Record<string, number>;
}

// Interface for agent outputs with timing and metadata
interface AgentOutput {
  type: string;
  content: string;
  target?: string;
  timestamp?: string;
  metadata?: Record<string, any>;
  evaluationData?: QualityEvaluation;
}

// Interface for categorized outputs
interface OutputsByAgent {
  SessionAnalyzer: AgentOutput[];
  MetricsCalculator: AgentOutput[];
  ReportGenerator: AgentOutput[];
  QualityJudge: AgentOutput[];
}

// Interface for execution stats with quality metrics
interface ExecutionStats {
  iterations: Record<string, number>;
  feedbackCounts: Record<string, number>;
  totalMessages: number;
  totalFeedback: number;
  qualityScores: Record<string, number[]>;
  averageScores: Record<string, number>;
  passRates: Record<string, number>;
  duration?: number;
  workflowSteps?: WorkflowStep[];
}

// Interface for workflow step tracking
interface WorkflowStep {
  step: number;
  agent: string;
  action: string;
  timestamp: string;
  targetAgent?: string;
  passed?: boolean;
  score?: number;
  content?: string;
}

// Debug configuration - controlled by environment variable
const DEBUG = process.env.DEBUG_AGENTS === 'true';
const VERBOSE_DEBUG = process.env.VERBOSE_DEBUG === 'true';

// Wrapper to log agent inputs and outputs with enhanced debugging
export function instrumentAgent(agent: CompiledAgentGraph): CompiledAgentGraph {
  // Keep the original agent intact
  const originalInvoke = agent.invoke;

  // Create a wrapper with the same interface
  const wrappedAgent = {
    ...agent,
    invoke: async (input: any, config?: any) => {
      const agentName = agent.name || "UnnamedAgent";
      const startTime = new Date();
      
      if (DEBUG) {
        console.log(`\n===== [${agentName}] STARTING at ${startTime.toISOString()} =====`);
        if (VERBOSE_DEBUG) {
          console.log(`Input: ${JSON.stringify(input, null, 2)}`);
        } else {
          // Simplified logging
          const messageCount = input.messages?.length || 0;
          console.log(`Input: ${messageCount} messages`);
        }
        console.time(`${agentName} execution time`);
      }

      try {
        const result = await originalInvoke(input, config);
        const endTime = new Date();
        const duration = (endTime.getTime() - startTime.getTime()) / 1000;
        
        if (DEBUG) {
          console.timeEnd(`${agentName} execution time`);
          console.log(`\n===== [${agentName}] COMPLETED at ${endTime.toISOString()} =====`);
          console.log(`Duration: ${duration.toFixed(2)}s`);
          
          if (VERBOSE_DEBUG) {
            console.log(`Output: ${JSON.stringify(result, null, 2)}`);
          } else {
            // Simplified output logging
            console.log(`Output: ${extractOutputSummary(result)}`);
          }

          // Track control flow
          if (result.activeAgent) {
            console.log(`\n>>>>> CONTROL PASSED TO: ${result.activeAgent} <<<<<`);
          }
        }

        // Add execution metadata
        result.metadata = {
          ...result.metadata,
          executionTime: duration,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          agent: agentName,
        };

        return result;
      } catch (error) {
        if (DEBUG) {
          console.timeEnd(`${agentName} execution time`);
          console.error(`\n===== [${agentName}] ERROR at ${new Date().toISOString()} =====`);
          console.error(error);
        }
        throw error;
      }
    },
  };

  return wrappedAgent;
}

// Extract a summary of the output for simplified logging
function extractOutputSummary(result: any): string {
  if (!result) return "No result";
  
  let summary = "";
  
  if (result.messages && result.messages.length > 0) {
    summary += `${result.messages.length} messages`;
  }
  
  if (result.activeAgent) {
    summary += `, active agent: ${result.activeAgent}`;
  }
  
  return summary || "Empty result";
}

// Add enhanced tracing middleware to a workflow
export function addTracingMiddleware<T extends HasAddMiddleware>(workflow: T): T {
  workflow.addMiddleware({
    beforeNode: async (nodeName: string, input: any) => {
      if (DEBUG) {
        if (VERBOSE_DEBUG) {
          console.log(`\n${nodeName} RECEIVING:`, JSON.stringify(input, null, 2));
        } else {
          console.log(`\n${nodeName} RECEIVING INPUT (${new Date().toISOString()})`);
        }
      }
      return input;
    },
    afterNode: async (nodeName: string, output: any) => {
      if (DEBUG) {
        if (VERBOSE_DEBUG) {
          console.log(`${nodeName} PRODUCING:`, JSON.stringify(output, null, 2));
        } else {
          const contentSummary = extractContentSummary(output);
          console.log(`${nodeName} PRODUCING OUTPUT: ${contentSummary}`);
        }
      }
      return output;
    },
  });

  return workflow;
}

// Extract a summary of the content for logging
function extractContentSummary(output: any): string {
  if (!output) return "No output";
  
  try {
    // Check if this is a message with content
    if (output.content) {
      const content = typeof output.content === 'string' ? output.content : JSON.stringify(output.content);
      
      // Extract key identifiers
      if (content.includes("Analysis Output:")) return "Analysis Output";
      if (content.includes("Metrics Output:")) return "Metrics Output";
      if (content.includes("Report Output:")) return "Report Output";
      if (content.includes("Evaluation Output:")) return "Evaluation Output";
      
      // If no specific identifier, return a preview
      return content.length > 50 ? content.substring(0, 50) + "..." : content;
    }
    
    // If it's not a message with content, summarize the structure
    return `Object with keys: ${Object.keys(output).join(", ")}`;
  } catch (e) {
    return "Unable to summarize output";
  }
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

// Enhanced categorize outputs with timing and evaluation data
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
    
    const timestamp = msg.created_at || new Date().toISOString();
    const metadata = { id: msg.id, timestamp };

    // Extract evaluation data if this is an evaluation
    let evaluationData = undefined;
    if (content.includes("Evaluation Output:")) {
      try {
        const jsonStart = content.indexOf("{");
        if (jsonStart !== -1) {
          const jsonStr = content.substring(jsonStart);
          evaluationData = JSON.parse(jsonStr);
        }
      } catch (e) {
        console.error("Error parsing evaluation data:", e);
      }
    }

    // Categorize by agent
    if (content.includes("Analysis Output:")) {
      outputsByAgent.SessionAnalyzer.push({ 
        type: "output", 
        content, 
        timestamp, 
        metadata 
      });
    } else if (content.includes("Metrics Output:")) {
      outputsByAgent.MetricsCalculator.push({ 
        type: "output", 
        content, 
        timestamp, 
        metadata 
      });
    } else if (content.includes("Report Output:")) {
      outputsByAgent.ReportGenerator.push({ 
        type: "output", 
        content, 
        timestamp, 
        metadata 
      });
    } else if (content.includes("Evaluation Output:")) {
      outputsByAgent.QualityJudge.push({ 
        type: "evaluation", 
        content, 
        timestamp, 
        metadata,
        evaluationData
      });
    } else if (content.includes("Feedback for Analysis")) {
      outputsByAgent.QualityJudge.push({ 
        type: "feedback", 
        target: "Analysis", 
        content, 
        timestamp, 
        metadata 
      });
    } else if (content.includes("Feedback for Metrics")) {
      outputsByAgent.QualityJudge.push({ 
        type: "feedback", 
        target: "Metrics", 
        content, 
        timestamp, 
        metadata 
      });
    } else if (content.includes("Feedback for Report")) {
      outputsByAgent.QualityJudge.push({ 
        type: "feedback", 
        target: "Report", 
        content, 
        timestamp, 
        metadata 
      });
    }
  });

  return outputsByAgent;
}

// Extract quality evaluations from the swarm outputs
export function extractQualityData(result: { messages?: any[] }): Record<string, QualityEvaluation[]> {
  const outputsByAgent = categorizeOutputs(result);
  const qualityData: Record<string, QualityEvaluation[]> = {
    SessionAnalyzer: [],
    MetricsCalculator: [],
    ReportGenerator: []
  };

  // Extract evaluation data from QualityJudge outputs
  outputsByAgent.QualityJudge
    .filter(output => output.type === 'evaluation' && output.evaluationData)
    .forEach(output => {
      const evalData = output.evaluationData as QualityEvaluation;
      if (evalData && evalData.sourceAgent) {
        if (!qualityData[evalData.sourceAgent]) {
          qualityData[evalData.sourceAgent] = [];
        }
        qualityData[evalData.sourceAgent].push(evalData);
      }
    });

  return qualityData;
}

// Extract workflow steps for visualization and debugging
export function extractWorkflowSteps(result: { messages?: any[] }): WorkflowStep[] {
  const messages = result?.messages || [];
  const steps: WorkflowStep[] = [];

  messages.forEach((msg, index) => {
    const content = extractContent(msg);
    if (!content) return;

    const timestamp = msg.created_at || new Date().toISOString();
    let agent = 'Unknown';
    let action = 'process';
    let targetAgent = undefined;
    let passed = undefined;
    let score = undefined;

    // Determine agent and action type
    if (content.includes("Analysis Output:")) {
      agent = "SessionAnalyzer";
      action = "output";
    } else if (content.includes("Metrics Output:")) {
      agent = "MetricsCalculator";
      action = "output";
    } else if (content.includes("Report Output:")) {
      agent = "ReportGenerator";
      action = "output";
    } else if (content.includes("Evaluation Output:")) {
      agent = "QualityJudge";
      action = "evaluate";
      
      // Extract evaluation details
      try {
        const jsonStart = content.indexOf("{");
        if (jsonStart !== -1) {
          const evalData = JSON.parse(content.substring(jsonStart));
          targetAgent = evalData.sourceAgent;
          passed = evalData.passed;
          score = evalData.score;
        }
      } catch (e) {
        console.error("Error parsing evaluation data:", e);
      }
    } else if (content.includes("Feedback for")) {
      agent = "QualityJudge";
      action = "feedback";
      
      if (content.includes("Feedback for Analysis")) {
        targetAgent = "SessionAnalyzer";
      } else if (content.includes("Feedback for Metrics")) {
        targetAgent = "MetricsCalculator";
      } else if (content.includes("Feedback for Report")) {
        targetAgent = "ReportGenerator";
      }
    } else if (content.includes("Handing off to")) {
      action = "handoff";
      
      // Determine the source agent based on message patterns
      if (content.includes("analysis:")) {
        agent = "SessionAnalyzer";
      } else if (content.includes("metrics:")) {
        agent = "MetricsCalculator";
      } else if (content.includes("report:")) {
        agent = "ReportGenerator";
      } else {
        agent = "QualityJudge";
      }
      
      // Extract target agent from handoff message
      const handoffMatch = content.match(/Handing off to ([A-Za-z]+)/);
      if (handoffMatch && handoffMatch[1]) {
        targetAgent = handoffMatch[1];
      }
    }

    steps.push({
      step: index + 1,
      agent,
      action,
      timestamp,
      targetAgent,
      passed,
      score,
      content: VERBOSE_DEBUG ? content : undefined
    });
  });

  return steps;
}

// Enhanced execution statistics with quality metrics
export function calculateExecutionStats(result: { messages?: any[] }): ExecutionStats {
  const outputsByAgent = categorizeOutputs(result);
  const qualityData = extractQualityData(result);
  const workflowSteps = extractWorkflowSteps(result);

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

  // Calculate quality metrics
  const qualityScores: Record<string, number[]> = {
    SessionAnalyzer: qualityData.SessionAnalyzer?.map(evaluation => evaluation.score) || [],
    MetricsCalculator: qualityData.MetricsCalculator?.map(evaluation => evaluation.score) || [],
    ReportGenerator: qualityData.ReportGenerator?.map(evaluation => evaluation.score) || []
  };
  
  // Calculate average scores
  const averageScores: Record<string, number> = {};
  Object.entries(qualityScores).forEach(([agent, scores]) => {
    if (scores.length > 0) {
      averageScores[agent] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    } else {
      averageScores[agent] = 0;
    }
  });
  
  // Calculate pass rates
  const passRates: Record<string, number> = {};
  Object.entries(qualityData).forEach(([agent, evals]) => {
    if (evals.length > 0) {
      const passCount = evals.filter(evaluation => evaluation.passed).length;
      passRates[agent] = (passCount / evals.length) * 100;
    } else {
      passRates[agent] = 0;
    }
  });
  
  // Calculate duration if timestamps are available
  let duration = undefined;
  if (workflowSteps.length > 0) {
    const firstStep = workflowSteps[0];
    const lastStep = workflowSteps[workflowSteps.length - 1];
    
    if (firstStep.timestamp && lastStep.timestamp) {
      const startTime = new Date(firstStep.timestamp).getTime();
      const endTime = new Date(lastStep.timestamp).getTime();
      duration = (endTime - startTime) / 1000; // in seconds
    }
  }

  return {
    iterations,
    feedbackCounts,
    totalMessages: result?.messages?.length || 0,
    totalFeedback: feedbackCounts.Analysis + feedbackCounts.Metrics + feedbackCounts.Report,
    qualityScores,
    averageScores,
    passRates,
    duration,
    workflowSteps: VERBOSE_DEBUG ? workflowSteps : undefined
  };
}
