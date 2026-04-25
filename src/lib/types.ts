// Shared TypeScript types for the AI Interview Platform

export interface JDContext {
  roleTitle: string;
  experienceLevel: string;
  skills: string[];
  companyContext: string;
  interviewStyle: string;
  keyTopics: string[];
}

export interface Question {
  id: string;
  topic: string;
  question: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'technical' | 'behavioral' | 'system-design';
  followUpHints: string[];
}

export interface QuestionBank {
  questions: Question[];
}

export interface InterviewSession {
  candidateName: string;
  jdContext: JDContext;
  questionBank: QuestionBank;
}

export interface QuestionFeedback {
  questionId: string;
  question: string;
  score: number;
  whatWasSaid: string;
  idealAnswer: string;
  improvement: string;
}

export interface FullReport {
  overallScore: number;
  technicalDepth: number;
  communication: number;
  relevance: number;
  confidence: number;
  strengths: string[];
  weaknesses: string[];
  detailedFeedback: string;
  questionFeedback: QuestionFeedback[];
}
