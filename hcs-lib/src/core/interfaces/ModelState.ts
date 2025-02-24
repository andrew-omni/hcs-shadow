import { ValidationError } from './ValidationError';

export interface ModelState {
  modelId: string;
  currentPhase: string;
  valid: boolean;
  problems?: ValidationError[];
}
