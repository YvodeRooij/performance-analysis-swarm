import { z } from "zod";

export const enhancedAnalysisSchema = z.object({
  communicationMetrics: z.object({
    clarity: z.number().min(1).max(10),
    confidence: z.number().min(1).max(10),
    pacing: z.number().min(1).max(10),
    fillerWords: z.object({
      frequency: z.number(),
      examples: z.array(z.string()),
    }),
  }),

  coreCompetencies: z.object({
    businessAcumen: z.number().min(1).max(10),
    quantitativeSkills: z.number().min(1).max(10),
    problemSolving: z.number().min(1).max(10),
    structuredThinking: z.number().min(1).max(10),
    leadership: z.number().min(1).max(10),
    communication: z.number().min(1).max(10),
  }),

  evidenceByCompetency: z.record(
    z.string(),
    z.array(
      z.object({
        quote: z.string(),
        analysis: z.string(),
        strength: z.boolean(),
      })
    )
  ),

  keyPatterns: z.array(
    z.object({
      pattern: z.string(),
      frequency: z.string(),
      impact: z.string(),
    })
  ),

  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),

  exampleResponses: z.array(
    z.object({
      question: z.string().optional(),
      response: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
    })
  ),
});

export type EnhancedAnalysis = z.infer<typeof enhancedAnalysisSchema>;
