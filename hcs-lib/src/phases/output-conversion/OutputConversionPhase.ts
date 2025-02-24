import { Phase } from '../../core/interfaces/Phase';
import { OutputConversionStrategy } from './OutputConversionStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

const LOG_CLS_SHORT = 'OutputConversion';

export class OutputConversionPhase implements Phase {
  constructor(private strategy: OutputConversionStrategy) {}

    async execute(context: PipelineContext): Promise<any> {
    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase OutputConversion executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
