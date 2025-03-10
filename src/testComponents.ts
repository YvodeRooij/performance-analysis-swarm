// Test the individual components of the Performance Analysis Swarm
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

// Test configuration
const TRANSCRIPT = consultingInterviewTranscript;
const TRIM_LENGTH = 100; // For preview output

// Test the analyze transcript tool
async function testAnalysisComponent() {
  console.log("\n=== TESTING TRANSCRIPT ANALYSIS ===");
  console.log(`Analyzing transcript of length: ${TRANSCRIPT.length} characters...`);
  console.time("analysis");
  
  try {
    // Access the invoke method on the tool
    const result = await analyzeTranscript.invoke({ transcript: TRANSCRIPT });
    console.timeEnd("analysis");
    
    // Preview the result
    console.log(`Analysis complete, output length: ${result.length} characters`);
    console.log(`Preview: ${result.substring(0, TRIM_LENGTH)}...`);
    
    return result;
  } catch (error) {
    console.error("Error in analysis:", error);
    return null;
  }
}

// Test the quality evaluation tool
async function testQualityComponent(analysisOutput: string) {
  console.log("\n=== TESTING QUALITY EVALUATION ===");
  console.log("Evaluating analysis output...");
  console.time("evaluation");
  
  try {
    // Access the invoke method on the tool
    const result = await evaluateOutput.invoke({ 
      outputType: "Analysis", 
      content: analysisOutput, 
      sourceAgent: "SessionAnalyzer" 
    });
    console.timeEnd("evaluation");
    
    // Preview the result
    console.log(`Evaluation complete, output length: ${result.length} characters`);
    console.log(`Preview: ${result.substring(0, TRIM_LENGTH)}...`);
    
    // Extract and display the evaluation score
    try {
      const evaluationJson = JSON.parse(result.substring(result.indexOf('{')));
      console.log(`\nEvaluation score: ${evaluationJson.score}/10`);
      console.log(`Passed: ${evaluationJson.passed ? "YES" : "NO"}`);
      
      if (evaluationJson.issues && evaluationJson.issues.length > 0) {
        console.log("\nTop issues:");
        evaluationJson.issues.slice(0, 3).forEach((issue: string, i: number) => {
          console.log(`  ${i+1}. ${issue}`);
        });
      }
    } catch (e) {
      console.log("Could not parse evaluation JSON");
    }
    
    return result;
  } catch (error) {
    console.error("Error in evaluation:", error);
    return null;
  }
}

// Test the metrics calculator tool
async function testMetricsComponent(analysisOutput: string) {
  console.log("\n=== TESTING METRICS CALCULATION ===");
  console.log("Calculating metrics from analysis...");
  console.time("metrics");
  
  try {
    // Access the invoke method on the tool
    const result = await calculateMetrics.invoke({ 
      analyzedData: analysisOutput
    });
    console.timeEnd("metrics");
    
    // Preview the result
    console.log(`Metrics calculation complete, output length: ${result.length} characters`);
    console.log(`Preview: ${result.substring(0, TRIM_LENGTH)}...`);
    
    return result;
  } catch (error) {
    console.error("Error in metrics calculation:", error);
    return null;
  }
}

// Test the report generator tool
async function testReportComponent(metricsOutput: string) {
  console.log("\n=== TESTING REPORT GENERATION ===");
  console.log("Generating report from metrics...");
  console.time("report");
  
  try {
    // Access the invoke method on the tool
    const result = await generateReport.invoke({ 
      metricsData: metricsOutput
    });
    console.timeEnd("report");
    
    // Preview the result
    console.log(`Report generation complete, output length: ${result.length} characters`);
    console.log(`Preview: ${result.substring(0, TRIM_LENGTH)}...`);
    
    return result;
  } catch (error) {
    console.error("Error in report generation:", error);
    return null;
  }
}

// Run the component tests
async function runComponentTests() {
  console.log("Starting component tests...");
  
  // Test Analysis
  const analysisResult = await testAnalysisComponent();
  if (!analysisResult) {
    console.error("Analysis component test failed, cannot proceed to quality evaluation");
    return;
  }
  
  // Test Quality Evaluation
  const evaluationResult = await testQualityComponent(analysisResult);
  if (!evaluationResult) {
    console.error("Quality evaluation component test failed");
    return;
  }
  
  // Test Metrics Calculation
  const metricsResult = await testMetricsComponent(analysisResult);
  if (!metricsResult) {
    console.error("Metrics calculation component test failed");
    return;
  }
  
  // Test Report Generation
  const reportResult = await testReportComponent(metricsResult);
  if (!reportResult) {
    console.error("Report generation component test failed");
    return;
  }
  
  console.log("\n=== COMPONENT TESTS COMPLETE ===");
  console.log("All individual components are working successfully!");
  console.log("The swarm has been reimplemented with proper handoff mechanisms for full integration");
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runComponentTests().catch((err) => {
    console.error("Error in component tests:", err);
    process.exit(1);
  });
}