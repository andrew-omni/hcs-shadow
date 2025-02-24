import { Phase } from '../../core/interfaces/Phase';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

import { BuildStrategy } from './BuildStrategy';
import { Log } from '../../logger';

const LOG_CLS_SHORT = 'Build';

export class BuildPhase implements Phase {
  constructor(private strategy: BuildStrategy) {}

  async execute(context: PipelineContext): Promise<any> {
    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase Build executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
