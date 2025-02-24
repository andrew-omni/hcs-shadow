import { PipelineContext } from "../../core/interfaces/PipelineContext";
export interface OutputConversionStrategy {
    execute(context: PipelineContext): Promise<any>;

}
