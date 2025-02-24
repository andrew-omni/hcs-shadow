import { PipelineContext } from "../../core/interfaces/PipelineContext";

export interface SerializationStrategy {
    execute(context: PipelineContext): Promise<any>;
}
