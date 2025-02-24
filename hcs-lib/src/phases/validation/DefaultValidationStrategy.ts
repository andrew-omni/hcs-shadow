import { ValidationStrategy } from './ValidationStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { SchemaValidator } from '../../core/validators/SchemaValidator';
import { ModelValidator } from '../../core/validators/ModelValidator';
import { ValidationError } from '../../core/interfaces/ValidationError';
import { ContextUtils } from '../../core/ContextUtils';
import { FsAdapter } from '../../fs/fsAdapter';

const LOG_CLS_SHORT = 'Validation';

export class DefaultValidationStrategy implements ValidationStrategy {

  async execute(context: PipelineContext): Promise<void> {
    Log.info(LOG_CLS_SHORT, 'execute', `Executing validation strategy for model ID: ${context.modelId}`);

    const schemaValidator = new SchemaValidator();
    const modelValidator = new ModelValidator();

    // Validate only the schemas and models present in the context
    const schemaErrors = await this.validateSchemasInContext(context, schemaValidator);
    const modelErrors = await this.validateModelsInContext(context, modelValidator);

    // Add schema and model errors to the context
    schemaErrors.forEach((error) => context.errors.push(error));
    modelErrors.forEach((error) => context.errors.push(error));

    Log.info(LOG_CLS_SHORT, 'execute', `Validation completed for model ID: ${context.modelId}`);
  }

  /**
   * Validates schemas found directly in the context.
   */
  private async validateSchemasInContext(
    context: PipelineContext,
    validator: SchemaValidator
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const [key, value] of context.data.entries()) {
      const [phase, resourceType, resourceId] = key.split(':');

      if (phase === 'conversion' && resourceType === 'schemas') {
        try {
          const validationErrors = await validator.validate(resourceId, context);

          if (validationErrors.length > 0) {
            Log.warn(LOG_CLS_SHORT, 'validateSchemasInContext', `Schema validation errors in ${resourceId}`);
            errors.push(...validationErrors);
          } else {
            // Store errors separately for detailed access
            ContextUtils.setPhaseData(context, 'validation', 'schemas', resourceId, value.value);

          }
        } catch (error) {
          Log.error(LOG_CLS_SHORT, 'validateSchemasInContext', `Failed to validate schema ${resourceId}: ${error}`);
        }
      }
    }

    return errors;
  }

  /**
   * Validates models found directly in the context.
   */
  private async validateModelsInContext(
    context: PipelineContext,
    validator: ModelValidator
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    for (const [key, value] of context.data.entries()) {
      const [phase, resourceType, resourceId] = key.split(':');

      if (phase === 'conversion' && resourceType === 'models') {
        try {
          const validationErrors = await validator.validate(resourceId, context);

          if (validationErrors.length > 0) {
            Log.warn(LOG_CLS_SHORT, 'validateModelsInContext', `Model validation errors in ${resourceId}`);
            errors.push(...validationErrors);
          } else {
            ContextUtils.setPhaseData(context, 'validation', 'models', resourceId, value.value);
          }
        } catch (error) {
          Log.error(LOG_CLS_SHORT, 'validateModelsInContext', `Failed to validate model ${resourceId}: ${error}`);
        }
      }
    }

    return errors;
  }
}
