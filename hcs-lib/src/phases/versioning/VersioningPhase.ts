import { Phase } from '../../core/interfaces/Phase';
import { VersioningStrategy } from './VersioningStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

const LOG_CLS_SHORT = 'Versioning';

export class VersioningPhase implements Phase {
  constructor(private strategy: VersioningStrategy) {}

  async execute(context: PipelineContext): Promise<any> {

    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase Versioning executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
