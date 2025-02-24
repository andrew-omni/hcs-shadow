import { PipelineContext } from "../../core/interfaces/PipelineContext";

export interface VersioningStrategy {
   execute(context: PipelineContext): Promise<any>;
}
