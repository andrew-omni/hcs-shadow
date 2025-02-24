import { PipelineContext } from '../../core/interfaces/PipelineContext';
export interface ConversionStrategy {
  execute(context: PipelineContext): Promise<any>;
}
