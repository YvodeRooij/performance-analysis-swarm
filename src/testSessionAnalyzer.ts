// src/testSessionAnalyzer.ts
import { mockAnalysisOutput, mockMetricsOutput, mockReportOutput } from './mocks/mockAnalysis';

// Define interfaces for our types
interface QualityEvaluation {
  score: number;
  passed: boolean;
  issues: string[];
  timestamp: string;
  feedbackCounts: Record<string, number>;
}

// Define formatter functions for testing
function formatQualityData(qualityData: Record<string, QualityEvaluation[]>): string {
  let output = "";
  
  for (const [agent, evaluations] of Object.entries(qualityData)) {
    if (evaluations.length === 0) continue;
    
    output += `\n== ${agent} Quality Evaluations ==\n`;
    
    evaluations.forEach((evaluation, idx) => {
      output += `\nEvaluation #${idx + 1}:\n`;
      output += `- Score: ${evaluation.score.toFixed(1)}\n`;
      output += `- Passed: ${evaluation.passed ? "YES" : "NO"}\n`;
      
      if (evaluation.issues.length > 0) {
        output += "- Issues:\n";
        evaluation.issues.forEach((issue: string, i: number) => {
          if (issue.trim()) {
            output += `  ${i + 1}. ${issue.trim()}\n`;
          }
        });
      }
      
      if (Object.keys(evaluation.feedbackCounts).length > 0) {
        output += "- Issue Types:\n";
        for (const [type, count] of Object.entries(evaluation.feedbackCounts)) {
          output += `  ${type}: ${count}\n`;
        }
      }
    });
  }
  
  return output;
}

interface WorkflowStep {
  step: number;
  agent: string;
  action: string;
  timestamp: string;
  targetAgent?: string;
  passed?: boolean;
  score?: number;
}

function formatWorkflowSteps(steps: WorkflowStep[]): string {
  let output = "\n== Workflow Execution Steps ==\n";
  
  steps.forEach((step) => {
    output += `\n${step.step}. [${new Date(step.timestamp).toLocaleTimeString()}] ${step.agent} -> ${step.action}`;
    
    if (step.targetAgent) {
      output += ` -> ${step.targetAgent}`;
    }
    
    if (step.passed !== undefined) {
      output += ` (${step.passed ? "PASSED" : "FAILED"}`;
      if (step.score !== undefined) {
        output += ` with score ${step.score.toFixed(1)}`;
      }
      output += ")";
    }
  });
  
  return output;
}

// Simple test to show output from the session analyzer
console.log("\n=== TEST: MOCK ANALYSIS OUTPUT ===");
console.log(JSON.stringify(mockAnalysisOutput, null, 2).substring(0, 500) + "...");

// Interface for core competency data
interface CompetencyData {
  score: number;
  strengths: string[];
  weaknesses: string[];
  developmentAreas: string[];
  evidenceCount: number;
  confidence: number;
}

// Show scores from the mock analysis
console.log("\n=== COMPETENCY SCORES ===");
Object.entries(mockAnalysisOutput.coreCompetencies).forEach(([competency, data]) => {
  const competencyData = data as CompetencyData;
  console.log(`${competency}: ${competencyData.score}/10`);
});

// Show visualization data
console.log("\n=== VISUALIZATION DATA ===");
console.log(JSON.stringify(mockAnalysisOutput.visualizationData, null, 2));

// Show the final report human readable output
console.log("\n=== FINAL REPORT ===");
console.log(mockReportOutput.humanReadable);

// Create mock quality data for testing format functions
const mockQualityData = {
  SessionAnalyzer: [
    {
      score: 7.5,
      passed: false,
      issues: ["Insufficient evidence for business acumen rating", "Unbalanced analysis without weaknesses"],
      timestamp: new Date().toISOString(),
      feedbackCounts: {
        insufficientEvidence: 2,
        unbalancedAnalysis: 1
      }
    },
    {
      score: 8.5,
      passed: true,
      issues: [],
      timestamp: new Date().toISOString(),
      feedbackCounts: {}
    }
  ],
  MetricsCalculator: [
    {
      score: 8.0,
      passed: true,
      issues: ["Minor formatting issues"],
      timestamp: new Date().toISOString(),
      feedbackCounts: {
        poorStructure: 1
      }
    }
  ]
};

// Test the formatting functions
console.log("\n=== QUALITY DATA FORMATTED ===");
console.log(formatQualityData(mockQualityData));

const mockWorkflowSteps = [
  {
    step: 1,
    agent: "SessionAnalyzer",
    action: "output",
    timestamp: new Date().toISOString()
  },
  {
    step: 2,
    agent: "QualityJudge",
    action: "evaluate",
    timestamp: new Date().toISOString(),
    targetAgent: "SessionAnalyzer",
    passed: false,
    score: 7.5
  },
  {
    step: 3,
    agent: "QualityJudge",
    action: "feedback",
    timestamp: new Date().toISOString(),
    targetAgent: "SessionAnalyzer"
  },
  {
    step: 4,
    agent: "SessionAnalyzer",
    action: "output",
    timestamp: new Date().toISOString()
  },
  {
    step: 5,
    agent: "QualityJudge",
    action: "evaluate",
    timestamp: new Date().toISOString(),
    targetAgent: "SessionAnalyzer",
    passed: true,
    score: 8.5
  }
];

console.log("\n=== WORKFLOW STEPS FORMATTED ===");
console.log(formatWorkflowSteps(mockWorkflowSteps));

console.log("\nTest completed successfully!");