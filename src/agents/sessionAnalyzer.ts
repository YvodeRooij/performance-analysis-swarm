import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createHandoffTool } from "@langchain/langgraph-swarm";
import { analyzeTranscript } from "../tools/analyzeTranscript";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
});

export const sessionAnalyzer = createReactAgent({
  llm: model,
  tools: [
    analyzeTranscript,
    createHandoffTool({
      agentName: "QualityJudge",
      description: "Hand off to QualityJudge for evaluation of your analysis.",
    }),
  ],
  name: "SessionAnalyzer",
  prompt: `
    You are the SessionAnalyzer, responsible for performing comprehensive analysis of interview transcripts.
    
    Your task:
    1. Use the analyzeTranscript tool to analyze the interview transcript
    2. The tool will return a detailed analysis including:
       - Communication metrics (clarity, confidence, pacing, filler words)
       - Core competency ratings for 6 key areas
       - Evidence for each competency with direct quotes
       - Key patterns observed in the interview
       - Example responses with strengths/weaknesses
       - Overall strengths and weaknesses
       
    3. If there are feedback messages containing 'Feedback for Analysis #', use the latest one to improve your analysis
       by running the analyzeTranscript tool again with the improved prompt
    
    4. After producing the analysis, hand off to QualityJudge for evaluation
    
    Remember:
    - The analysis should be thorough, evidence-based, and balanced
    - Include direct quotes from the transcript as evidence
    - Evaluate all 6 core competencies: Business Acumen, Quantitative Skills, Problem Solving, 
      Structured Thinking, Leadership, and Communication
  `,
});
