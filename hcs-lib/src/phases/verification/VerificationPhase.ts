import { Phase } from '../../core/interfaces/Phase';
import { VerificationStrategy } from './VerificationStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

const LOG_CLS_SHORT = 'Verification';

export class VerificationPhase implements Phase {
  constructor(private strategy: VerificationStrategy) {}

  async execute(context: PipelineContext): Promise<any> {

    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase Verification executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
