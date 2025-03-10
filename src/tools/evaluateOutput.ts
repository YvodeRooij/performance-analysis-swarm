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
  temperature: 0.1, // Lower temperature for more consistent evaluations
});

// Define the categories of issues to track
const issueCategories = [
  "insufficientEvidence",
  "inflatedScores", 
  "unbalancedAnalysis",
  "missingComponents",
  "logicalInconsistency",
  "misalignedVisualization",
  "genericRecommendations",
  "unsupportedClaims",
  "poorStructure",
  "missingContext"
];

export const evaluateOutput = tool(
  async (args) => {
    const { outputType, content, sourceAgent } = args;

    // Log what we're evaluating
    console.log(`Evaluating ${outputType} from ${sourceAgent}`);

    try {
      // Parse content if it's a string
      const parsedContent =
        typeof content === "string" && content.includes(outputType) ? JSON.parse(content.substring(content.indexOf("{"))) : content;

      // Create a power-steering prompt for the LLM to evaluate the output
      const prompt = `
        You are an Expert Quality Judge evaluating the output of a performance analysis system.
        Your role is to enforce strict quality standards through rigorous evidence-based evaluation.
        
        # OUTPUT DETAILS
        Type: ${outputType}
        Source: ${sourceAgent}
        
        # EVALUATION PROCESS
        Follow this step-by-step process to ensure a thorough evaluation:
        
        ## Step 1: Content Analysis
        - Review the content thoroughly according to the standards below
        - For each standard, identify if it is met, partially met, or not met
        - Note specific examples for each issue found
        
        ## Step 2: Evidence Verification
        - For Analysis: Verify that evidence counts match the scores given
        - For Metrics: Verify that calculations are justified by evidence
        - For Report: Verify that findings are tied to specific evidence
        
        ## Step 3: Balance Assessment
        - Check for balanced evaluation (both strengths and limitations)
        - Identify any areas of potential bias or one-sided assessment
        
        ## Step 4: Structural Evaluation
        - Verify all required components are present and properly formatted
        - Check for logical organization and clarity
        
        ## Step 5: Score Determination
        - Assign a score on a 1-10 scale based on the above analysis
        - Determine pass/fail (pass if score ≥ 8.0 AND no critical issues)
        
        # DETAILED QUALITY STANDARDS
        
        ${
          outputType === "Analysis"
            ? `
        ## ANALYSIS QUALITY STANDARDS
        
        ### Evidence Requirements (Critical)
        - Competency scores 8-10 MUST have 4+ specific evidence examples with direct quotes
        - Competency scores 6-7 MUST have 3+ specific evidence examples with direct quotes
        - Competency scores below 6 MUST have 2+ specific evidence examples with direct quotes
        
        ### Balance Requirements (Critical)
        - EACH competency MUST include BOTH strengths AND limitations
        - Each competency MUST have specific development areas identified
        - Overall assessment must be balanced, not skewed positive or negative
        
        ### Detail Requirements
        - Evidence must include relevant context (when in the interview it occurred)
        - Analysis must connect evidence to specific sub-components of each competency
        - Quotes must be analyzed, not merely presented
        
        ### Calibration Requirements
        - Scores must match evidence quality and quantity (no inflation)
        - High scores (8+) should be rare and reserved for truly exceptional performance
        - Confidence ratings must match evidence consistency
        
        ### Visualization Requirements
        - Visualization data must match competency scores exactly
        - Evidence distribution must reflect actual evidence counts
        - Strengths/weaknesses ratios must match actual counts
        
        ### Structure Requirements
        - All required schema components must be present
        - Overall assessment must provide clear, evidence-based summary
        - Evidence catalog must be comprehensive
        `
            : outputType === "Metrics"
            ? `
        ## METRICS QUALITY STANDARDS
        
        ### Validity Requirements (Critical)
        - All metrics must be derived from and justified by the analysis evidence
        - No arbitrary or unsupported numerical claims
        - Percentile rankings must have clear methodology explanation
        
        ### Benchmark Requirements (Critical)
        - Industry benchmarks must be realistic and evidence-based
        - Comparative metrics must have clear reference points
        - Performance gap analysis must be specific and evidence-based
        
        ### Correlation Requirements
        - Any claimed correlations between competencies must:
          - Be logical and evidence-supported
          - Include explanation of correlation methodology
          - Specify correlation strength with justification
        
        ### Gap Analysis Requirements
        - Development timelines must be justified
        - Specific interventions must be tied to evidence
        - Prioritization must be logical and explained
        
        ### Visualization Requirements
        - All data visualizations must accurately represent the underlying data
        - No misleading scales or comparisons
        - Distribution metrics must sum correctly
        
        ### Structure Requirements
        - All required schema components must be present and complete
        - Calculations must be internally consistent
        - Numerical data must be appropriately scaled and labeled
        `
            : `
        ## REPORT QUALITY STANDARDS
        
        ### Evidence Requirements (Critical)
        - Every finding must cite specific evidence from the analysis
        - All claims must be supported by data from earlier stages
        - No unsupported conclusions or recommendations
        
        ### Recommendation Requirements (Critical)
        - Development recommendations must be:
          - Specific and actionable
          - Directly tied to evidence from analysis
          - Realistically implementable
          - Prioritized based on impact/effort
        
        ### Structure Requirements
        - Clear, logical organization with proper information hierarchy
        - No redundant information across sections
        - Executive summary must be concise and comprehensive
        
        ### Visualization Requirements
        - Visual elements must accurately represent the data
        - No misleading scales or comparisons
        - Visualizations must add value and insight
        
        ### Language Requirements
        - Clear, professional language without excessive jargon
        - Concrete rather than vague statements
        - Balanced tone that avoids bias
        
        ### Completeness Requirements
        - All required schema components must be present
        - Each competency must be addressed
        - Development plan must be comprehensive
        `
        }
        
        # CRITICAL ISSUE DEFINITIONS
        
        - insufficientEvidence: Evidence doesn't meet quantity/quality requirements for scores
        - inflatedScores: Scores higher than justified by evidence
        - unbalancedAnalysis: Missing strengths or limitations for competencies
        - missingComponents: Required schema elements are absent
        - logicalInconsistency: Internal contradictions or reasoning errors
        - misalignedVisualization: Visualizations don't match the data
        - genericRecommendations: Vague, non-specific recommendations 
        - unsupportedClaims: Claims without evidence
        - poorStructure: Disorganized or difficult to follow
        - missingContext: Evidence without necessary context
        
        # CONTENT TO EVALUATE
        
        ${JSON.stringify(parsedContent, null, 2)}
        
        # REQUIRED RESPONSE FORMAT
        
        Respond with a structured evaluation using EXACTLY this format:
        
        ## Score: [1-10 score]
        
        ## Pass/Fail: [pass/fail]
        
        ## Overall feedback:
        [Comprehensive feedback on overall quality]
        
        ## List of specific issues:
        1. [Issue 1]
        2. [Issue 2]
        ...
        
        ## Counts of issue types:
        insufficientEvidence: [count]
        inflatedScores: [count]
        unbalancedAnalysis: [count]
        missingComponents: [count]
        logicalInconsistency: [count]
        misalignedVisualization: [count]
        genericRecommendations: [count]
        unsupportedClaims: [count]
        poorStructure: [count]
        missingContext: [count]
        
        ## Evaluation reasoning:
        [Explain your reasoning process for this evaluation, focusing on why you assigned this specific score and how you determined pass/fail status]
        
        # IMPORTANT
        Be extremely rigorous and uncompromising. Do not approve outputs that lack sufficient evidence, have inflated scores, or fail to meet critical standards. Your evaluation is crucial for maintaining assessment quality.
      `;

      // Get evaluation from LLM
      const response = await model.invoke(prompt);
      const evaluationText = response.content.toString();
      
      if (process.env.DEBUG_AGENTS === 'true') {
        console.log(`Evaluation response for ${outputType} received, length: ${evaluationText.length}`);
      }

      // Extract evaluation components using regex
      const scoreMatch = evaluationText.match(/Score:?\s*(\d+(\.\d+)?)/i);
      const passMatch = evaluationText.match(/Pass\/Fail:?\s*(pass|fail)/i);

      // Use regex patterns for multiline content
      const feedbackPattern = /Overall feedback:?\s*([^]*?)(?=\s*##\s*List of specific issues|\s*##\s*Counts of issue types)/i;
      const feedbackMatch = evaluationText.match(feedbackPattern);

      const issuesPattern = /List of specific issues:?\s*([^]*?)(?=\s*##\s*Counts of issue types|\s*##\s*Evaluation reasoning)/i;
      const issuesMatch = evaluationText.match(issuesPattern);

      // Extract reasoning for transparency
      const reasoningPattern = /Evaluation reasoning:?\s*([^]*?)(?=\s*#|$)/i;
      const reasoningMatch = evaluationText.match(reasoningPattern);
      const evaluationReasoning = reasoningMatch && reasoningMatch[1] ? reasoningMatch[1].trim() : "No reasoning provided.";

      // Extract and parse counts
      const feedbackCounts: Record<string, number> = {};
      
      // Initialize all issue categories to 0
      issueCategories.forEach(category => {
        feedbackCounts[category] = 0;
      });
      
      // Extract actual counts from evaluation
      issueCategories.forEach(category => {
        const countPattern = new RegExp(`${category}:\\s*(\\d+)`, 'i');
        const countMatch = evaluationText.match(countPattern);
        if (countMatch && countMatch[1]) {
          feedbackCounts[category] = parseInt(countMatch[1], 10);
        }
      });

      // Get feedback and issues
      const feedback = feedbackMatch && feedbackMatch[1] ? feedbackMatch[1].trim() : "No feedback provided.";

      // Parse issues into an array
      let issues: string[] = [];
      if (issuesMatch && issuesMatch[1]) {
        // Split by numbered list items
        const issuesText = issuesMatch[1].trim();
        issues = issuesText
          .split(/\n\s*\d+\.\s*/)
          .map(issue => issue.trim())
          .filter(issue => issue.length > 0);
      }

      // Parse score and determine if passed
      const score = scoreMatch ? parseFloat(scoreMatch[1]) : 5.0;

      // Check for pass/fail explicitly, then use score threshold and critical issues
      let passed = false;
      if (passMatch) {
        passed = passMatch[1].toLowerCase() === "pass";
      } else {
        // If no explicit pass/fail, use score threshold
        passed = score >= 8.0;
        
        // Log the decision for debugging
        if (process.env.DEBUG_AGENTS === 'true') {
          console.log(`No explicit pass/fail found. Using score threshold: ${score} >= 8.0 = ${passed}`);
        }
      }

      // Check for evidence count mismatches in analysis outputs
      if (outputType === "Analysis" && typeof parsedContent === "object" && parsedContent !== null) {
        try {
          const content = parsedContent as {
            coreCompetencies?: Record<string, { 
              evidenceCount: number; 
              score: number;
            }>;
            evidenceByCompetency?: Record<string, Array<{ strength: boolean }>>;
          };
          
          // Check for evidence count mismatches and fix counts
          if (content.coreCompetencies && content.evidenceByCompetency) {
            let mismatchFound = false;
            
            for (const [competency, details] of Object.entries(content.coreCompetencies)) {
              const reportedCount = details.evidenceCount;
              const actualEvidence = content.evidenceByCompetency[competency] || [];
              const actualCount = actualEvidence.length;
              
              if (reportedCount !== actualCount) {
                console.log(`Fixed evidenceCount mismatch for ${competency}: reported ${reportedCount}, actual ${actualCount}`);
                // Type assertion for the nested property
                (content.coreCompetencies[competency] as any).evidenceCount = actualCount;
                
                // Update the parsedContent object so these fixes are reflected in the final output
                if (typeof parsedContent === 'object' && parsedContent !== null) {
                  try {
                    // @ts-ignore - We know these properties exist based on our earlier checks
                    parsedContent.coreCompetencies[competency].evidenceCount = actualCount;
                  } catch (err) {
                    console.error(`Error updating parsed content: ${err}`);
                  }
                }
                mismatchFound = true;
                
                // Add to issues list if not already there
                const issueText = `Evidence count mismatch for ${competency}: claimed ${reportedCount} but found ${actualCount}`;
                if (!issues.includes(issueText)) {
                  issues.push(issueText);
                }
                
                // Increment the appropriate feedback count
                feedbackCounts["insufficientEvidence"]++;
                
                // Add quality warning if score is high but evidence count is low
                const score = details.score;
                if ((score >= 8 && actualCount < 4) || 
                    (score >= 6 && score < 8 && actualCount < 3) ||
                    (score < 6 && actualCount < 2)) {
                  console.log(`Quality warning: ${competency} has score ${score} but only ${actualCount} evidence examples`);
                  
                  // Check for balance between strengths and weaknesses
                  const strengths = actualEvidence.filter((e: { strength: boolean }) => e.strength).length;
                  const weaknesses = actualEvidence.filter((e: { strength: boolean }) => !e.strength).length;
                  
                  if (strengths > 0 && weaknesses === 0) {
                    console.log(`Quality warning: ${competency} lacks balance with ${strengths} strengths and 0 weaknesses`);
                    issues.push(`${competency} lacks balance with ${strengths} strengths and 0 weaknesses`);
                    feedbackCounts["unbalancedAnalysis"]++;
                  }
                }
              }
            }
            
            // If we found and fixed mismatches, update the evaluation
            if (mismatchFound) {
              feedbackCounts["insufficientEvidence"] = Math.max(1, feedbackCounts["insufficientEvidence"]);
            }
          }
        } catch (error) {
          console.error("Error checking evidence counts:", error);
        }
      }
      
      // Force evaluation to fail if there are critical issues - better detection
      const totalCriticalIssues = 
        feedbackCounts["insufficientEvidence"] + 
        feedbackCounts["inflatedScores"] + 
        feedbackCounts["unbalancedAnalysis"] + 
        feedbackCounts["missingComponents"];
      
      // Log the critical issues if in debug mode
      if (process.env.DEBUG_AGENTS === 'true' && totalCriticalIssues > 0) {
        console.log(`Found ${totalCriticalIssues} critical issues in ${outputType}`);
      }
      
      // If score is passing but there are critical issues, override to fail
      if (passed && totalCriticalIssues > 0) {
        passed = false;
        if (process.env.DEBUG_AGENTS === 'true') {
          console.log(`Forcing evaluation to fail due to ${totalCriticalIssues} critical issues despite score of ${score}`);
        }
      }

      // Add timestamp
      const timestamp = new Date().toISOString();

      // Create the result object with enhanced information
      const result = {
        outputType,
        score,
        passed,
        feedback,
        issues,
        feedbackCounts,
        sourceAgent,
        evaluationId: `${sourceAgent}-${Date.now()}`,
        timestamp,
        evaluationReasoning,
        criticalIssuesCount: totalCriticalIssues
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
        feedbackCounts: issueCategories.reduce((counts, category) => {
          counts[category] = category === "missingComponents" ? 1 : 0;
          return counts;
        }, {} as Record<string, number>),
        sourceAgent,
        evaluationId: `${sourceAgent}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        evaluationReasoning: "Evaluation failed due to technical error in processing the content.",
        criticalIssuesCount: 1
      })}`;
    }
  },
  {
    name: "evaluate_output",
    description: "Evaluate agent output quality against specific criteria",
    schema: evaluateSchema,
  }
);
