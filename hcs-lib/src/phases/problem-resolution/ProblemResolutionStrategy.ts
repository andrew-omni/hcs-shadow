import { PipelineContext } from "../../core/interfaces/PipelineContext";

export interface ProblemResolutionStrategy {
  execute(context: PipelineContext): Promise<any>;
}
