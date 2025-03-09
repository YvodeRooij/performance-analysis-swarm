import { z } from "zod";

export const enhancedReportSchema = z.object({
  executiveSummary: z.string(),

  competencyRadarData: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      benchmark: z.number(),
    })
  ),

  keyFindings: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      impact: z.string(),
      recommendations: z.array(z.string()),
    })
  ),

  developmentPlan: z.object({
    immediateActions: z.array(z.string()),
    shortTermGoals: z.array(z.string()),
    longTermDevelopment: z.array(z.string()),
  }),

  feedbackSummary: z.object({
    strengths: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
    potentialFit: z.array(z.string()),
  }),

  visualizations: z.object({
    competencyRadar: z.string().optional(), // SVG data
    gapAnalysisChart: z.string().optional(), // SVG data
    benchmarkComparison: z.string().optional(), // SVG data
  }),
});

export type EnhancedReport = z.infer<typeof enhancedReportSchema>;
