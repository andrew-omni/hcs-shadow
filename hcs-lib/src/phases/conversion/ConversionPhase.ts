import { Phase } from '../../core/interfaces/Phase';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { ConversionStrategy } from './ConversionStrategy';
import { Log } from '../../logger';

const LOG_CLS_SHORT = 'Conversion';

export class ConversionPhase implements Phase {
  constructor(private strategy: ConversionStrategy) { }

  async execute(context: PipelineContext): Promise<any> {

    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase Conversion executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
