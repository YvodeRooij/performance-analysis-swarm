import { MemorySaver } from "@langchain/langgraph";
import { createSwarm } from "@langchain/langgraph-swarm";
import { sessionAnalyzer } from "./agents/sessionAnalyzer";
import { metricsCalculator } from "./agents/metricsCalculator";
import { reportGenerator } from "./agents/reportGenerator";
import { consultingInterviewTranscript } from "./transcripts/consultingInterview";

const checkpointer = new MemorySaver();
const workflow = createSwarm({
  agents: [sessionAnalyzer, metricsCalculator, reportGenerator],
  defaultActiveAgent: "SessionAnalyzer",
});

export const app = workflow.compile({ checkpointer });

const INPUT_TOKEN_COST = 0.0005 / 1000; // $ per token
const OUTPUT_TOKEN_COST = 0.0015 / 1000; // $ per token

async function runSwarm() {
  const config = { configurable: { thread_id: "1" } };
  const initialInput = {
    messages: [{ role: "user", content: `Analyze this transcript: ${consultingInterviewTranscript}` }],
  };
  try {
    const result = await app.invoke(initialInput, config);
    // Extract key outputs
    const analysis = result.messages.find((m) => m.name === "analyze_transcript")?.content;
    const metrics = result.messages.find((m) => m.name === "calculate_metrics")?.content;
    const report = result.messages.find((m) => m.name === "generate_report")?.content;

    // Calculate total tokens and cost
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    result.messages.forEach((m) => {
      if (m.response_metadata?.tokenUsage) {
        totalInputTokens += m.response_metadata.tokenUsage.promptTokens || 0;
        totalOutputTokens += m.response_metadata.tokenUsage.completionTokens || 0;
      }
    });
    const totalCost = totalInputTokens * INPUT_TOKEN_COST + totalOutputTokens * OUTPUT_TOKEN_COST;

    console.log("Step 1 - Analysis Output:", analysis);
    console.log("Step 2 - Metrics Output:", metrics);
    console.log("Step 3 - Report Output:", report ? JSON.parse(report as string).humanReadable : "No report generated");
    console.log(`Total Input Tokens: ${totalInputTokens}`);
    console.log(`Total Output Tokens: ${totalOutputTokens}`);
    console.log(`Estimated Cost: $${totalCost.toFixed(4)}`);
  } catch (error) {
    console.error("Error running swarm:", error);
  }
}

runSwarm();
