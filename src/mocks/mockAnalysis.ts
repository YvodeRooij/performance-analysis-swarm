// Mock analysis data for testing
export const mockAnalysisOutput = {
  communicationMetrics: {
    clarity: 8,
    confidence: 8,
    pacing: 7,
    articulation: 8,
    fillerWords: {
      frequency: 3,
      examples: ["Alright", "Okay", "Got it"],
      impact: "Minimal impact on overall communication"
    }
  },
  coreCompetencies: {
    businessAcumen: {
      score: 8,
      strengths: ["Strong market sizing approach", "Good understanding of business model"],
      weaknesses: ["Could have considered more revenue streams"],
      developmentAreas: ["More focus on competitive positioning"],
      evidenceCount: 4,
      confidence: 8
    },
    quantitativeSkills: {
      score: 7,
      strengths: ["Clear calculation of market size", "Logical financial projections"],
      weaknesses: ["Simplified assumptions about profit margins"],
      developmentAreas: ["Greater depth in financial modeling"],
      evidenceCount: 3,
      confidence: 7
    },
    problemSolving: {
      score: 8,
      strengths: ["Structured approach to market entry problem", "Identified key issues quickly"],
      weaknesses: ["Limited exploration of alternative solutions"],
      developmentAreas: ["More creative solution generation"],
      evidenceCount: 4,
      confidence: 8
    },
    structuredThinking: {
      score: 9,
      strengths: ["Excellent framework creation", "Logical breakdown of components"],
      weaknesses: ["Could improve prioritization of issues"],
      developmentAreas: ["More explicit hypothesis testing"],
      evidenceCount: 4,
      confidence: 9
    },
    leadership: {
      score: 6,
      strengths: ["Confident recommendations", "Takes ownership of analysis"],
      weaknesses: ["Limited demonstration of stakeholder management"],
      developmentAreas: ["More emphasis on implementation leadership"],
      evidenceCount: 3,
      confidence: 6
    },
    communication: {
      score: 8,
      strengths: ["Clear articulation of ideas", "Concise summaries"],
      weaknesses: ["Occasional use of filler words"],
      developmentAreas: ["More tailoring to audience needs"],
      evidenceCount: 4,
      confidence: 8
    }
  },
  evidenceCatalog: [
    {
      quote: "I'd start with market demand—how many people in this city drink coffee, and how often?",
      analysis: "Shows structured approach to market sizing",
      strength: true,
      competency: "structuredThinking",
      impact: "Establishes clear foundation for analysis",
      context: "Early in interview when framing approach"
    },
    {
      quote: "With 200,000 people, I'd first estimate demand. I'd assume a portion of the population drinks coffee regularly. Maybe there's some industry data—say, 60% of people drink coffee at least once a week.",
      analysis: "Demonstrates quantitative skills in market sizing",
      strength: true,
      competency: "quantitativeSkills",
      impact: "Builds credible market size estimate",
      context: "Middle of interview during market sizing"
    }
  ],
  evidenceByCompetency: {
    businessAcumen: [
      {
        quote: "My first step would be to analyze the market to understand if this is a viable opportunity for the client.",
        analysis: "Shows business-first mindset",
        strength: true,
        competency: "businessAcumen",
        impact: "Sets commercial focus",
        context: "Beginning of case"
      },
      {
        quote: "So the chains are dominant—$1.25 million each annually, versus $312,500 for local shops.",
        analysis: "Identifies competitive market dynamics",
        strength: true,
        competency: "businessAcumen",
        impact: "Reveals market structure",
        context: "Middle of case discussing competition"
      }
    ],
    quantitativeSkills: [
      {
        quote: "With 60,000 coffee shop customers... That's $31 million annually, but that's if every customer only buys from shops, which isn't realistic",
        analysis: "Performs complex calculation with assumptions",
        strength: true,
        competency: "quantitativeSkills",
        impact: "Builds realistic market sizing",
        context: "During market sizing section"
      }
    ],
    problemSolving: [
      {
        quote: "Our client could aim for the local segment's average—say, $300,000 to $400,000 in revenue—but we'd need to differentiate.",
        analysis: "Identifies key problem and potential solution",
        strength: true,
        competency: "problemSolving",
        impact: "Frames strategic challenge",
        context: "When discussing competitive positioning"
      }
    ],
    structuredThinking: [
      {
        quote: "I'd start with market demand—how many people in this city drink coffee, and how often? Then, I'd look at competition—who's already in the market, and how saturated is it?",
        analysis: "Creates clear framework with logical components",
        strength: true,
        competency: "structuredThinking",
        impact: "Provides structure for entire analysis",
        context: "Framework building at start of case"
      }
    ],
    leadership: [
      {
        quote: "I'd recommend the client proceed, but with a clear strategy: invest $200,000 upfront, target $400,000 revenue in year one",
        analysis: "Takes clear position with actionable recommendation",
        strength: true,
        competency: "leadership",
        impact: "Provides decisive direction",
        context: "Final recommendation"
      }
    ],
    communication: [
      {
        quote: "Great, so I'd start with market demand—how many people in this city drink coffee, and how often? That'll give us a sense of the customer base.",
        analysis: "Clearly articulates approach with easy-to-follow logic",
        strength: true,
        competency: "communication",
        impact: "Establishes rapport with interviewer",
        context: "Initial framework explanation"
      }
    ]
  },
  keyPatterns: [
    {
      pattern: "Structured framework application",
      frequency: "Frequent (used consistently)",
      impact: "Positive - organizes thoughts clearly",
      relatedCompetencies: ["structuredThinking", "communication"]
    },
    {
      pattern: "Quantitative reasoning with assumptions",
      frequency: "Regular (in 4 key segments)",
      impact: "Positive - grounds analysis in numbers",
      relatedCompetencies: ["quantitativeSkills", "businessAcumen"]
    }
  ],
  strengths: [
    "Excellent structured thinking with clear framework",
    "Strong quantitative skills in market sizing",
    "Clear and confident communication",
    "Logical business acumen in competitive assessment"
  ],
  weaknesses: [
    "Limited exploration of alternative strategies",
    "Some simplified assumptions in financial projections",
    "Occasional missed opportunities to demonstrate leadership"
  ],
  exampleResponses: [
    {
      question: "How would you approach helping them make this decision?",
      response: "I'd break it down into a few key areas. So, I'd start with market demand—how many people in this city drink coffee, and how often? That'll give us a sense of the customer base. Then, I'd look at competition—who's already in the market, and how saturated is it?",
      strengths: ["Clear structure", "Logical breakdown"],
      weaknesses: ["Could be more concise"],
      competenciesDisplayed: ["structuredThinking", "communication"],
      qualityOfReasoning: 8
    }
  ],
  overallAssessment: {
    summary: "The candidate demonstrated strong analytical skills, particularly in structured thinking and business analysis. Their approach was methodical and quantitatively sound, with clear communication throughout.",
    topCompetencies: ["structuredThinking", "businessAcumen", "communication"],
    developmentPriorities: ["More creative problem solving", "Deeper financial modeling"],
    fitAssessment: "Good fit for strategy consulting roles requiring structured analysis and quantitative skills",
    confidenceInAssessment: 8
  },
  visualizationData: {
    competencyRadarData: {
      businessAcumen: 8,
      quantitativeSkills: 7,
      problemSolving: 8,
      structuredThinking: 9,
      leadership: 6,
      communication: 8
    },
    strengthsWeaknessesRatio: {
      businessAcumen: 2,
      quantitativeSkills: 2,
      problemSolving: 2,
      structuredThinking: 3,
      leadership: 1.5,
      communication: 2
    },
    evidenceDistribution: {
      businessAcumen: 0.25,
      quantitativeSkills: 0.15,
      problemSolving: 0.15,
      structuredThinking: 0.25,
      leadership: 0.1,
      communication: 0.1
    }
  }
};

export const mockMetricsOutput = {
  overallScore: 7.8,
  competencyScores: {
    businessAcumen: 8,
    quantitativeSkills: 7, 
    problemSolving: 8,
    structuredThinking: 9,
    leadership: 6,
    communication: 8
  },
  benchmarks: {
    industryAverage: 6.5,
    percentileRanking: 75,
    comparisonByCompetency: {
      businessAcumen: {
        score: 8,
        industryAverage: 6,
        percentile: 80
      },
      quantitativeSkills: {
        score: 7,
        industryAverage: 7,
        percentile: 50
      },
      problemSolving: {
        score: 8,
        industryAverage: 6.5,
        percentile: 75
      },
      structuredThinking: {
        score: 9,
        industryAverage: 6,
        percentile: 90
      },
      leadership: {
        score: 6,
        industryAverage: 6.5,
        percentile: 45
      },
      communication: {
        score: 8,
        industryAverage: 7,
        percentile: 75
      }
    }
  },
  developmentPriorities: [
    {
      competency: "leadership",
      currentScore: 6,
      targetScore: 8,
      activities: [
        "Practice stakeholder management scenarios",
        "Focus on implementation planning in cases"
      ],
      timeframe: "3-6 months"
    },
    {
      competency: "quantitativeSkills",
      currentScore: 7,
      targetScore: 8,
      activities: [
        "Develop more sophisticated financial models",
        "Practice sensitivity analysis"
      ],
      timeframe: "2-3 months"
    }
  ],
  competencyCorrelations: [
    {
      competencies: ["structuredThinking", "problemSolving"],
      correlationStrength: 0.8,
      explanation: "Strong framework enables effective problem solving"
    },
    {
      competencies: ["communication", "leadership"],
      correlationStrength: 0.7,
      explanation: "Clear communication enhances leadership effectiveness"
    }
  ],
  evidenceQuality: {
    businessAcumen: {
      evidenceCount: 4,
      qualityScore: 7.5,
      gapAnalysis: "More examples of strategic positioning needed"
    },
    quantitativeSkills: {
      evidenceCount: 3,
      qualityScore: 7.0,
      gapAnalysis: "More complex calculations would strengthen evidence"
    },
    problemSolving: {
      evidenceCount: 4,
      qualityScore: 7.5,
      gapAnalysis: "More creative solutions would enhance rating"
    },
    structuredThinking: {
      evidenceCount: 4,
      qualityScore: 8.5,
      gapAnalysis: "Strong evidence, minor improvements in prioritization"
    },
    leadership: {
      evidenceCount: 3,
      qualityScore: 6.0,
      gapAnalysis: "Limited evidence, needs more stakeholder management examples"
    },
    communication: {
      evidenceCount: 4,
      qualityScore: 8.0,
      gapAnalysis: "Strong evidence, minor improvements in conciseness"
    }
  },
  overallAssessment: {
    strengths: [
      "Exceptional structured thinking ability",
      "Strong business analysis skills",
      "Clear and effective communication"
    ],
    developmentAreas: [
      "Leadership presence and stakeholder management",
      "More sophisticated quantitative analysis"
    ],
    fitAssessment: "Strong fit for strategy consulting roles, particularly in structured cases"
  }
};

export const mockReportOutput = {
  title: "Performance Analysis: Strategy Consulting Case Interview",
  executiveSummary: "The candidate demonstrated strong analytical capabilities, particularly in structured thinking and business analysis. With a methodical approach and clear communication, they effectively tackled the coffee shop market entry case. While demonstrating excellence in framework development and quantitative reasoning, opportunities for growth exist in leadership presence and creative problem solving.",
  competencyBreakdown: {
    businessAcumen: {
      score: 8,
      summary: "Strong business insight demonstrated through market analysis and competitive positioning",
      evidence: [
        "Developed realistic market sizing approach",
        "Identified competitive dynamics between chains and independents"
      ],
      developmentAreas: [
        "Consider broader strategic implications",
        "Explore more revenue stream options"
      ]
    },
    quantitativeSkills: {
      score: 7,
      summary: "Solid numerical reasoning with appropriate assumptions and calculations",
      evidence: [
        "Clear market sizing calculation methodology",
        "Logical financial projections for new entrant"
      ],
      developmentAreas: [
        "Incorporate sensitivity analysis",
        "Develop more sophisticated financial models"
      ]
    },
    problemSolving: {
      score: 8,
      summary: "Effective problem structuring and solution development",
      evidence: [
        "Methodical breakdown of market entry challenge",
        "Identified key issues requiring resolution"
      ],
      developmentAreas: [
        "Generate more creative solution options",
        "Consider more implementation challenges"
      ]
    },
    structuredThinking: {
      score: 9,
      summary: "Exceptional framework development and organized analysis",
      evidence: [
        "Created comprehensive framework covering all key areas",
        "Logical progression through analysis components"
      ],
      developmentAreas: [
        "Further refine prioritization approach",
        "More explicit hypothesis testing"
      ]
    },
    leadership: {
      score: 6,
      summary: "Demonstrated basic leadership through recommendations, room for growth",
      evidence: [
        "Provided clear final recommendation",
        "Showed ownership of analysis and conclusions"
      ],
      developmentAreas: [
        "Develop stakeholder management skills",
        "Enhance implementation planning approach"
      ]
    },
    communication: {
      score: 8,
      summary: "Clear, structured communication throughout the case",
      evidence: [
        "Articulated complex concepts clearly",
        "Maintained logical narrative flow"
      ],
      developmentAreas: [
        "Reduce occasional filler words",
        "More tailoring to audience needs"
      ]
    }
  },
  developmentPlan: {
    priorityAreas: [
      {
        competency: "Leadership",
        activities: [
          "Practice stakeholder management scenarios",
          "Include implementation planning in case responses",
          "Take more definitive positions in ambiguous situations"
        ],
        resources: [
          "Leadership case studies",
          "Stakeholder management workshops"
        ],
        timeframe: "3-6 months"
      },
      {
        competency: "Quantitative Skills",
        activities: [
          "Practice more complex financial modeling",
          "Incorporate sensitivity analysis in calculations",
          "Develop scenarios with different assumptions"
        ],
        resources: [
          "Financial modeling courses",
          "Advanced Excel/modeling practice"
        ],
        timeframe: "2-3 months"
      }
    ],
    measurementCriteria: [
      "Increased leadership score to 7+ in next evaluation",
      "Demonstration of complex financial models in cases",
      "Improved stakeholder analysis in recommendations"
    ]
  },
  visualizations: {
    competencyRadar: {
      data: {
        businessAcumen: 8,
        quantitativeSkills: 7,
        problemSolving: 8,
        structuredThinking: 9,
        leadership: 6,
        communication: 8
      },
      insights: "Strong overall profile with exceptional structured thinking and clear areas for focused development"
    },
    benchmarkComparison: {
      data: {
        candidate: [8, 7, 8, 9, 6, 8],
        average: [6, 7, 6.5, 6, 6.5, 7]
      },
      insights: "Exceeds benchmark in most areas, particularly in structured thinking and business acumen"
    },
    developmentPriorities: {
      data: [
        ["Leadership", 6, 8],
        ["Quantitative Skills", 7, 8]
      ],
      insights: "Focused development on two key areas can create a more balanced and exceptional profile"
    }
  },
  conclusion: "The candidate shows strong potential for success in strategy consulting roles, with a particularly strong foundation in structured thinking and analysis. By focusing development efforts on leadership presence and advanced quantitative analysis, they can build a more comprehensive consultant skill set. Overall assessment: Strong fit for strategy consulting with targeted development needs.",
  humanReadable: "# Performance Analysis: Strategy Consulting Case Interview\n\n## Executive Summary\nThe candidate demonstrated strong analytical capabilities, particularly in structured thinking (9/10) and business analysis (8/10). With a methodical approach and clear communication, they effectively tackled the coffee shop market entry case. While demonstrating excellence in framework development and quantitative reasoning, opportunities for growth exist in leadership presence (6/10) and creative problem solving.\n\n## Competency Breakdown\n\n### Structured Thinking: 9/10 ★★★★★\n**Strengths:** Exceptional framework creation, logical breakdown of problem components\n**Areas for Development:** Further refine prioritization approach, more explicit hypothesis testing\n\n### Business Acumen: 8/10 ★★★★☆\n**Strengths:** Strong market sizing approach, good understanding of business model\n**Areas for Development:** Consider broader strategic implications, explore more revenue stream options\n\n### Communication: 8/10 ★★★★☆\n**Strengths:** Clear articulation of ideas, concise summaries of complex concepts\n**Areas for Development:** Reduce occasional filler words, more tailoring to audience needs\n\n### Problem Solving: 8/10 ★★★★☆\n**Strengths:** Methodical breakdown of market entry challenge, identified key issues requiring resolution\n**Areas for Development:** Generate more creative solution options, consider more implementation challenges\n\n### Quantitative Skills: 7/10 ★★★★☆\n**Strengths:** Clear market sizing calculation methodology, logical financial projections\n**Areas for Development:** Incorporate sensitivity analysis, develop more sophisticated financial models\n\n### Leadership: 6/10 ★★★☆☆\n**Strengths:** Provided clear final recommendation, showed ownership of analysis\n**Areas for Development:** Develop stakeholder management skills, enhance implementation planning approach\n\n## Priority Development Areas\n\n1. **Leadership** (Current: 6/10 → Target: 8/10)\n   - Practice stakeholder management scenarios\n   - Include implementation planning in case responses\n   - Take more definitive positions in ambiguous situations\n   - Timeframe: 3-6 months\n\n2. **Quantitative Skills** (Current: 7/10 → Target: 8/10)\n   - Practice more complex financial modeling\n   - Incorporate sensitivity analysis in calculations\n   - Develop scenarios with different assumptions\n   - Timeframe: 2-3 months\n\n## Conclusion\nThe candidate shows strong potential for success in strategy consulting roles, with a particularly strong foundation in structured thinking and analysis. By focusing development efforts on leadership presence and advanced quantitative analysis, they can build a more comprehensive consultant skill set.\n\n**Overall Assessment:** Strong fit for strategy consulting with targeted development needs."
};

// Helper function to format the mock data for the swarm
export const mockAnalysis = {
  analysis: `Analysis Output: ${JSON.stringify(mockAnalysisOutput)}`,
  metrics: `Metrics Output: ${JSON.stringify(mockMetricsOutput)}`,
  report: `Report Output: ${JSON.stringify(mockReportOutput)}`
};

// Add a simplified version for debugging
export const simplifiedMockData = {
  analyze_transcript: { transcript: "mock transcript" },
  evaluate_output: { 
    outputType: "Analysis", 
    content: mockAnalysis.analysis,
    sourceAgent: "SessionAnalyzer"
  }
};