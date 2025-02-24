import { Phase } from '../../core/interfaces/Phase';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { IngestStrategy } from './IngestStrategy';
import { Log } from '../../logger';

const LOG_CLS_SHORT = 'Ingest';

export class IngestPhase implements Phase {
  constructor(private strategy: IngestStrategy) {}

  async execute(context: PipelineContext): Promise<any> {
    Log.debug(LOG_CLS_SHORT, 'exe', 'Phase Ingest executed for model ID: ' + context.modelId);
    return await this.strategy.execute(context);
  }
}
