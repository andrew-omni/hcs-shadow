import { ProblemResolutionStrategy } from './ProblemResolutionStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

const LOG_CLS_SHORT = 'ProblemResolution';

export class DefaultProblemResolutionStrategy implements ProblemResolutionStrategy {
    async execute(context: PipelineContext): Promise<any> {
  
    Log.info(LOG_CLS_SHORT, 'ProblemResolution', 'Executing default strategy for model ID: ' + context.modelId);
    return { id: context.modelId, phase: 'ProblemResolution', content: 'Default content' };
  }
}
