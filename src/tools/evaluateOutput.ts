import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { qualityControlSchema } from "../schemas/qualityControlSchema";

// Define the schema separately for clarity
const evaluateSchema = z.object({
  outputType: z.string(),
  content: z.any(),
  sourceAgent: z.string(),
});

// Get API key from environment
const apiKey = process.env.OPENAI_API_KEY;

// Use gpt-4o for evaluation to ensure rigorous quality control
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: apiKey,
});

export const evaluateOutput = tool(
  async (args) => {
    const { outputType, content, sourceAgent } = args;

    // Log what we're evaluating
    console.log(`Evaluating ${outputType} from ${sourceAgent}`);

    try {
      // Parse content if it's a string
      const parsedContent =
        typeof content === "string" && content.includes(outputType) ? JSON.parse(content.substring(content.indexOf("{"))) : content;

      // Create a prompt for the LLM to evaluate the output
      const prompt = `
        You are a Quality Judge evaluating the output of a performance analysis system.
        
        You are reviewing a ${outputType} from the ${sourceAgent}.
        
        Here are the STRICT quality standards for a ${outputType}:
        
        ${
          outputType === "Analysis"
            ? `
        ANALYSIS STANDARDS:
        - Every competency score 8+ MUST have at least 3 specific evidence examples
        - Every competency score 6-7 MUST have at least 2 specific evidence examples
        - Every competency score below 6 MUST have at least 1 specific evidence example
        - Analysis MUST include BOTH strengths AND limitations for each competency
        - Scores must be consistent with evidence quality (no inflated scores)
        - All claims must be supported by direct quotes from the transcript
        
        EXAMPLES OF POOR ANALYSIS:
        - "Candidate has exceptional quantitative skills (9/10)" with only one vague example
        - Only listing strengths without any limitations
        - High ratings across all competencies with minimal supporting evidence
        - Accepting claims at face value without verification
        `
            : outputType === "Metrics"
            ? `
        METRICS STANDARDS:
        - Benchmarks must be realistic and evidence-based, not arbitrary
        - Percentile rankings must be justified by actual evidence, not inflated
        - Gap analysis must be specific to evidence, not generic
        - Correlations must have logical explanations, not arbitrary connections
        - The overall rating must match the evidence in the original analysis
        
        EXAMPLES OF POOR METRICS:
        - Placing a candidate in the "90th percentile" without justification
        - Creating arbitrary industry benchmarks without foundation
        - Suggesting correlations between competencies without evidence
        `
            : `
        REPORT STANDARDS:
        - Every finding must cite specific evidence from the analysis
        - No redundant information across sections
        - Focus on assessment quality, not generic development recommendations
        - Clear, straightforward language without excessive jargon
        - Logical structure with proper information hierarchy
        - Development recommendations must be specific and evidence-based
        
        EXAMPLES OF POOR REPORTING:
        - Generic development recommendations not tied to interview evidence
        - Repetitive content (same information appearing multiple times)
        - Arbitrary timeframes ("achieve target within 3 months") without basis
        - Vague statements without supporting evidence
        `
        }
        
        Evaluate the following ${outputType} content:
        ${JSON.stringify(parsedContent, null, 2)}
        
        Provide your evaluation in the following format:
        1. Score (1-10 scale)
        2. Pass/Fail (pass if score ≥ 8.0)
        3. Overall feedback
        4. List of specific issues found
        5. Counts of issue types (e.g., "insufficientEvidence": 2)
        
        Be rigorous and uncompromising about evidence standards. Do not approve outputs that lack sufficient evidence or have inflated scores.
      `;

      // Get evaluation from LLM
      const response = await model.invoke(prompt);
      const evaluationText = response.content.toString();

      // Extract evaluation components using regex (without 's' flag for compatibility)
      const scoreMatch = evaluationText.match(/Score:?\s*(\d+(\.\d+)?)/i);
      const passMatch = evaluationText.match(/Pass\/Fail:?\s*(pass|fail)/i);

      // Use simpler regex patterns without the 's' flag
      const feedbackPattern = /Overall feedback:?\s*([^]*?)(?=(List of|Counts of|$))/i;
      const feedbackMatch = evaluationText.match(feedbackPattern);

      const issuesPattern = /List of specific issues:?\s*([^]*?)(?=(Counts of|$))/i;
      const issuesMatch = evaluationText.match(issuesPattern);

      // Extract and parse counts
      const countsPattern = /Counts of issue types:?\s*([^]*?)$/i;
      const countsMatch = evaluationText.match(countsPattern);

      // Define the type for feedbackCounts
      interface FeedbackCounts {
        [key: string]: number;
      }

      let feedbackCounts: FeedbackCounts = {};

      if (countsMatch && countsMatch[1]) {
        const countsText = countsMatch[1];
        // Try to extract counts in format "name: number"
        const countEntries = countsText.match(/(\w+):\s*(\d+)/g) || [];

        countEntries.forEach((entry) => {
          const parts = entry.split(":");
          if (parts.length === 2) {
            const name = parts[0].trim();
            const count = parseInt(parts[1].trim(), 10);
            feedbackCounts[name] = count;
          }
        });
      }

      // Get feedback and issues
      const feedback = feedbackMatch && feedbackMatch[1] ? feedbackMatch[1].trim() : "No feedback provided.";

      // Parse issues into an array
      let issues: string[] = [];
      if (issuesMatch && issuesMatch[1]) {
        // Split by numbered list items or bullet points
        const issuesText = issuesMatch[1].trim();
        issues = issuesText
          .split(/\n\s*[-\d.)\]]+\s*/)
          .map((issue) => issue.trim())
          .filter((issue) => issue.length > 0);
      }

      // Parse score and determine if passed
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5.0;

      // Always use the explicit pass/fail from the evaluation if available
      // Otherwise, use a stricter threshold (8.0) for passing
      let passed = false;
      if (passMatch) {
        passed = passMatch[1].toLowerCase() === "pass";
      } else {
        // If no explicit pass/fail, use score threshold and ensure evidence requirements are met
        passed = score >= 8.0;

        // Log the decision for debugging
        console.log(`No explicit pass/fail found. Using score threshold: ${score} >= 8.0 = ${passed}`);
      }

      // Force evaluation to fail if there are critical issues
      if (outputType === "Analysis" && issues.length > 0) {
        // Check if the analysis has high scores without sufficient evidence
        const hasHighScoresWithoutEvidence =
          content.includes("score") &&
          (content.includes("8") || content.includes("9") || content.includes("10")) &&
          issues.some(
            (issue) => issue.toLowerCase().includes("evidence") || issue.toLowerCase().includes("support") || issue.toLowerCase().includes("example")
          );

        // Check if analysis is missing strengths or limitations
        const missingBalancedAnalysis = issues.some(
          (issue) =>
            issue.toLowerCase().includes("strength") || issue.toLowerCase().includes("limitation") || issue.toLowerCase().includes("balanced")
        );

        if (hasHighScoresWithoutEvidence || missingBalancedAnalysis) {
          passed = false;
          console.log("Forcing evaluation to fail due to critical issues with evidence or balanced analysis");
        }
      }

      // Create the result object
      const result = {
        outputType,
        score,
        passed,
        feedback,
        issues,
        feedbackCounts,
        sourceAgent,
        evaluationId: `${sourceAgent}-${Date.now()}`,
      };

      return `Evaluation Output: ${JSON.stringify(result)}`;
    } catch (error: unknown) {
      console.error("Error in evaluation:", error);

      // Extract error message safely
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Return a failing evaluation on error
      return `Evaluation Output: ${JSON.stringify({
        outputType,
        score: 4.0,
        passed: false,
        feedback: "Error in evaluation. The output could not be properly validated.",
        issues: ["Invalid output format or structure", errorMessage],
        feedbackCounts: {},
        sourceAgent,
        evaluationId: `${sourceAgent}-${Date.now()}`,
      })}`;
    }
  },
  {
    name: "evaluate_output",
    description: "Evaluate agent output quality against specific criteria",
    schema: evaluateSchema,
  }
);
