import { ValidationError } from './ValidationError';

export interface PipelineResult {
  modelId: string;
  success: boolean;
  errors?: ValidationError[];
  outputPath?: string;
}

// PipelineResults.ts
export interface PipelineResults {
  results: PipelineResult[];
  hasErrors: boolean; // Flag to indicate if any errors occurred across all pipelines
}