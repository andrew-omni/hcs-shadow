import { PipelineContext } from "../../core/interfaces/PipelineContext";

export interface ValidationStrategy {
  execute(context: PipelineContext): Promise<any>;

}
