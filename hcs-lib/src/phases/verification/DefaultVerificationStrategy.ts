import { VerificationStrategy } from './VerificationStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { ContextUtils } from '../../core/ContextUtils';
import { ValidationError } from '../../core/interfaces/ValidationError';
import { findFieldPositionInFile } from "../../utils/findElementInJSON"
import Ajv, { ErrorObject, ValidateFunction } from "ajv";

const LOG_CLS_SHORT = 'Verification';

/**
 * Fires after build - verifies models and instances against their ref'd schemas.
 * Verified instances have their schema refs removed.
 */
export class DefaultVerificationStrategy implements VerificationStrategy {

  async execute(context: PipelineContext): Promise<void> {
    Log.verbose(
      LOG_CLS_SHORT,
      'Verification',
      `🚀 Starting verification strategy for model ID: ${context.modelId}`
    );

    // Iterate through all models in the 'build' phase
    const models = this.getBuiltModels(context);

    if (models.size === 0) {
      Log.warn(LOG_CLS_SHORT, 'Verification', '⚠️ No built models found in context.');
      return;
    }

    for (const [modelId, modelData] of models.entries()) {
      this.logModel(modelId, modelData);
      await this.verifyModel(modelId, context);
    }

    if (context.errors.length === 0) {
      Log.info(
        LOG_CLS_SHORT,
        'Verification',
        `✅ Verification completed with 0 errors for model ID: ${context.modelId}`
      );
    } else {
      Log.warn(
        LOG_CLS_SHORT,
        'Verification',
        `⚠️ Verification failed with ${context.errors.length} errors for model ID: ${context.modelId}`
      );
    }
  }

  private async verifyModel(modelId: string, context: PipelineContext): Promise<void> {
    // Retrieve the model data from the context
    const modelData = ContextUtils.getPhaseData(context, 'build', 'models', modelId);
    const instanceId = modelId.replace('.models.', '.instances.');
    const instanceData = ContextUtils.getPhaseData(context, 'build', 'instances', instanceId);

    // Extract all $ref and $refs from the model
    const refs = this.extractRefs(modelData);

    // For each ref in refs, get the schema from the context.
    const schemas = []
    for (const ref of refs) {
      if (ref.split('.')[1] === 'schemas') {
        const schema = ContextUtils.getPhaseData(context, 'build', 'schemas', ref);

        // If the schema is not found, log a warning
        if (!schema) {
          Log.warn(
            LOG_CLS_SHORT,
            'Verification',
            `⚠️ Schema not found for $ref: ${ref} in model: ${modelId}`
          );
        }

        schemas.push(schema);
      }
    }

    // We validate the instance against schemas attached to the model.
    this.validateResource(modelData, schemas, context);
    this.validateResource(instanceData, schemas, context);
    return;
  }

  /**
 * Extracts all `$ref` and `$refs` from a model object.
 */
  private extractRefs(modelData: any): string[] {
    const refs: Set<string> = new Set();

    const traverse = (obj: any) => {
      if (typeof obj !== "object" || obj === null) return;

      if (obj.$ref) {
        refs.add(obj.$ref);
      }

      if (Array.isArray(obj.$refs)) {
        for (const ref of obj.$refs) {
          refs.add(ref);
        }
      }

      // Recursively traverse nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && typeof obj[key] === "object") {
          traverse(obj[key]);
        }
      }
    };

    traverse(modelData);
    return Array.from(refs);
  }


  /**
   * Validates a model against multiple schemas.
   * @param resourceData The resource object to validate.
   * @param schemas The list of schemas to validate against.
   * @returns Array of validation errors, or an empty array if valid.
   */
  private validateResource(resourceData: any, schemas: any[], context: PipelineContext): void {
    const ajv = new Ajv({ strict: false, allErrors: true });
    context.errors = context.errors || []; // Ensure errors array exists
    const resourceId = resourceData.$id;
    Log.verbose(LOG_CLS_SHORT, "validateResource", `🔍 Validating resource '${resourceId}' against schemas [ ${schemas.map(schema => schema.$id).join(', ')} ]`);
    for (const schema of schemas) {
      if (!schema || !schema.$id) {
        Log.error(LOG_CLS_SHORT, "validateResource", "❌ Schema must have a valid $id.");
        continue;
      }

      // Register schema dynamically if not already added
      if (!ajv.getSchema(schema.$id)) {
        ajv.addSchema(schema, schema.$id);
      }

      const validate: ValidateFunction | undefined = ajv.getSchema(schema.$id);
      if (!validate) {
        Log.error(LOG_CLS_SHORT, "validateResource", `❌ Failed to compile schema: ${schema.$id}`);
        continue;
      }

      // Run validation
      const isValid = validate(resourceData);
      if (!isValid) {
        Log.warn(
          LOG_CLS_SHORT,
          "validateResource",
          `⚠️ '${resourceId}' failed validation against schema '${schema.$id}'`
        );

        for (const error of validate.errors || []) {
          const formattedError = this.formatValidationError(context, error, resourceId, schema.$id, resourceData);
          
          Log.info(LOG_CLS_SHORT, "validateResource", `🔍 Validated Resource: ${resourceId} - ${JSON.stringify(formattedError)} - ${JSON.stringify(resourceData)}`);
          context.errors.push(formattedError);
        }
      }
    }
  }



  /**
   * Formats AJV validation errors into a standardized structure.
   */
  private formatValidationError(
    context: PipelineContext,
    error: ErrorObject,
    resourceId: string,
    schemaId: string,
    modelJson: any
  ): ValidationError {
    // 🔍 Extract the field name from AJV's instancePath
    const fieldPath = error.instancePath ? error.instancePath.slice(1).split("/") : [];
    const fieldName = fieldPath[fieldPath.length - 1] || "unknown";
    const absPath = context.hcsManager.getConfigSetManager().buildAbsFilePathById(resourceId);
    // 🔍 Use findFieldPositionInFile to get the field position
    const position = findFieldPositionInFile(modelJson, fieldName, false);

    let errMsg = "";
    if (fieldName === "unknown") {
      if (error.message?.includes("must have required property")) {
        const unknownField = error.message?.substring(error.message.indexOf("must have required property") + "must have required property".length).trim();
        // Required field is missing
        errMsg = `Validation failed against schema '${schemaId}': Missing required field ${unknownField}`;
      } else {
        errMsg = `Validation failed against schema '${schemaId}' for field '${fieldName}': ${error.message || "Unknown validation error"}`;
      }
    } else {
      errMsg = `Validation failed against schema '${schemaId}' for field '${fieldName}': ${error.message || "Unknown validation error"}`;
    }

    // 📋 Construct a detailed error message
    return {
      filePath: absPath,
      line: position.line, // Line numbers should be 1-based
      column: position.startChar,
      endColumn: position.endChar,
      message: errMsg,
      severity: "error",
    };
  }
  /**
   * Retrieves all built models from the context.
   */
  private getBuiltModels(context: PipelineContext): Map<string, any> {
    const models = new Map<string, any>();

    for (const [key, value] of context.data.entries()) {
      const [phase, type, resourceId] = key.split(':');

      // Filter only built models
      if (phase === 'build' && type === 'models') {
        models.set(resourceId, value.value);
      }
    }

    return models;
  }

  /**
   * Logs model data in a structured way.
   */
  private logModel(modelId: string, modelData: any): void {

    Log.silly(LOG_CLS_SHORT, 'ModelLog', `📝 Model Data: ${JSON.stringify(modelData, null, 2)}`);
  }
}
