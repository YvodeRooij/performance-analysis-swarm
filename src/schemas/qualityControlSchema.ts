import { z } from "zod";

export const qualityControlSchema = z.object({
  outputType: z.string(),
  criteria: z.array(
    z.object({
      name: z.string(),
      weight: z.number(),
      score: z.number().min(1).max(10),
      feedback: z.string(),
    })
  ),
  overallScore: z.number(),
  passThreshold: z.number(),
  passed: z.boolean(),
  feedback: z.string(),
  improvementSuggestions: z.array(z.string()),
});

export type QualityControl = z.infer<typeof qualityControlSchema>;
