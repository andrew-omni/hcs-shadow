import { BaseJsonValidator } from "./BaseJsonValidator";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ContextUtils } from "../../core/ContextUtils";
import { ValidationError } from "../interfaces/ValidationError";
import { Log } from "../../logger";

const LOG_CLS_SHORT = "ModelValidator";

export class ModelValidator extends BaseJsonValidator {
    constructor() {
        super();
    }

    /**
     * Validates a model by its ID using the data available in the pipeline context.
     * @param modelId - The ID of the model to validate.
     * @param context - The pipeline context containing all loaded models and schemas.
     * @returns List of validation errors.
     */
    async validate(
        modelId: string,
        context: PipelineContext
    ): Promise<ValidationError[]> {
        const validationErrors: ValidationError[] = [];

        // 🔍 Retrieve the model from the context
        const model = ContextUtils.getPhaseData<any>(
            context,
            "conversion",
            "models",
            modelId
        );

        if (!model) {
            const error = this.formatValidationError(
                modelId,
                0,
                0,
                0,
                `Model with ID '${modelId}' not found in context.`,
                "error"
            );
            Log.error(LOG_CLS_SHORT, "VALIDATE", `❌ Model not found for ID: ${modelId}`);
            validationErrors.push(error);
            return validationErrors;
        }

        // ✅ Run base validations inherited from BaseJsonValidator
        const absPath = context.configSet.modelIdsToAbsPathMap.get(modelId);

        if (!absPath) {
            validationErrors.push(this.formatValidationError(
                modelId,
                0,
                0,
                0,
                `Model with ID '${modelId}' not found in config set.`,
                "error"
            ));
        } else {
            validationErrors.push(...this.baseValidations(model, absPath!, context));

            if (validationErrors.length > 0) {
                Log.debug(
                    LOG_CLS_SHORT,
                    "VALIDATE",
                    `❌ Model validation failed for '${modelId}': ${JSON.stringify(validationErrors)}`
                );
            } else {
                Log.debug(LOG_CLS_SHORT, "VALIDATE", `✅ Model successfully validated: ${modelId}`);
            }
        }



        return validationErrors;
    }

    /**
     * Formats validation errors in a standardized structure.
     */
    protected formatValidationError(
        filePath: string,
        line: number,
        startChar: number,
        endChar: number,
        message: string,
        severity: "error" | "warning"
    ): ValidationError {
        return {
            filePath,
            line,
            column: startChar,
            endColumn: endChar,
            message,
            severity,
        };
    }
}
