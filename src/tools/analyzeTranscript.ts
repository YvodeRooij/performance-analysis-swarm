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
  temperature: 0.2, // Lower temperature for more consistent analysis
});

export const analyzeTranscript = tool(
  async ({ transcript }: { transcript: string }): Promise<string> => {
    // Create a more explicit prompt with power steering for evidence collection
    const prompt = `
      Perform a comprehensive analysis of this interview transcript using an EVIDENCE-FIRST, POWER STEERING approach.
      
      # EVIDENCE-FIRST ANALYSIS PROCESS
      Follow this structured analysis process precisely:
      
      ## Phase 1: Evidence Collection
      - Read the entire transcript and identify ALL direct quotes that demonstrate competencies
      - Catalog each quote with: relevant competency, strength/weakness, and specific impact
      - For EACH competency, collect BOTH positive and negative evidence
      - Include contextual information for each piece of evidence (e.g., when in the interview it occurred)
      
      ## Phase 2: Score Calibration
      - Only AFTER evidence collection, calibrate ratings using this strict scoring guide:
         - 9-10 = Exceptional (requires 4+ impressive examples, virtually no weaknesses)
         - 7-8 = Strong (requires 3+ strong examples, few minor weaknesses)
         - 5-6 = Competent (requires 2+ adequate examples, some weaknesses)
         - 3-4 = Developing (1-2 weak examples, significant weaknesses)
         - 1-2 = Needs improvement (no positive evidence, serious concerns)
      
      ## Phase 3: Evidence Verification
      - Re-examine each competency score against the evidence count:
         - Scores 8+ MUST have at least 4 specific evidence examples and address weaknesses
         - Scores 6-7 MUST have at least 3 specific evidence examples and address weaknesses
         - Scores below 6 MUST have at least 2 specific evidence examples
      - If evidence requirements are not met, ADJUST scores downward accordingly
      
      ## Phase 4: Balanced Assessment
      - For EACH competency, identify SPECIFIC strengths, weaknesses and development areas
      - Critically evaluate evidence quality - prioritize actions over statements
      - Identify inter-relationships between competencies
      
      ## Phase 5: Visualize Performance
      - For each competency, calculate ratio of strengths to weaknesses
      - Distribute evidence quantitatively across the competency radar
      - Prepare data for visual representation
      
      # SIX KEY COMPETENCIES DEFINITIONS
      
      ## Business Acumen
      - Market and industry knowledge
      - Strategic thinking and business model understanding
      - Commercial awareness and value creation
      - Stakeholder management
      
      ## Quantitative Skills
      - Numerical reasoning and calculation ability
      - Data interpretation and analysis
      - Financial modeling and metrics
      - Mathematical conceptualization
      
      ## Problem Solving
      - Issue identification and framing
      - Root cause analysis
      - Solution generation and evaluation
      - Implementation planning
      
      ## Structured Thinking
      - Logical framework application
      - Hypothesis formation and testing
      - Information organization
      - Prioritization and segmentation
      
      ## Leadership
      - Vision setting and direction
      - Influence and persuasion
      - Team management and delegation
      - Decision making under uncertainty
      
      ## Communication
      - Clarity and conciseness
      - Active listening and response
      - Stakeholder adaptation
      - Presentation effectiveness
      
      # SCHEMA REQUIREMENTS
      Return your analysis as a valid JSON object with exactly these fields - follow this schema precisely:
      
      {
        "communicationMetrics": {
          "clarity": number (1-10),
          "confidence": number (1-10),
          "pacing": number (1-10),
          "articulation": number (1-10),
          "fillerWords": {
            "frequency": number,
            "examples": string[],
            "impact": string
          }
        },
        "coreCompetencies": {
          "businessAcumen": {
            "score": number (1-10),
            "strengths": string[],
            "weaknesses": string[],
            "developmentAreas": string[],
            "evidenceCount": number,
            "confidence": number (1-10)
          },
          "quantitativeSkills": { /* same structure */ },
          "problemSolving": { /* same structure */ },
          "structuredThinking": { /* same structure */ },
          "leadership": { /* same structure */ },
          "communication": { /* same structure */ }
        },
        "evidenceCatalog": [
          {
            "quote": string,
            "analysis": string,
            "strength": boolean,
            "competency": string,
            "impact": string,
            "context": string
          }
        ],
        "evidenceByCompetency": {
          "businessAcumen": [
            {
              "quote": string,
              "analysis": string,
              "strength": boolean,
              "competency": "businessAcumen",
              "impact": string,
              "context": string
            }
          ],
          "quantitativeSkills": [ /* same structure */ ],
          "problemSolving": [ /* same structure */ ],
          "structuredThinking": [ /* same structure */ ],
          "leadership": [ /* same structure */ ],
          "communication": [ /* same structure */ ]
        },
        "keyPatterns": [
          {
            "pattern": string,
            "frequency": string,
            "impact": string,
            "relatedCompetencies": string[]
          }
        ],
        "strengths": string[],
        "weaknesses": string[],
        "exampleResponses": [
          {
            "question": string,
            "response": string,
            "strengths": string[],
            "weaknesses": string[],
            "competenciesDisplayed": string[],
            "qualityOfReasoning": number (1-10)
          }
        ],
        "overallAssessment": {
          "summary": string,
          "topCompetencies": string[],
          "developmentPriorities": string[],
          "fitAssessment": string,
          "confidenceInAssessment": number (1-10)
        },
        "visualizationData": {
          "competencyRadarData": {
            "businessAcumen": number,
            "quantitativeSkills": number,
            "problemSolving": number,
            "structuredThinking": number,
            "leadership": number,
            "communication": number
          },
          "strengthsWeaknessesRatio": {
            "businessAcumen": number,
            "quantitativeSkills": number,
            "problemSolving": number,
            "structuredThinking": number,
            "leadership": number,
            "communication": number
          },
          "evidenceDistribution": {
            "businessAcumen": number,
            "quantitativeSkills": number,
            "problemSolving": number,
            "structuredThinking": number,
            "leadership": number,
            "communication": number
          }
        }
      }
      
      # CRITICAL REQUIREMENTS
      1. Use DIRECT QUOTES from the transcript as evidence - never fabricate quotes
      2. Maintain a critical, balanced assessment - identify both strengths AND weaknesses
      3. Do NOT inflate scores - they must match the evidence quantity and quality
      4. Every high score requires substantial high-quality evidence
      5. Include context for each evidence quote (when it occurred in the interview)
      6. Prepare detailed data for visualization (radar charts, evidence distribution)
      7. Provide an honest, evidence-based overall assessment with specific development priorities
      
      Here is the transcript to analyze:
      ${transcript}
    `;

    try {
      const response = await model.invoke(prompt);
      let content = response.content.toString();

      if (process.env.DEBUG_AGENTS === 'true') {
        // Log abbreviated response for debugging
        console.log("Analysis response received, length:", content.length);
        const previewLength = Math.min(500, content.length);
        console.log(`Preview: ${content.substring(0, previewLength)}...`);
      }

      // Extract JSON from the response, more robust pattern matching
      // Try multiple approaches to extract the JSON
      let jsonStartIndex = content.indexOf('```json');
      if (jsonStartIndex !== -1) {
        // Handle markdown code blocks
        jsonStartIndex = content.indexOf('{', jsonStartIndex);
        const jsonEndIndex = content.lastIndexOf('}');
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          content = content.substring(jsonStartIndex, jsonEndIndex + 1);
        }
      } else {
        // Try to find JSON directly
        jsonStartIndex = content.indexOf('{');
        const jsonEndIndex = content.lastIndexOf('}');
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          content = content.substring(jsonStartIndex, jsonEndIndex + 1);
        }
      }

      // Try to parse the JSON
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        
        if (process.env.DEBUG_AGENTS === 'true') {
          console.log("Content that failed to parse (first 500 chars):", content.substring(0, 500));
        }

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
        
        // Log basic statistics on what was returned to debug schema issues
        if (process.env.DEBUG_AGENTS === 'true') {
          console.log("Attempted to validate object with keys:", Object.keys(parsed));
          
          // Check specific sections that might be missing
          const missingKeys = [];
          const expectedKeys = [
            "communicationMetrics", "coreCompetencies", "evidenceCatalog", 
            "evidenceByCompetency", "keyPatterns", "strengths", "weaknesses",
            "exampleResponses", "overallAssessment", "visualizationData"
          ];
          
          for (const key of expectedKeys) {
            if (!parsed[key]) {
              missingKeys.push(key);
            }
          }
          
          if (missingKeys.length > 0) {
            console.log("Missing top-level keys:", missingKeys);
          }
        }

        // Instead of using a fallback, throw an error to ensure quality
        throw new Error(`Analysis failed schema validation: ${JSON.stringify(validationError, null, 2)}`);
      }

      // Add quality checks
      validateAnalysisQuality(parsed);
      
      // Calculate some derived metrics
      addDerivedMetrics(parsed);

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

/**
 * Validates that the analysis meets quality standards
 * @param analysis - The analysis to validate
 * @throws Error if analysis doesn't meet quality standards
 */
function validateAnalysisQuality(analysis: any): void {
  // Check evidence counts match scores
  const competencies = ["businessAcumen", "quantitativeSkills", "problemSolving", "structuredThinking", "leadership", "communication"];
  
  for (const comp of competencies) {
    const score = analysis.coreCompetencies[comp].score;
    const evidenceCount = analysis.coreCompetencies[comp].evidenceCount;
    const actualEvidenceCount = analysis.evidenceByCompetency[comp]?.length || 0;
    
    // Verify evidence count is accurate
    if (evidenceCount !== actualEvidenceCount) {
      analysis.coreCompetencies[comp].evidenceCount = actualEvidenceCount;
      console.warn(`Fixed evidenceCount mismatch for ${comp}: reported ${evidenceCount}, actual ${actualEvidenceCount}`);
    }
    
    // Check if high scores have enough evidence
    if (score >= 8 && actualEvidenceCount < 4) {
      console.warn(`Quality warning: ${comp} has score ${score} but only ${actualEvidenceCount} evidence examples`);
    } else if (score >= 6 && score < 8 && actualEvidenceCount < 3) {
      console.warn(`Quality warning: ${comp} has score ${score} but only ${actualEvidenceCount} evidence examples`);
    }
    
    // Check for balance between strengths and weaknesses
    const strengths = analysis.coreCompetencies[comp].strengths.length;
    const weaknesses = analysis.coreCompetencies[comp].weaknesses.length;
    
    if (strengths === 0 || weaknesses === 0) {
      console.warn(`Quality warning: ${comp} lacks balance with ${strengths} strengths and ${weaknesses} weaknesses`);
    }
  }
  
  // Check that visualizationData values match competency scores
  for (const comp of competencies) {
    const score = analysis.coreCompetencies[comp].score;
    const radarScore = analysis.visualizationData.competencyRadarData[comp];
    
    if (score !== radarScore) {
      analysis.visualizationData.competencyRadarData[comp] = score;
      console.warn(`Fixed radar data mismatch for ${comp}: radar ${radarScore}, score ${score}`);
    }
  }
}

/**
 * Adds derived metrics to the analysis that might be missing
 * @param analysis - The analysis to enhance
 */
function addDerivedMetrics(analysis: any): void {
  // Calculate evidence totals if not provided
  let totalEvidence = 0;
  const evidenceCounts: Record<string, number> = {};
  
  // Count evidence by competency
  for (const comp of Object.keys(analysis.evidenceByCompetency)) {
    const count = analysis.evidenceByCompetency[comp]?.length || 0;
    evidenceCounts[comp] = count;
    totalEvidence += count;
  }
  
  // Update evidence distribution
  if (totalEvidence > 0) {
    for (const comp of Object.keys(evidenceCounts)) {
      analysis.visualizationData.evidenceDistribution[comp] = evidenceCounts[comp] / totalEvidence;
    }
  }
  
  // Calculate strengths-weaknesses ratio if not provided
  for (const comp of Object.keys(analysis.coreCompetencies)) {
    const strengths = analysis.coreCompetencies[comp].strengths.length;
    const weaknesses = analysis.coreCompetencies[comp].weaknesses.length;
    
    if (weaknesses > 0) {
      analysis.visualizationData.strengthsWeaknessesRatio[comp] = strengths / weaknesses;
    } else if (strengths > 0) {
      analysis.visualizationData.strengthsWeaknessesRatio[comp] = strengths;
    } else {
      analysis.visualizationData.strengthsWeaknessesRatio[comp] = 1; // Default if no data
    }
  }
}
