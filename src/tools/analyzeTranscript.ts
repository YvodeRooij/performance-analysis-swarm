import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { enhancedAnalysisSchema } from "../schemas/analysisSchema";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use gpt-4o for the analysis to ensure high-quality, evidence-based output
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
});

export const analyzeTranscript = tool(
  async ({ transcript }: { transcript: string }): Promise<string> => {
    // Create a more explicit prompt with schema format and evidence-first approach
    const prompt = `
      Perform a comprehensive analysis of this interview transcript using an EVIDENCE-FIRST approach.
      
      EVIDENCE-FIRST APPROACH:
      1. First, collect ALL relevant quotes from the transcript for each competency
      2. For EACH quote, analyze both strengths AND limitations
      3. Only AFTER evidence collection, assign ratings based on evidence quantity and quality
      4. Ensure ratings follow this calibration:
         - 9-10 = Exceptional (rare, requires multiple impressive examples)
         - 7-8 = Strong (solid evidence of competency)
         - 5-6 = Competent (basic demonstration)
         - 3-4 = Developing (minimal evidence)
         - 1-2 = Needs improvement (concerning evidence)
      5. Ensure EVERY competency has BOTH strengths AND limitations identified
      
      EVIDENCE REQUIREMENTS:
      - Every competency score 8+ MUST have at least 3 specific evidence examples
      - Every competency score 6-7 MUST have at least 2 specific evidence examples
      - Every competency score below 6 MUST have at least 1 specific evidence example
      
      YOU MUST return your analysis as a valid JSON object with EXACTLY these fields:
      
      {
        "communicationMetrics": {
          "clarity": number (1-10),
          "confidence": number (1-10),
          "pacing": number (1-10),
          "fillerWords": {
            "frequency": number,
            "examples": string[]
          }
        },
        "coreCompetencies": {
          "businessAcumen": number (1-10),
          "quantitativeSkills": number (1-10),
          "problemSolving": number (1-10),
          "structuredThinking": number (1-10),
          "leadership": number (1-10),
          "communication": number (1-10)
        },
        "evidenceByCompetency": {
          "businessAcumen": [
            {
              "quote": string,
              "analysis": string,
              "strength": boolean
            }
          ],
          "quantitativeSkills": [
            {
              "quote": string,
              "analysis": string,
              "strength": boolean
            }
          ],
          "problemSolving": [...],
          "structuredThinking": [...],
          "leadership": [...],
          "communication": [...]
        },
        "keyPatterns": [
          {
            "pattern": string,
            "frequency": string,
            "impact": string
          }
        ],
        "strengths": string[],
        "weaknesses": string[],
        "exampleResponses": [
          {
            "question": string (optional),
            "response": string,
            "strengths": string[],
            "weaknesses": string[]
          }
        ]
      }
      
      IMPORTANT REQUIREMENTS:
      1. Include BOTH strengths AND limitations for EACH competency
      2. Use DIRECT QUOTES from the transcript as evidence
      3. Be CRITICAL and BALANCED in your assessment
      4. Do not inflate scores - they must match the evidence quality and quantity
      5. Make sure to include ALL fields with appropriate values
      
      Here is the transcript to analyze:
      ${transcript}
    `;

    try {
      const response = await model.invoke(prompt);
      let content = response.content.toString();

      // Log the raw response for debugging
      console.log("Raw LLM output for analysis:");
      console.log(content);

      // Extract JSON from the response, even if it's wrapped in markdown code blocks
      content = content.replace(/```json\n|\n```|```/g, "").trim();

      // Try to parse the JSON
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.log("Content that failed to parse:", content);

        // Try to extract JSON if it's embedded in text
        const jsonRegex = /\{[\s\S]*\}/g;
        const match = content.match(jsonRegex);
        if (match && match[0]) {
          try {
            parsed = JSON.parse(match[0]);
          } catch (e: unknown) {
            const error = e instanceof Error ? e : new Error(String(e));
            throw new Error(`Failed to extract valid JSON from response: ${error.message}`);
          }
        } else {
          throw new Error("Could not find valid JSON in LLM response");
        }
      }

      // Validate against the schema with better error messages
      try {
        enhancedAnalysisSchema.parse(parsed);
      } catch (validationError) {
        console.error("Schema validation error:", validationError);

        // Instead of using a fallback, throw an error to ensure quality
        throw new Error(`Analysis failed schema validation: ${JSON.stringify(validationError, null, 2)}`);
      }

      return `Analysis Output: ${JSON.stringify(parsed)}`;
    } catch (error: unknown) {
      console.error("Error in analyze_transcript:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error details:", errorMessage);
      return "";
    }
  },
  {
    name: "analyze_transcript",
    description: "Analyze an interview transcript using the LLM to identify comprehensive patterns, competencies, strengths, and weaknesses",
    schema: z.object({ transcript: z.string() }),
  }
);
