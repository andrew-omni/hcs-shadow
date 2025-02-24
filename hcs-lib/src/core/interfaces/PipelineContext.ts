import { ConfigSet } from '../ConfigSet';
import { HcsManager } from '../HcsManager';
import { ValidationError } from './ValidationError';

export interface PipelineContext {
  hcsManager: HcsManager;
  modelId: string;
  configSet: ConfigSet;
  data: Map<string, any>; // Arbitrary data store for inter-phase communication
  errors: ValidationError[]; // Centralized error collection across phases
}