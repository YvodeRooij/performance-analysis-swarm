import { MemorySaver } from "@langchain/langgraph";
import { createSwarm } from "@langchain/langgraph-swarm";
import { sessionAnalyzer } from "./agents/sessionAnalyzer";
import { metricsCalculator } from "./agents/metricsCalculator";
import { reportGenerator } from "./agents/reportGenerator";
import { qualityJudge } from "./agents/qualityJudge";
import { consultingInterviewTranscript } from "./transcripts/consultingInterview";

const checkpointer = new MemorySaver();
const workflow = createSwarm({
  agents: [sessionAnalyzer, metricsCalculator, reportGenerator, qualityJudge],
  defaultActiveAgent: "SessionAnalyzer",
});

const app = workflow.compile({ checkpointer });

async function runSwarm() {
  const config = { configurable: { thread_id: "1" } };
  const initialInput = {
    messages: [
      {
        role: "user",
        content: `Analyze this transcript: ${consultingInterviewTranscript}`,
      },
    ],
  };
  try {
    // Get the swarm result
    const result = await app.invoke(initialInput, config);

    // Comprehensive debug logging of raw result structure
    console.log(
      "Result structure:",
      JSON.stringify(
        {
          resultType: typeof result,
          hasMessages: result && "messages" in result,
          messageCount: result?.messages?.length || 0,
          keys: result ? Object.keys(result) : [],
        },
        null,
        2
      )
    );

    // Handle potential different result structures
    const messages = result?.messages || [];
    if (!Array.isArray(messages)) {
      console.error("Invalid messages structure:", messages);
      return;
    }

    console.log(`Total messages received: ${messages.length}`);

    // Show a sample of messages to understand structure
    if (messages.length > 0) {
      console.log("First message sample:", JSON.stringify(messages[0], null, 2));
      console.log("Last message sample:", JSON.stringify(messages[messages.length - 1], null, 2));
    }

    // More robust content extraction
    const extractContent = (msg: any): string | null => {
      if (!msg) return null;

      if (typeof msg.content === "string") {
        return msg.content;
      }

      // Handle potential array content (used in some LLM frameworks)
      if (Array.isArray(msg.content)) {
        return msg.content
          .map((item: { text: any }) => (typeof item === "string" ? item : item && typeof item.text === "string" ? item.text : JSON.stringify(item)))
          .join("\n");
      }

      // Last resort - try to stringify the content
      try {
        return JSON.stringify(msg.content);
      } catch (e) {
        return null;
      }
    };

    // Get all messages with extractable content
    const contentMessages = messages.map((msg) => ({ msg, content: extractContent(msg) })).filter((item) => item.content !== null) as {
      msg: any;
      content: string;
    }[];

    console.log(`Messages with extractable content: ${contentMessages.length}`);

    // More flexible output identification
    const outputs = contentMessages.filter(
      ({ content }) => content.includes("Output:") || content.includes("Analysis:") || content.includes("Metrics:") || content.includes("Report:")
    );

    const feedback = contentMessages.filter(({ content }) => content.includes("Feedback for") || content.includes("feedback:"));

    console.log(`Found ${outputs.length} outputs and ${feedback.length} feedback messages`);

    // Extract final outputs with more flexible patterns
    const findOutput = (pattern: string | RegExp) => {
      const match = [...outputs].reverse().find(({ content }) => (typeof pattern === "string" ? content.includes(pattern) : pattern.test(content)));
      return match ? match.content : "None";
    };

    const finalAnalysis = findOutput(/Analysis Output:|Analysis:/);
    const finalMetrics = findOutput(/Metrics Output:|Metrics:/);
    const finalReport = findOutput(/Report Output:|Report:/);

    console.log("Final Analysis:", finalAnalysis);
    console.log(
      "Feedback for Analysis:",
      feedback
        .filter(({ content }) => content.includes("Analysis"))
        .map(({ content }) => content)
        .join("\n") || "None"
    );

    console.log("Final Metrics:", finalMetrics);
    console.log(
      "Feedback for Metrics:",
      feedback
        .filter(({ content }) => content.includes("Metrics"))
        .map(({ content }) => content)
        .join("\n") || "None"
    );

    // Debug the report content before trying to parse it
    console.log("Raw report content:", finalReport);

    // Significantly improved report parsing
    if (finalReport !== "None") {
      try {
        // General approach to extract JSON from a string
        const potentialJson = (text: string) => {
          // Find all sequences that look like JSON objects
          const jsonMatches = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g) || [];
          if (jsonMatches.length > 0) {
            // Try each match, starting with the longest (most likely to be complete)
            const sortedMatches = [...jsonMatches].sort((a, b) => b.length - a.length);
            for (const match of sortedMatches) {
              try {
                return JSON.parse(match);
              } catch (e) {
                // Continue to next match if parsing fails
              }
            }
          }
          return null;
        };

        // Try to extract JSON from the report
        const parsedReport = potentialJson(finalReport);

        if (parsedReport) {
          console.log(
            "Final Report:",
            parsedReport.humanReadable || parsedReport.report || parsedReport.content || JSON.stringify(parsedReport, null, 2)
          );
        } else {
          // If no valid JSON found, just show the text with some formatting
          console.log("Final Report (text format):", finalReport.replace("Report Output:", "").trim());
        }
      } catch (parseError) {
        console.error("Error processing report:", parseError);
        console.log("Final Report (raw):", finalReport);
      }
    } else {
      console.log("Final Report: None");
    }

    console.log(
      "Feedback for Report:",
      feedback
        .filter(({ content }) => content.includes("Report"))
        .map(({ content }) => content)
        .join("\n") || "None"
    );
  } catch (error) {
    console.error("Error running swarm:", error);
    // Print more details about the error
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
  }
}

runSwarm();
