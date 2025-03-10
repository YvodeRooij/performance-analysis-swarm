// Test file for future swarm integration
import dotenv from "dotenv";
dotenv.config();

import { analyzeTranscript } from "./tools/analyzeTranscript";
import { evaluateOutput } from "./tools/evaluateOutput";
import { calculateMetrics } from "./tools/calculateMetrics";
import { generateReport } from "./tools/generateReport";
import { consultingInterviewTranscript } from "./transcripts/consultingInterview";

// Verify API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY not found in environment variables. Make sure it's set in the .env file.");
  process.exit(1);
}

/**
 * This is a simplified mock swarm that demonstrates how the components should work together
 * in a proper implementation of the full swarm pipeline.
 */
async function mockSwarmPipeline() {
  console.log("\n=== RUNNING MOCK SWARM PIPELINE ===");
  console.log("This demonstrates how the full swarm should work");
  console.time("fullSwarm");
  
  try {
    // Step 1: SessionAnalyzer - Analyze the transcript
    console.log("\n1. SessionAnalyzer: Analyzing transcript...");
    const analysisResult = await analyzeTranscript.invoke({ 
      transcript: consultingInterviewTranscript 
    });
    console.log("Analysis complete, length:", analysisResult.length);
    
    // Step 2: QualityJudge - Evaluate the analysis
    console.log("\n2. QualityJudge: Evaluating analysis...");
    const evaluationResult = await evaluateOutput.invoke({
      outputType: "Analysis",
      content: analysisResult,
      sourceAgent: "SessionAnalyzer"
    });
    console.log("Evaluation complete");
    
    // Extract evaluation data
    const evaluationData = JSON.parse(evaluationResult.substring(evaluationResult.indexOf('{')));
    const passed = evaluationData.passed;
    const score = evaluationData.score;
    console.log(`Evaluation score: ${score}/10, Passed: ${passed ? "YES" : "NO"}`);
    
    // Step 3: Handle evaluation result
    if (!passed) {
      console.log("\n3. QualityJudge -> SessionAnalyzer: Sending feedback for revision");
      console.log("In the actual swarm, would loop back to SessionAnalyzer for revision");
      
      // For demo, just list some issues
      if (evaluationData.issues && evaluationData.issues.length > 0) {
        console.log("Issues requiring revision:");
        evaluationData.issues.slice(0, 3).forEach((issue: string, i: number) => {
          console.log(`  ${i+1}. ${issue}`);
        });
      }
      
      // For demo purposes, we'll continue the pipeline anyway
      console.log("Continuing pipeline for demonstration purposes...");
    } else {
      console.log("\n3. QualityJudge: Analysis passed quality check, proceeding to metrics");
    }
    
    // Step 4: MetricsCalculator - Calculate metrics from the analysis
    console.log("\n4. MetricsCalculator: Calculating metrics...");
    const metricsResult = await calculateMetrics.invoke({
      analyzedData: analysisResult
    });
    console.log("Metrics calculation complete, length:", metricsResult.length);
    
    // Step 5: QualityJudge - Evaluate the metrics
    console.log("\n5. QualityJudge: Evaluating metrics...");
    const metricsEvaluationResult = await evaluateOutput.invoke({
      outputType: "Metrics",
      content: metricsResult,
      sourceAgent: "MetricsCalculator"
    });
    console.log("Metrics evaluation complete");
    
    // Extract metrics evaluation data
    const metricsEvaluationData = JSON.parse(metricsEvaluationResult.substring(metricsEvaluationResult.indexOf('{')));
    const metricsPassed = metricsEvaluationData.passed;
    const metricsScore = metricsEvaluationData.score;
    console.log(`Metrics evaluation score: ${metricsScore}/10, Passed: ${metricsPassed ? "YES" : "NO"}`);
    
    // Step 6: Handle metrics evaluation result
    if (!metricsPassed) {
      console.log("\n6. QualityJudge -> MetricsCalculator: Sending feedback for revision");
      console.log("In the actual swarm, would loop back to MetricsCalculator for revision");
      
      // For demo purposes, we'll continue the pipeline anyway
      console.log("Continuing pipeline for demonstration purposes...");
    } else {
      console.log("\n6. QualityJudge: Metrics passed quality check, proceeding to report");
    }
    
    // Step 7: ReportGenerator - Generate report from metrics
    console.log("\n7. ReportGenerator: Generating report...");
    const reportResult = await generateReport.invoke({
      metricsData: metricsResult
    });
    console.log("Report generation complete, length:", reportResult.length);
    
    // Step 8: QualityJudge - Evaluate the report
    console.log("\n8. QualityJudge: Evaluating report...");
    const reportEvaluationResult = await evaluateOutput.invoke({
      outputType: "Report",
      content: reportResult,
      sourceAgent: "ReportGenerator"
    });
    console.log("Report evaluation complete");
    
    // Extract report evaluation data
    const reportEvaluationData = JSON.parse(reportEvaluationResult.substring(reportEvaluationResult.indexOf('{')));
    const reportPassed = reportEvaluationData.passed;
    const reportScore = reportEvaluationData.score;
    console.log(`Report evaluation score: ${reportScore}/10, Passed: ${reportPassed ? "YES" : "NO"}`);
    
    // Step 9: Handle report evaluation result
    if (!reportPassed) {
      console.log("\n9. QualityJudge -> ReportGenerator: Sending feedback for revision");
      console.log("In the actual swarm, would loop back to ReportGenerator for revision");
    } else {
      console.log("\n9. QualityJudge: Report passed quality check, pipeline complete");
      
      // Format and display a bit of the report
      try {
        const reportJson = JSON.parse(reportResult.substring(reportResult.indexOf('{')));
        if (reportJson.humanReadable) {
          console.log("\nExcerpt from final report:");
          const lines = reportJson.humanReadable.split('\n').slice(0, 10);
          console.log(lines.join('\n'));
        }
      } catch (e) {
        console.log("Couldn't parse report for preview");
      }
    }
    
    console.timeEnd("fullSwarm");
    console.log("\n=== MOCK SWARM COMPLETE ===");
    console.log("This demonstrates the full pipeline that would be implemented in the LangGraph Swarm");
    console.log("With the custom state schemas, Command.PARENT pattern, and proper handoffs");
    
  } catch (error) {
    console.error("Error in mock swarm pipeline:", error);
  }
}

// Run the mock swarm pipeline if this file is executed directly
if (require.main === module) {
  mockSwarmPipeline().catch((err) => {
    console.error("Error in mock swarm execution:", err);
    process.exit(1);
  });
}