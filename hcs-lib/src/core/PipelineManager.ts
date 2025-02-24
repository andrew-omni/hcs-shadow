import { Log } from '../logger';
import { ConfigSetManager } from './ConfigSetManager';
import { CacheManager } from './CacheManager';
import { Phase } from './interfaces/Phase';
import { PipelineContext } from './interfaces/PipelineContext';
import { ValidationPhase } from '../phases/validation/ValidationPhase';
import { ConversionPhase } from '../phases/conversion/ConversionPhase';
import { VerificationPhase } from '../phases/verification/VerificationPhase';
import { BuildPhase } from '../phases/build/BuildPhase';

export class PipelineManager {
  private phases: Phase[] = [];

  constructor(
    private configSetManager: ConfigSetManager,
    private cacheManager: CacheManager
  ) { }

  // Register a pipeline phase
  registerPhase(phase: Phase): void {
    this.phases.push(phase);
    Log.debug('PipelineManager', 'rp', 'Registered phase: ' + phase.constructor.name);
  }

  // If we have errors in the context, the following phases cannot run and we should abort immediately
  // e.g. if we failed to convert objects, halt the pipeline before it is fixed.
  // e.g. If we have verification errors (post-build), allow the pipeline to continue to either resolve 
  // or write out intermediate files.
  private phasesThatRequireNoErrors = [ConversionPhase, ValidationPhase, BuildPhase, VerificationPhase ];
  // Execute the pipeline for a given model ID
  async executePipeline(context: PipelineContext): Promise<void> {
    Log.debug('PipelineManager', 'ep', 'Starting pipeline for model ID: ' + context.modelId);
    for (const phase of this.phases) {
      if (this.phasesThatRequireNoErrors.includes(phase.constructor as any) && context.errors.length > 0) {
        Log.warn('PipelineManager', 'ep', `Errors found in context, halting pipeline for model ID: ${context.modelId} BEFORE phase ${phase.constructor.name}`);

        break;
      }
      await phase.execute(context);
    }
    Log.debug('PipelineManager', 'ep', 'Pipeline completed for model ID: ' + context.modelId);
  }
}
