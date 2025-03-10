import { z } from "zod";

export const enhancedReportSchema = z.object({
  executiveSummary: z.string(),

  competencyRadarData: z.array(
    z.object({
      name: z.string(),
      score: z.number(),
      // Allow either benchmark or evidenceContext
      benchmark: z.number().optional(),
      evidenceContext: z.string().optional(),
    })
  ),

  keyFindings: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      impact: z.string(),
      recommendations: z.array(z.string()),
      // New evidence-based field
      evidenceCitations: z.union([z.array(z.string()), z.string()]).optional(),
    })
  ),

  developmentPlan: z.object({
    immediateActions: z.array(z.string()),
    shortTermGoals: z.array(z.string()),
    longTermDevelopment: z.array(z.string()),
    // New evidence-based field
    evidenceBasis: z.string().optional(),
  }),

  feedbackSummary: z.object({
    strengths: z.array(z.string()),
    areasForImprovement: z.array(z.string()),
    potentialFit: z.array(z.string()),
    // New evidence-based field
    assessmentLimitations: z.string().optional(),
  }),

  visualizations: z.object({
    competencyRadar: z.string().optional(), // SVG data
    gapAnalysisChart: z.string().optional(), // SVG data
    benchmarkComparison: z.string().optional(), // SVG data
    // New evidence-based field
    evidenceDistribution: z.string().optional(), // SVG data
  }),
});

export type EnhancedReport = z.infer<typeof enhancedReportSchema>;
