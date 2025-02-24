import { BaseJsonValidator } from "./BaseJsonValidator";
import { PipelineContext } from "../../core/interfaces/PipelineContext";
import { ContextUtils } from "../../core/ContextUtils";
import { ValidationError } from "../interfaces/ValidationError";
import { Log } from "../../logger";

const LOG_CLS_SHORT = "SchemaValidator";

export class SchemaValidator extends BaseJsonValidator {
  constructor() {
    super();
  }

  /**
   * Validates a schema by its ID using the data available in the pipeline context.
   * @param schemaId - The ID of the schema to validate.
   * @param context - The pipeline context containing all loaded schemas.
   * @returns List of validation errors.
   */
  async validate(
    schemaId: string,
    context: PipelineContext
  ): Promise<ValidationError[]> {
    const validationErrors: ValidationError[] = [];

    // 🔍 Retrieve the schema from the context
    const schema = ContextUtils.getPhaseData<any>(
      context,
      "conversion",
      "schemas",
      schemaId
    );

    if (!schema) {
      const error = this.formatValidationError(
        schemaId,
        0,
        0,
        0,
        `Schema with ID '${schemaId}' not found in context.`,
        "error"
      );
      Log.error(LOG_CLS_SHORT, "VALIDATE", `❌ Schema not found for ID: ${schemaId}`);
      validationErrors.push(error);
      return validationErrors;
    }

    // ✅ Run base validations inherited from BaseJsonValidator
    validationErrors.push(...this.baseValidations(schema, context.configSet.schemaIdsToAbsPathMap.get(schemaId)!, context));

    if (validationErrors.length > 0) {
      Log.debug(
        LOG_CLS_SHORT,
        "VALIDATE",
        `❌ Schema validation failed for '${schemaId}': ${JSON.stringify(validationErrors)}`
      );
    } else {
      Log.debug(LOG_CLS_SHORT, "VALIDATE", `✅ Schema successfully validated: ${schemaId}`);
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
