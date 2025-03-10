import { z } from "zod";

// Define the core competency schema with detailed attributes
const competencySchema = z.object({
  score: z.number().min(1).max(10),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  developmentAreas: z.array(z.string()),
  evidenceCount: z.number(),
  confidence: z.number().min(1).max(10),
});

// Define detailed evidence schema with context and impact
const evidenceSchema = z.object({
  quote: z.string(),
  analysis: z.string(),
  strength: z.boolean(),
  competency: z.string(),
  impact: z.string().optional(),
  context: z.string().optional(),
  timestamp: z.string().optional(),
});

// Enhanced analysis schema with more detailed structure
export const enhancedAnalysisSchema = z.object({
  // Communication-specific metrics
  communicationMetrics: z.object({
    clarity: z.number().min(1).max(10),
    confidence: z.number().min(1).max(10),
    pacing: z.number().min(1).max(10),
    articulation: z.number().min(1).max(10),
    nonVerbalCues: z.number().min(1).max(10).optional(),
    fillerWords: z.object({
      frequency: z.number(),
      examples: z.array(z.string()),
      impact: z.string(),
    }),
  }),

  // Core competencies with detailed structure
  coreCompetencies: z.object({
    businessAcumen: competencySchema,
    quantitativeSkills: competencySchema,
    problemSolving: competencySchema,
    structuredThinking: competencySchema,
    leadership: competencySchema,
    communication: competencySchema,
  }),

  // Evidence catalog with detailed context and impact
  evidenceCatalog: z.array(evidenceSchema),

  // Competency-specific evidence mapping
  evidenceByCompetency: z.record(
    z.string(),
    z.array(evidenceSchema)
  ),

  // Key behavioral patterns
  keyPatterns: z.array(
    z.object({
      pattern: z.string(),
      frequency: z.string(),
      impact: z.string(),
      relatedCompetencies: z.array(z.string()),
    })
  ),

  // Overall strengths and weaknesses
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),

  // Detailed analysis of specific responses
  exampleResponses: z.array(
    z.object({
      question: z.string().optional(),
      response: z.string(),
      strengths: z.array(z.string()),
      weaknesses: z.array(z.string()),
      competenciesDisplayed: z.array(z.string()),
      qualityOfReasoning: z.number().min(1).max(10),
    })
  ),
  
  // Overall assessment
  overallAssessment: z.object({
    summary: z.string(),
    topCompetencies: z.array(z.string()),
    developmentPriorities: z.array(z.string()),
    fitAssessment: z.string(),
    confidenceInAssessment: z.number().min(1).max(10),
  }),
  
  // Visualization data for radar charts and other visualizations
  visualizationData: z.object({
    competencyRadarData: z.record(z.string(), z.number()),
    strengthsWeaknessesRatio: z.record(z.string(), z.number()),
    evidenceDistribution: z.record(z.string(), z.number()),
  }),
});

export type EnhancedAnalysis = z.infer<typeof enhancedAnalysisSchema>;
