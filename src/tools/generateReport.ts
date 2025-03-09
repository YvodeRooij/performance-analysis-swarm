import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { enhancedReportSchema, EnhancedReport } from "../schemas/reportSchema";
import { EnhancedMetrics } from "../schemas/metricsSchema";

const model = new ChatOpenAI({ modelName: "gpt-4o" });

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

    const prompt = `
      Create a comprehensive interview performance report based on these metrics:
      
      1. Write an executiveSummary (1-2 paragraphs) highlighting key findings and recommendations
      
      2. Create competencyRadarData for visualization:
         - Include all competencies with their scores
         - Add benchmark values for comparison
      
      3. Identify 3-5 keyFindings that are most important for the candidate:
         - Give each a clear title
         - Provide a description with context and evidence
         - Explain the impact on performance
         - List 2-3 specific recommendations for each finding
      
      4. Design a developmentPlan with:
         - 2-3 immediateActions to implement right away
         - 2-3 shortTermGoals for the next 3-6 months
         - 2-3 longTermDevelopment areas for career growth
      
      5. Create a feedbackSummary capturing:
         - Top 3-5 strengths to leverage
         - Top 3-5 areasForImprovement to address
         - 2-3 potentialFit suggestions for roles that match their profile
      
      6. For visualizations, describe what charts would best represent the data
         (later these will be converted to SVG visualizations)
      
      Return as a JSON object with this schema:
      {
        "executiveSummary": string,
        "competencyRadarData": [
          {
            "name": string,
            "score": number,
            "benchmark": number
          }
        ],
        "keyFindings": [
          {
            "title": string,
            "description": string,
            "impact": string,
            "recommendations": string[]
          }
        ],
        "developmentPlan": {
          "immediateActions": string[],
          "shortTermGoals": string[],
          "longTermDevelopment": string[]
        },
        "feedbackSummary": {
          "strengths": string[],
          "areasForImprovement": string[],
          "potentialFit": string[]
        },
        "visualizations": {
          "competencyRadar": string,
          "gapAnalysisChart": string,
          "benchmarkComparison": string
        }
      }

      Metrics: ${JSON.stringify(parsedData)}
    `;

    const response = await model.invoke(prompt);
    let content = response.content.toString();
    content = content.replace(/```json\n|\n```/g, "").trim();

    try {
      const parsed = JSON.parse(content) as EnhancedReport;
      enhancedReportSchema.parse(parsed); // Validate against schema

      // Create a human-readable version of the report
      const humanReadable = `
# Executive Summary
${parsed.executiveSummary}

## Key Findings
${parsed.keyFindings
  .map(
    (finding) => `
### ${finding.title}
${finding.description}

**Impact**: ${finding.impact}

**Recommendations**:
${finding.recommendations.map((rec) => `- ${rec}`).join("\n")}
`
  )
  .join("\n")}

## Development Plan
### Immediate Actions
${parsed.developmentPlan.immediateActions.map((action) => `- ${action}`).join("\n")}

### Short-Term Goals (3-6 months)
${parsed.developmentPlan.shortTermGoals.map((goal) => `- ${goal}`).join("\n")}

### Long-Term Development
${parsed.developmentPlan.longTermDevelopment.map((dev) => `- ${dev}`).join("\n")}

## Feedback Summary
### Strengths
${parsed.feedbackSummary.strengths.map((strength) => `- ${strength}`).join("\n")}

### Areas for Improvement
${parsed.feedbackSummary.areasForImprovement.map((area) => `- ${area}`).join("\n")}

### Potential Fit
${parsed.feedbackSummary.potentialFit.map((fit) => `- ${fit}`).join("\n")}
`;

      const report: ReportOutput = {
        humanReadable,
        structuredData: parsed,
      };

      return `Report Output: ${JSON.stringify(report)}`;
    } catch (error) {
      console.error("Error processing report:", error);
      throw new Error(`Invalid LLM response: ${content}`);
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
