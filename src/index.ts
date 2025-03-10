// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();

import { MemorySaver } from "@langchain/langgraph";
import { createSwarm } from "@langchain/langgraph-swarm";
import { sessionAnalyzer } from "./agents/sessionAnalyzer";
import { metricsCalculator } from "./agents/metricsCalculator";
import { reportGenerator } from "./agents/reportGenerator";
import { qualityJudge } from "./agents/qualityJudge";
import { categorizeOutputs, calculateExecutionStats } from "./utils/agentInstrumentation";
import crypto from "crypto";
import { consultingInterviewTranscript } from "./transcripts/consultingInterview";

// Verify that the API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY not found in environment variables. Make sure it's set in the .env file.");
}

// Define result interface
interface EnhancedSwarmResult {
  result: any;
  outputsByAgent: ReturnType<typeof categorizeOutputs>;
  executionStats: ReturnType<typeof calculateExecutionStats>;
  finalOutputs: {
    analysis: string | null;
    metrics: string | null;
    report: string;
  };
}

// Create and configure the workflow - SIMPLE APPROACH
const checkpointer = new MemorySaver();
const workflow = createSwarm({
  agents: [sessionAnalyzer, metricsCalculator, reportGenerator, qualityJudge],
  defaultActiveAgent: "SessionAnalyzer",
});

// Compile the application
const app = workflow.compile({ checkpointer });

/**
 * Runs the enhanced swarm with a given transcript
 * @param transcript - The interview transcript to analyze
 * @returns - The results of the swarm execution
 */
export async function runEnhancedSwarm(transcript: string): Promise<EnhancedSwarmResult> {
  const config = {
    configurable: {
      thread_id: crypto.randomUUID(),
      timeout_ms: 300000, // 5 minutes timeout
    },
  };

  const initialInput = {
    messages: [
      {
        role: "user",
        content: `Analyze this transcript: ${transcript}`,
      },
    ],
  };

  console.log("Starting swarm execution...");
  console.time("swarmExecution");

  try {
    // Execute the swarm workflow
    const result = await app.invoke(initialInput, config);
    console.timeEnd("swarmExecution");

    // Process and organize the results
    const outputsByAgent = categorizeOutputs(result);
    const executionStats = calculateExecutionStats(result);

    // Extract final outputs
    const findFinalOutput = (outputs: Array<{ type: string; content: string }>): string | null => {
      return outputs.length > 0 ? outputs[outputs.length - 1].content : null;
    };

    const finalAnalysis = findFinalOutput(outputsByAgent.SessionAnalyzer);
    const finalMetrics = findFinalOutput(outputsByAgent.MetricsCalculator);
    const finalReport = findFinalOutput(outputsByAgent.ReportGenerator);

    // Format final report for display
    let formattedReport = "No report generated";
    if (finalReport) {
      try {
        // Extract the JSON part
        const reportJson = JSON.parse(finalReport.substring(finalReport.indexOf("{")));
        formattedReport = reportJson.humanReadable || JSON.stringify(reportJson, null, 2);
      } catch (error) {
        console.error("Error formatting report:", error);
        formattedReport = finalReport;
      }
    }

    return {
      result,
      outputsByAgent,
      executionStats,
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

// Run the swarm with the sample transcript
async function main(): Promise<void> {
  try {
    console.log("Starting main execution with full transcript...");
    const results = await runEnhancedSwarm(consultingInterviewTranscript);

    console.log("\n=== EXECUTION COMPLETE ===");
    console.log("Execution Stats:", results.executionStats);

    console.log("\n=== AGENT OUTPUTS SUMMARY ===");
    console.log("SessionAnalyzer outputs:", results.outputsByAgent.SessionAnalyzer.length);
    console.log("MetricsCalculator outputs:", results.outputsByAgent.MetricsCalculator.length);
    console.log("ReportGenerator outputs:", results.outputsByAgent.ReportGenerator.length);
    console.log("QualityJudge outputs:", results.outputsByAgent.QualityJudge.length);

    if (results.finalOutputs.report === "No report generated") {
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
export { app, main };

// Run the main function if this file is executed directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Error in main execution:", err);
    process.exit(1);
  });
}
