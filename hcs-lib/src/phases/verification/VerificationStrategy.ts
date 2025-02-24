import { PipelineContext } from "../../core/interfaces/PipelineContext";

export interface VerificationStrategy {
   execute(context: PipelineContext): Promise<any>;
}
