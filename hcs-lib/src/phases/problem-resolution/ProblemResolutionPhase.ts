import { Phase } from '../../core/interfaces/Phase';
import { ProblemResolutionStrategy } from './ProblemResolutionStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

const LOG_CLS_SHORT = 'ProblemResolution';

export class ProblemResolutionPhase implements Phase {
  constructor(private strategy: ProblemResolutionStrategy) { }

  async execute(context: PipelineContext): Promise<any> {

    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase ProblemResolution executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
