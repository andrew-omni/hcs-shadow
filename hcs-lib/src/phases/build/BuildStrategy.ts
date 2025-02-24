import { PipelineContext } from '../../core/interfaces/PipelineContext';
export interface BuildStrategy {
  execute(context: PipelineContext): Promise<any>;

}
