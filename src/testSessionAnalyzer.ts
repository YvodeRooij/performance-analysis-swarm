// src/testSessionAnalyzer.ts
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { analyzeTranscript } from "./tools/analyzeTranscript";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

const agent = createReactAgent({
  llm: model,
  tools: [analyzeTranscript],
  name: "SessionAnalyzer",
  prompt: "You are the Session Analyzer. Analyze the provided transcript using the analyzeTranscript tool."
});

async function testAgent() {
  const result = await agent.invoke({
    messages: [{ role: "user", content: "Analyze this transcript: I explained, um, the solution." }]
  });
  console.log("Result:", result);
}

testAgent();