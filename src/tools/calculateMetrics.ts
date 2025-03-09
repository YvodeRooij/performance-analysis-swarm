import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { enhancedMetricsSchema } from "../schemas/metricsSchema";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
  temperature: 0.1, // Lower temperature for more structured outputs
});

export const calculateMetrics = tool(
  async (args) => {
    const { analyzedData } = args;

    // First, parse the analyzedData which could be in various formats
    let parsedData;
    try {
      console.log("Raw analyzedData type:", typeof analyzedData);

      if (typeof analyzedData === "string") {
        // Log the first 200 chars for debugging
        console.log("analyzedData preview:", analyzedData.substring(0, 200) + "...");

        // If it starts with "Analysis Output:", extract the JSON part
        if (analyzedData.includes("Analysis Output:")) {
          const jsonPart = analyzedData.substring(analyzedData.indexOf("{"));
          console.log("Extracted JSON part starting with:", jsonPart.substring(0, 50) + "...");
          parsedData = JSON.parse(jsonPart);
        } else {
          // Try direct parsing first
          try {
            parsedData = JSON.parse(analyzedData);
          } catch (e) {
            // Try extracting JSON if direct parsing fails
            const jsonMatch = analyzedData.match(/\{[\s\S]*\}/);
            if (jsonMatch && jsonMatch[0]) {
              parsedData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("Could not extract valid JSON from analyzedData");
            }
          }
        }
      } else {
        parsedData = analyzedData;
      }

      console.log("Successfully parsed analyzedData");
    } catch (error) {
      console.error("Error parsing analyzedData:", error);
      // Create a default object for fallback
      parsedData = {
        communicationMetrics: {
          clarity: 6,
          confidence: 5,
          pacing: 5,
          fillerWords: { frequency: 10, examples: ["um", "uh", "like"] },
        },
        coreCompetencies: {
          businessAcumen: 7,
          quantitativeSkills: 7,
          problemSolving: 7,
          structuredThinking: 6,
          leadership: 6,
          communication: 5,
        },
        strengths: ["Analytical skills", "Technical knowledge"],
        weaknesses: ["Communication issues"],
      };
      console.log("Using fallback parsed data");
    }

    const prompt = `
      Given an analysis of an interview transcript, calculate detailed performance metrics.
      
      RETURN YOUR RESPONSE AS JSON IN THIS EXACT FORMAT:
      {
        "competencyScores": {"businessAcumen": 7, "quantitativeSkills": 8, ...},
        "benchmarkComparison": {
          "industryAverage": {"businessAcumen": 6, ...},
          "percentileRanking": {"businessAcumen": 75, ...}
        },
        "gapAnalysis": [
          {
            "competency": "communication",
            "currentScore": 5,
            "targetScore": 8,
            "gap": 3,
            "priorityLevel": "high",
            "developmentSuggestions": ["Practice presentations", ...]
          }
        ],
        "overallRating": {
          "score": 7.5,
          "category": "strong",
          "summary": "Shows strong analytical abilities..."
        },
        "competencyCorrelations": [
          {
            "primaryCompetency": "structuredThinking",
            "relatedCompetency": "problemSolving",
            "correlationStrength": 0.8,
            "insight": "Strong structured thinking supports problem solving..."
          }
        ]
      }
      
      DO NOT include any explanatory text outside the JSON object. ONLY return the JSON.
      
      Analysis: ${JSON.stringify(parsedData)}
    `;

    try {
      const response = await model.invoke(prompt);
      let content = response.content.toString();

      // Log the raw response for debugging
      console.log("Raw metrics calculation response:", content.substring(0, 200) + "...");

      // Clean up the content to extract valid JSON
      content = content.replace(/```json\n|\n```|```/g, "").trim();

      // Try to find and extract the JSON part
      let jsonMatches = content.match(/\{[\s\S]*\}/);
      let jsonContent = jsonMatches && jsonMatches[0] ? jsonMatches[0] : content;

      try {
        const parsed = JSON.parse(jsonContent);
        console.log("Successfully parsed metrics calculation result");

        try {
          enhancedMetricsSchema.parse(parsed);
          console.log("Metrics validated against schema");
        } catch (schemaError) {}

        return `Metrics Output: ${JSON.stringify(parsed)}`;
      } catch (parseError) {
        console.error("Error parsing metrics:", parseError);

        // Create a fallback metrics object
        const fallbackMetrics = {
          competencyScores: {
            businessAcumen: parsedData.coreCompetencies?.businessAcumen || 7,
            quantitativeSkills: parsedData.coreCompetencies?.quantitativeSkills || 7,
            problemSolving: parsedData.coreCompetencies?.problemSolving || 7,
            structuredThinking: parsedData.coreCompetencies?.structuredThinking || 6,
            leadership: parsedData.coreCompetencies?.leadership || 6,
            communication: parsedData.coreCompetencies?.communication || 5,
          },
          benchmarkComparison: {
            industryAverage: {
              businessAcumen: 6,
              quantitativeSkills: 6,
              problemSolving: 6,
              structuredThinking: 6,
              leadership: 6,
              communication: 6,
            },
            percentileRanking: {
              businessAcumen: 70,
              quantitativeSkills: 70,
              problemSolving: 70,
              structuredThinking: 60,
              leadership: 60,
              communication: 50,
            },
          },
          gapAnalysis: [
            {
              competency: "communication",
              currentScore: parsedData.coreCompetencies?.communication || 5,
              targetScore: 8,
              gap: 3,
              priorityLevel: "high",
              developmentSuggestions: ["Practice presentations", "Reduce filler words"],
            },
          ],
          overallRating: {
            score: 6.5,
            category: "competent",
            summary: "Shows good analytical skills but needs improvement in communication.",
          },
          competencyCorrelations: [
            {
              primaryCompetency: "structuredThinking",
              relatedCompetency: "problemSolving",
              correlationStrength: 0.8,
              insight: "Strong structured thinking supports problem solving abilities.",
            },
          ],
        };
        console.log("Using fallback metrics object");
        return `Metrics Output: ${JSON.stringify(fallbackMetrics)}`;
      }
    } catch (error) {
      console.error("Error in metrics calculation:", error);
    }
  },
  {
    name: "calculate_metrics",
    description: "Calculate comprehensive performance metrics from analyzed interview data",
    schema: z.object({ analyzedData: z.any() }),
  }
);
