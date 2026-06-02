import { z } from 'zod';

export const InsightSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  why_it_matters: z.string().min(1).max(500),
});

export const ChartSpecSchema = z.object({
  type: z.enum(['bar', 'line', 'pie']),
  title: z.string().min(1).max(200),
  x_column: z.string().min(1),
  y_column: z.string().min(1),
  group_by: z.string().nullable().optional(),
});

export const AnalyzeResponseSchema = z.object({
  insights: z.array(InsightSchema).min(3).max(5),
  suggested_charts: z.array(ChartSpecSchema).min(2).max(3),
  followup_questions: z.array(z.string().min(1).max(300)).length(3),
});

export const FollowupResponseSchema = z.object({
  answer: z.string().min(1).max(1200),
});

export const ContactRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(200),
  company: z.string().max(200).optional(),
  message: z.string().min(1).max(2000),
});

export type Insight = z.infer<typeof InsightSchema>;
export type ChartSpec = z.infer<typeof ChartSpecSchema>;
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
export type FollowupResponse = z.infer<typeof FollowupResponseSchema>;
export type ContactRequest = z.infer<typeof ContactRequestSchema>;
