import { PipelineContext } from '../../core/interfaces/PipelineContext';
export interface IngestStrategy {
  execute(context: PipelineContext): Promise<any>;
}
