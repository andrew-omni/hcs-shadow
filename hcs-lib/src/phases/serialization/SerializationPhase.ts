import { Phase } from '../../core/interfaces/Phase';
import { SerializationStrategy } from './SerializationStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';

const LOG_CLS_SHORT = 'Serialization';
export class SerializationPhase implements Phase {
  constructor(private strategy: SerializationStrategy) {}

    async execute(context: PipelineContext): Promise<any> {
  
    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase Serialization executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
