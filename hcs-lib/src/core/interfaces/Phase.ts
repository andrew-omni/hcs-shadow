import { PipelineContext } from '../../core/interfaces/PipelineContext';
export interface Phase {
  execute(context: PipelineContext): Promise<any>;
}
