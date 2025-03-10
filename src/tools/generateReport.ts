import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { enhancedReportSchema, EnhancedReport } from "../schemas/reportSchema";
import { EnhancedMetrics } from "../schemas/metricsSchema";

// Use gpt-4o for report generation to ensure high-quality, evidence-based reports
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  apiKey: process.env.OPENAI_API_KEY,
});

interface ReportOutput {
  humanReadable: string;
  structuredData: EnhancedReport;
}

export const generateReport = tool(
  async ({ metricsData }: { metricsData: string | EnhancedMetrics }): Promise<string> => {
    // Parse the metrics data which is a string from the previous step
    let parsedData: EnhancedMetrics;
    try {
      if (typeof metricsData === "string") {
        // If it starts with "Metrics Output:", extract the JSON part
        if (metricsData.startsWith("Metrics Output:")) {
          parsedData = JSON.parse(metricsData.substring("Metrics Output:".length).trim());
        } else {
          parsedData = JSON.parse(metricsData);
        }
      } else {
        parsedData = metricsData;
      }
    } catch (error) {
      console.error("Error parsing metricsData:", error);
      throw new Error(`Invalid metricsData input: ${metricsData}`);
    }

    // Extract the original analysis if available for evidence citations
    const originalAnalysis = parsedData.original_analysis || {};

    const prompt = `
      Create an evidence-based interview performance report using these metrics and the original analysis.
      
      EVIDENCE-CENTERED APPROACH:
      1. Base all findings directly on evidence from the interview
      2. Cite specific examples for all key points
      3. Present a balanced view of capabilities and limitations
      4. Make specific, actionable recommendations tied to evidence
      5. Avoid repetition across different sections
      
      REPORT STRUCTURE:
      
      1. Write an executiveSummary (1-2 paragraphs):
         - Summarize key strengths and limitations demonstrated in the interview
         - Highlight 2-3 most important development areas
         - Include a statement about assessment limitations if appropriate
      
      2. Create competencyRadarData for visualization:
         - Include all competencies with their scores
         - Use evidence-based context rather than arbitrary benchmarks
      
      3. Identify 3-5 keyFindings that are most important:
         - Give each a clear title
         - Cite specific evidence from the interview transcript
         - Explain the impact on performance
         - Provide specific, actionable recommendations tied to the evidence
      
      4. Design a developmentPlan with:
         - 2-3 immediateActions that address specific limitations identified
         - 2-3 shortTermGoals that build on the immediate actions
         - 1-2 longTermDevelopment areas based on demonstrated potential
         - All recommendations must be specific and evidence-based
      
      5. Create a feedbackSummary capturing:
         - 3-5 specific strengths demonstrated in the interview
         - 3-5 specific areas for improvement with evidence
         - 1-2 potential fit suggestions based on demonstrated strengths
      
      6. For visualizations, describe what charts would best represent the data
      
      IMPORTANT REQUIREMENTS:
      1. Every finding must cite specific evidence from the interview
      2. Avoid generic recommendations like "improve communication skills"
      3. Instead use specific guidance like "Practice explaining technical concepts using analogies, as demonstrated by difficulty in X example"
      4. Do not repeat the same information across different sections
      5. Do not include arbitrary timeframes unless justified by the evidence
      
      Return as a JSON object with this schema:
      {
        "executiveSummary": string,
        "competencyRadarData": [
          {
            "name": string,
            "score": number,
            "evidenceContext": string
          }
        ],
        "keyFindings": [
          {
            "title": string,
            "description": string,
            "evidenceCitations": string[],
            "impact": string,
            "recommendations": string[]
          }
        ],
        "developmentPlan": {
          "immediateActions": string[],
          "shortTermGoals": string[],
          "longTermDevelopment": string[],
          "evidenceBasis": string
        },
        "feedbackSummary": {
          "strengths": string[],
          "areasForImprovement": string[],
          "potentialFit": string[],
          "assessmentLimitations": string
        },
        "visualizations": {
          "competencyRadar": string,
          "gapAnalysisChart": string,
          "evidenceDistribution": string
        }
      }

      Metrics: ${JSON.stringify(parsedData)}
      Original Analysis: ${JSON.stringify(originalAnalysis)}
    `;

    try {
      const response = await model.invoke(prompt);
      let content = response.content.toString();
      content = content.replace(/```json\n|\n```|```/g, "").trim();

      // Try to parse the JSON
      let parsed;
      try {
        parsed = JSON.parse(content) as EnhancedReport;
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

      // Validate against schema (but continue even if it fails)
      try {
        enhancedReportSchema.parse(parsed);
      } catch (validationError) {
        console.error("Schema validation error:", validationError);
        console.log("Continuing with report generation despite schema validation errors");
      }

      // Create a human-readable version of the report
      const humanReadable = `
# Interview Performance Report

## Executive Summary
${parsed.executiveSummary}

## Key Findings
${parsed.keyFindings
  .map(
    (finding: { title: string; description: string; evidenceCitations?: string[] | string; impact: string; recommendations: string[] }) => `
### ${finding.title}
${finding.description}

${
  finding.evidenceCitations
    ? `**Evidence**: 
${Array.isArray(finding.evidenceCitations) ? finding.evidenceCitations.map((cite: string) => `- ${cite}`).join("\n") : finding.evidenceCitations}`
    : ""
}

**Impact**: ${finding.impact}

**Recommendations**:
${finding.recommendations.map((rec: string) => `- ${rec}`).join("\n")}
`
  )
  .join("\n")}

## Development Plan
${parsed.developmentPlan.evidenceBasis ? `*Evidence Basis: ${parsed.developmentPlan.evidenceBasis}*\n\n` : ""}

### Immediate Actions
${parsed.developmentPlan.immediateActions.map((action: string) => `- ${action}`).join("\n")}

### Short-Term Goals
${parsed.developmentPlan.shortTermGoals.map((goal: string) => `- ${goal}`).join("\n")}

### Long-Term Development
${parsed.developmentPlan.longTermDevelopment.map((dev: string) => `- ${dev}`).join("\n")}

## Feedback Summary
${parsed.feedbackSummary.assessmentLimitations ? `*Assessment Limitations: ${parsed.feedbackSummary.assessmentLimitations}*\n\n` : ""}

### Strengths
${parsed.feedbackSummary.strengths.map((strength: string) => `- ${strength}`).join("\n")}

### Areas for Improvement
${parsed.feedbackSummary.areasForImprovement.map((area: string) => `- ${area}`).join("\n")}

### Potential Fit
${parsed.feedbackSummary.potentialFit.map((fit: string) => `- ${fit}`).join("\n")}
`;

      const report: ReportOutput = {
        humanReadable,
        structuredData: parsed,
      };

      return `Report Output: ${JSON.stringify(report)}`;
    } catch (error: unknown) {
      console.error("Error processing report:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error details:", errorMessage);

      // Instead of using a fallback report, throw an error to ensure quality
      throw new Error(`Failed to generate report: ${errorMessage}`);
    }
  },
  {
    name: "generate_report",
    description: "Generate a comprehensive human-readable report and structured data from metrics",
    schema: z.object({
      metricsData: z.union([z.string(), z.custom<EnhancedMetrics>()]).describe("Metrics data as a string or structured object"),
    }),
  }
);
