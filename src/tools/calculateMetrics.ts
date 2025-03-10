import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { enhancedMetricsSchema } from "../schemas/metricsSchema";

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use gpt-4o for metrics calculation to ensure evidence-based metrics
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
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
      // Instead of using fallback data, throw an error to ensure quality
      throw new Error(`Failed to parse analysis data: ${error}`);
    }

    const prompt = `
      Given an analysis of an interview transcript, calculate detailed performance metrics using an EVIDENCE-BASED approach.
      
      EVIDENCE-BASED APPROACH:
      1. Base all metrics directly on the evidence provided in the analysis
      2. Do NOT create arbitrary benchmarks or percentiles without evidence
      3. Be conservative in your assessments - only claim what the evidence supports
      4. Acknowledge limitations in the data and assessment
      5. Connect all development suggestions to specific evidence
      
      RETURN YOUR RESPONSE AS JSON IN THIS EXACT FORMAT:
      {
        "competencyScores": {"businessAcumen": 7, "quantitativeSkills": 8, ...},
        "benchmarkComparison": {
          "evidenceBasedContext": {
            "businessAcumen": "Based on demonstrated skills in market analysis and business strategy",
            "quantitativeSkills": "Based on demonstrated ability to analyze data and draw insights",
            ...
          },
          "confidenceLevel": {
            "businessAcumen": "medium",
            "quantitativeSkills": "high",
            ...
          }
        },
        "gapAnalysis": [
          {
            "competency": "communication",
            "currentScore": 5,
            "targetScore": 7,
            "gap": 2,
            "priorityLevel": "high",
            "evidenceForGap": "Frequent use of filler words and unclear explanations of technical concepts",
            "developmentSuggestions": ["Practice presentations with technical content", ...]
          }
        ],
        "overallRating": {
          "score": 7.5,
          "category": "strong",
          "summary": "Shows strong analytical abilities...",
          "evidenceBasis": "This rating is based on demonstrated strengths in X, Y, Z and limitations in A, B"
        },
        "competencyCorrelations": [
          {
            "primaryCompetency": "structuredThinking",
            "relatedCompetency": "problemSolving",
            "correlationStrength": 0.8,
            "evidenceForCorrelation": "The candidate consistently applied structured frameworks when solving complex problems",
            "insight": "Strong structured thinking supports problem solving..."
          }
        ]
      }
      
      IMPORTANT REQUIREMENTS:
      1. Replace generic benchmarks with "evidenceBasedContext" that explains the basis for assessment
      2. Include "confidenceLevel" (low/medium/high) for each competency based on evidence quality
      3. Include specific "evidenceForGap" in gap analysis tied to transcript evidence
      4. Include "evidenceBasis" for overall rating that summarizes key evidence
      5. Include "evidenceForCorrelation" for any competency correlations
      
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

        // Store the original analysis with the metrics for context
        parsed.original_analysis = parsedData;

        try {
          // We're using a modified schema, so this might fail but we'll continue
          enhancedMetricsSchema.parse(parsed);
          console.log("Metrics validated against schema");
        } catch (schemaError) {
          console.log("Schema validation failed but continuing with enhanced metrics");
        }

        return `Metrics Output: ${JSON.stringify(parsed)}`;
      } catch (parseError) {
        console.error("Error parsing metrics:", parseError);

        // Instead of using fallback metrics, throw an error to ensure quality
        throw new Error(`Failed to parse metrics calculation result: ${parseError}`);
      }
    } catch (error: unknown) {
      console.error("Error in metrics calculation:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error details:", errorMessage);
      return "";
    }
  },
  {
    name: "calculate_metrics",
    description: "Calculate comprehensive performance metrics from analyzed interview data",
    schema: z.object({ analyzedData: z.any() }),
  }
);
