import { z } from "zod";

export const enhancedMetricsSchema = z.object({
  competencyScores: z.record(z.string(), z.number()),

  benchmarkComparison: z.object({
    industryAverage: z.record(z.string(), z.number()),
    percentileRanking: z.record(z.string(), z.number()),
  }),

  gapAnalysis: z.array(
    z.object({
      competency: z.string(),
      currentScore: z.number(),
      targetScore: z.number(),
      gap: z.number(),
      priorityLevel: z.enum(["high", "medium", "low"]),
      developmentSuggestions: z.array(z.string()),
    })
  ),

  overallRating: z.object({
    score: z.number().min(1).max(10),
    category: z.enum(["exceptional", "strong", "competent", "developing", "needs improvement"]),
    summary: z.string(),
  }),

  competencyCorrelations: z.array(
    z.object({
      primaryCompetency: z.string(),
      relatedCompetency: z.string(),
      correlationStrength: z.number(),
      insight: z.string(),
    })
  ),
});

export type EnhancedMetrics = z.infer<typeof enhancedMetricsSchema>;
