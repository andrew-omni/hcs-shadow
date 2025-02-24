import { Phase } from '../../core/interfaces/Phase';
import { ValidationStrategy } from './ValidationStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

const LOG_CLS_SHORT = 'Validation';

export class ValidationPhase implements Phase {
  constructor(private strategy: ValidationStrategy) { }

  async execute(context: PipelineContext): Promise<any> {

    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase Validation executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
