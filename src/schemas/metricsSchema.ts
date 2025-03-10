import { z } from "zod";

// Define a more flexible schema for the enhanced metrics that includes evidence-based context
export const enhancedMetricsSchema = z.object({
  competencyScores: z.record(z.string(), z.number()),

  benchmarkComparison: z.object({
    // Allow either the original structure or the new evidence-based structure
    industryAverage: z.record(z.string(), z.number()).optional(),
    percentileRanking: z.record(z.string(), z.number()).optional(),
    evidenceBasedContext: z.record(z.string(), z.string()).optional(),
    confidenceLevel: z.record(z.string(), z.string()).optional(),
  }),

  gapAnalysis: z.array(
    z.object({
      competency: z.string(),
      currentScore: z.number(),
      targetScore: z.number(),
      gap: z.number(),
      priorityLevel: z.enum(["high", "medium", "low"]),
      developmentSuggestions: z.array(z.string()),
      // New evidence-based field
      evidenceForGap: z.string().optional(),
    })
  ),

  overallRating: z.object({
    score: z.number().min(1).max(10),
    category: z.enum(["exceptional", "strong", "competent", "developing", "needs improvement"]),
    summary: z.string(),
    // New evidence-based field
    evidenceBasis: z.string().optional(),
  }),

  competencyCorrelations: z.array(
    z.object({
      primaryCompetency: z.string(),
      relatedCompetency: z.string(),
      correlationStrength: z.number(),
      insight: z.string(),
      // New evidence-based field
      evidenceForCorrelation: z.string().optional(),
    })
  ),

  // Allow storing the original analysis for reference
  original_analysis: z.any().optional(),
});

export type EnhancedMetrics = z.infer<typeof enhancedMetricsSchema>;
