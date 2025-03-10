// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { MemorySaver, InMemoryStore, StateGraph } from "@langchain/langgraph";
import { addActiveAgentRouter, swarmRouterSchema } from "@langchain/langgraph-swarm";
import { SwarmState } from "./utils/agentInstrumentation";
import { callSessionAnalyzer } from "./agents/sessionAnalyzer";
import { callMetricsCalculator } from "./agents/metricsCalculator";
import { callReportGenerator } from "./agents/reportGenerator";
import { callQualityJudge } from "./agents/qualityJudge";
import { 
  categorizeOutputs, 
  calculateExecutionStats,
  extractQualityData,
  extractWorkflowSteps,
  addTracingMiddleware
} from "./utils/agentInstrumentation";
import crypto from "crypto";
import { consultingInterviewTranscript } from "./transcripts/consultingInterview";
import { mockAnalysis } from "./mocks/mockAnalysis";
import { BaseMessage } from "@langchain/core/messages";

// Verify that the API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY not found in environment variables. Make sure it's set in the .env file.");
}

// Set up debug environment variables if not provided
const DEBUG_AGENTS = process.env.DEBUG_AGENTS === 'true';
const VERBOSE_DEBUG = process.env.VERBOSE_DEBUG === 'true';
const SHOW_QUALITY_DETAILS = process.env.SHOW_QUALITY_DETAILS === 'true';
const SHOW_WORKFLOW_STEPS = process.env.SHOW_WORKFLOW_STEPS === 'true';
const USE_MOCK_DATA = process.env.USE_MOCK_DATA === 'true';

// Define enhanced result interface
interface EnhancedSwarmResult {
  result: any;
  outputsByAgent: ReturnType<typeof categorizeOutputs>;
  executionStats: ReturnType<typeof calculateExecutionStats>;
  qualityData: ReturnType<typeof extractQualityData>;
  workflowSteps: ReturnType<typeof extractWorkflowSteps>;
  finalOutputs: {
    analysis: string | null;
    metrics: string | null;
    report: string | null;
  };
}

// Create the storage components
const checkpointer = new MemorySaver();
const store = new InMemoryStore();

// Log setup details
console.log("Setting up workflow with agents...");
console.log("Using OpenAI API key:", process.env.OPENAI_API_KEY ? "Key available" : "NO KEY FOUND - CHECK ENV");
console.log("Using model configuration:", {
  SESSION_ANALYZER_MODEL: process.env.SESSION_ANALYZER_MODEL || "gpt-4o",
  METRICS_CALCULATOR_MODEL: process.env.METRICS_CALCULATOR_MODEL || "gpt-4o",
  REPORT_GENERATOR_MODEL: process.env.REPORT_GENERATOR_MODEL || "gpt-4o",
  QUALITY_JUDGE_MODEL: process.env.QUALITY_JUDGE_MODEL || "gpt-4o",
});

// Create the custom workflow with manual connections
const workflow = new StateGraph<typeof SwarmState.State>({
  channels: SwarmState,
});

// Add agent nodes
workflow.addNode("SessionAnalyzer", callSessionAnalyzer);
workflow.addNode("QualityJudge", callQualityJudge);
workflow.addNode("MetricsCalculator", callMetricsCalculator);
workflow.addNode("ReportGenerator", callReportGenerator);

// Add tracing middleware
if (DEBUG_AGENTS) {
  addTracingMiddleware(workflow);
}

// Add the activeAgent router with all connections
workflow = addActiveAgentRouter(workflow, {
  routeTo: ["SessionAnalyzer", "QualityJudge", "MetricsCalculator", "ReportGenerator"],
  defaultActiveAgent: "SessionAnalyzer",
  stateKey: "activeAgent",
});

// Compile the workflow
const app = workflow.compile({
  checkpointer,
  store
});

/**
 * Runs the enhanced swarm with a given transcript
 * @param transcript - The interview transcript to analyze
 * @returns - The results of the swarm execution
 */
export async function runEnhancedSwarm(transcript: string): Promise<EnhancedSwarmResult> {
  const thread_id = crypto.randomUUID();
  const config = {
    configurable: {
      thread_id,
      timeout_ms: parseInt(process.env.MAX_TIMEOUT_MS || "300000"), // Use configured timeout
      recursion_limit: 25, // Set higher recursion limit for complex workflows
      agent_executor: {
        maxIterations: 10, // Increase max iterations per agent
      }
    },
  };

  // If using mock data, set up a simplified flow for testing
  let initialInput = {
    messages: [
      {
        type: "human",
        content: `Analyze this interview transcript thoroughly: ${transcript.substring(0, 100)}... [Transcript of ${transcript.length} characters]`,
      },
    ] as unknown as BaseMessage[],
    activeAgent: "SessionAnalyzer",
    analysis: "",
    metrics: "",
    report: "",
    evaluationPassed: false,
    evaluationScore: 0,
    feedbackReceived: "",
    needsRevision: false,
    completedSteps: [] as string[]
  };

  if (USE_MOCK_DATA) {
    console.log("Using mock data for testing...");
    console.log("Mock data enabled: will use predefined analysis results");
    
    const mockAnalysisString = mockAnalysis.analysis;
    console.log("Mock analysis sample:", mockAnalysisString.substring(0, 100) + "...");
    
    initialInput = {
      ...initialInput,
      messages: [
        {
          type: "human",
          content: "Analyze this transcript [MOCK DATA]",
        },
        {
          type: "ai",
          content: mockAnalysisString,
        }
      ] as unknown as BaseMessage[],
      analysis: mockAnalysisString
    };
  }

  console.log("Starting swarm execution...");
  console.time("swarmExecution");

  try {
    // Execute the swarm workflow
    const result = await app.invoke(initialInput, config);
    console.timeEnd("swarmExecution");

    // Process and organize the results with enhanced metrics
    const outputsByAgent = categorizeOutputs(result);
    const executionStats = calculateExecutionStats(result);
    const qualityData = extractQualityData(result);
    const workflowSteps = extractWorkflowSteps(result);

    // Extract final outputs
    const findFinalOutput = (outputs: Array<{ type: string; content: string }>): string | null => {
      return outputs.length > 0 ? outputs[outputs.length - 1].content : null;
    };

    const finalAnalysis = findFinalOutput(outputsByAgent.SessionAnalyzer) || result.analysis;
    const finalMetrics = findFinalOutput(outputsByAgent.MetricsCalculator) || result.metrics;
    const finalReport = findFinalOutput(outputsByAgent.ReportGenerator) || result.report;

    // Format final report for display
    let formattedReport = null;
    if (finalReport) {
      try {
        // Extract the JSON part if it exists
        if (finalReport.includes("{")) {
          const reportJson = JSON.parse(finalReport.substring(finalReport.indexOf("{")));
          formattedReport = reportJson.humanReadable || JSON.stringify(reportJson, null, 2);
        } else {
          // Just use the text as is
          formattedReport = finalReport;
        }
      } catch (error) {
        console.error("Error formatting report:", error);
        formattedReport = finalReport;
      }
    }
    
    // Debug log raw results
    if (DEBUG_AGENTS) {
      console.log("\n=== DEBUG: RAW OUTPUT SUMMARY ===");
      console.log("Analysis count:", outputsByAgent.SessionAnalyzer?.length || 0);
      console.log("QualityJudge count:", outputsByAgent.QualityJudge?.length || 0);
      console.log("Metrics count:", outputsByAgent.MetricsCalculator?.length || 0);
      console.log("Report count:", outputsByAgent.ReportGenerator?.length || 0);
      
      if (outputsByAgent.QualityJudge?.length > 0) {
        console.log("\nLast QualityJudge output:", outputsByAgent.QualityJudge[outputsByAgent.QualityJudge.length - 1].content.substring(0, 200) + "...");
      }
      
      // Log the completed steps
      console.log("\n=== COMPLETED STEPS ===");
      result.completedSteps.forEach((step, idx) => {
        console.log(`${idx + 1}. ${step}`);
      });
    }

    return {
      result,
      outputsByAgent,
      executionStats,
      qualityData,
      workflowSteps,
      finalOutputs: {
        analysis: finalAnalysis,
        metrics: finalMetrics,
        report: formattedReport,
      },
    };
  } catch (error) {
    console.error("Error in swarm execution:", error);
    throw error;
  }
}

/**
 * Formats quality evaluation data for display
 * @param qualityData - The quality evaluation data
 * @returns A formatted string for display
 */
function formatQualityData(qualityData: ReturnType<typeof extractQualityData>): string {
  let output = "";
  
  for (const [agent, evals] of Object.entries(qualityData)) {
    if (evals.length === 0) continue;
    
    output += `\n== ${agent} Quality Evaluations ==\n`;
    
    evals.forEach((evaluation, idx) => {
      output += `\nEvaluation #${idx + 1}:\n`;
      output += `- Score: ${evaluation.score.toFixed(1)}\n`;
      output += `- Passed: ${evaluation.passed ? "YES" : "NO"}\n`;
      
      if (evaluation.issues && evaluation.issues.length > 0) {
        output += "- Issues:\n";
        evaluation.issues.forEach((issue, i) => {
          if (issue && issue.trim && issue.trim()) {
            output += `  ${i + 1}. ${issue.trim()}\n`;
          }
        });
      }
      
      if (evaluation.feedbackCounts && Object.keys(evaluation.feedbackCounts).length > 0) {
        output += "- Issue Types:\n";
        for (const [type, count] of Object.entries(evaluation.feedbackCounts)) {
          output += `  ${type}: ${count}\n`;
        }
      }
    });
  }
  
  return output;
}

/**
 * Format workflow steps for display
 * @param steps - The workflow steps to format
 * @returns A formatted string for display
 */
function formatWorkflowSteps(steps: ReturnType<typeof extractWorkflowSteps>): string {
  let output = "\n== Workflow Execution Steps ==\n";
  
  steps.forEach((step, idx) => {
    output += `\n${idx + 1}. [${new Date(step.timestamp).toLocaleTimeString()}] ${step.agent || "Unknown"} -> ${step.action}`;
    
    if (step.targetAgent) {
      output += ` -> ${step.targetAgent}`;
    }
    
    if (step.passed !== undefined) {
      output += ` (${step.passed ? "PASSED" : "FAILED"}`;
      if (step.score !== undefined) {
        output += ` with score ${step.score.toFixed(1)}`;
      }
      output += ")";
    }
  });
  
  return output;
}

// Run the swarm with the sample transcript
async function main(): Promise<void> {
  try {
    console.log("Starting main execution with full transcript...");
    const results = await runEnhancedSwarm(consultingInterviewTranscript);

    console.log("\n=== EXECUTION COMPLETE ===");
    console.log("Duration:", results.executionStats.duration?.toFixed(2) + "s");
    
    // Display quality statistics
    console.log("\n=== QUALITY CONTROL STATISTICS ===");
    console.log("Average Quality Scores:");
    for (const [agent, score] of Object.entries(results.executionStats.averageScores)) {
      console.log(`- ${agent}: ${score.toFixed(2)}/10`);
    }
    
    console.log("\nPass Rates:");
    for (const [agent, rate] of Object.entries(results.executionStats.passRates)) {
      console.log(`- ${agent}: ${rate.toFixed(1)}%`);
    }
    
    console.log("\nRevision Iterations:");
    for (const [type, count] of Object.entries(results.executionStats.feedbackCounts)) {
      console.log(`- ${type}: ${count} revisions`);
    }

    // Display agent output summary
    console.log("\n=== AGENT OUTPUTS SUMMARY ===");
    console.log("SessionAnalyzer outputs:", results.outputsByAgent.SessionAnalyzer?.length || 0);
    console.log("MetricsCalculator outputs:", results.outputsByAgent.MetricsCalculator?.length || 0);
    console.log("ReportGenerator outputs:", results.outputsByAgent.ReportGenerator?.length || 0);
    
    const evaluations = results.outputsByAgent.QualityJudge?.filter(o => o.type === "evaluation")?.length || 0;
    const feedback = results.outputsByAgent.QualityJudge?.filter(o => o.type === "feedback")?.length || 0;
    
    console.log("QualityJudge evaluations:", evaluations);
    console.log("QualityJudge feedback:", feedback);

    // Show detailed quality evaluations
    if (SHOW_QUALITY_DETAILS) {
      console.log("\n=== DETAILED QUALITY EVALUATIONS ===");
      console.log(formatQualityData(results.qualityData));
    }
    
    // Show workflow steps
    if (SHOW_WORKFLOW_STEPS) {
      console.log(formatWorkflowSteps(results.workflowSteps));
    }

    // Show final report
    if (!results.finalOutputs.report) {
      console.log("\n=== WARNING: NO FINAL REPORT GENERATED ===");
      console.log("Check if the workflow completed properly.");

      // Show last outputs for debugging
      if (results.finalOutputs.analysis) {
        console.log("\nLast analysis available:", results.finalOutputs.analysis.substring(0, 100) + "...");
      }

      if (results.finalOutputs.metrics) {
        console.log("\nLast metrics available:", results.finalOutputs.metrics.substring(0, 100) + "...");
      }
    } else {
      console.log("\n=== FINAL REPORT ===");
      console.log(results.finalOutputs.report);
    }
  } catch (error) {
    console.error("Error in main execution:", error);
  }
}

// Export for external use
export { app, main, formatQualityData, formatWorkflowSteps };

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Error in main execution:", err);
    process.exit(1);
  });
}