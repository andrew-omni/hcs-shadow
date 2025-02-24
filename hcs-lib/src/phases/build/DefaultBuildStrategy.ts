import { BuildStrategy } from './BuildStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { ContextUtils } from '../../core/ContextUtils';
import { MergeWithRefs } from './MergeWithRefs';
import { CircularRefError, UnresolvedRefError } from '../../core/errors';
import { findFieldPositionInFile } from '../../utils/findElementInJSON';

const LOG_CLS_SHORT = 'Build';

export class DefaultBuildStrategy implements BuildStrategy {
  private mergeWithRefs: MergeWithRefs;

  constructor() {
    this.mergeWithRefs = new MergeWithRefs();
  }

  async execute(context: PipelineContext): Promise<void> {
    Log.info(LOG_CLS_SHORT, 'Build', `Executing default build strategy for model ID: ${context.modelId}`);

    // 🔍 Build schemas first
    await this.buildSchemas(context);

    // 🔍 Build models afterward
    await this.buildModels(context);

    Log.info(LOG_CLS_SHORT, 'Build', `✅ Build phase completed for model ID: ${context.modelId}`);
  }

  /**
   * Handles building schemas from validation context.
   */
  private async buildSchemas(context: PipelineContext): Promise<void> {
    const validationSchemas = this.getEntitiesFromContext(context, 'schemas');

    for (const [schemaId, schema] of validationSchemas.entries()) {
      try {
        const mergedSchema = this.mergeWithRefs.merge(schema, validationSchemas, true);
        // A successful return from mergeWithRefs means we've successfully resolved all references - 
        // we store both the original and the resolved model in the context to indicate we've passed
        // build.

        ContextUtils.setPhaseData(context, 'build', 'schemas', schemaId, JSON.parse(JSON.stringify(mergedSchema)));;
        Log.debug(LOG_CLS_SHORT, 'BuildSchemas', `✅ Successfully built schema: ${schemaId}: ${JSON.stringify(mergedSchema)}`);
        Log.verbose(LOG_CLS_SHORT, 'BuildSchemas', `✅ Successfully built schema: ${schemaId}`);

      } catch (error) {
        this.handleMergeRefError(context, schemaId, schema, error as Error);
      }
    }
  }

  /**
   * Handles building models from validation context.
   */
  private async buildModels(context: PipelineContext): Promise<void> {
    const validationModels = this.getEntitiesFromContext(context, 'models');
    const validationSchemas = this.getEntitiesFromContext(context, 'schemas');
    const availableEntities = new Map([...validationModels, ...validationSchemas]);

    let mainContextModel = {};
    for (const [modelId, model] of validationModels.entries()) {
      // Don't build ourself until last
      if (modelId === context.modelId) {
        mainContextModel = model;
        continue;
      }

      Log.debug(LOG_CLS_SHORT, 'BuildModels', `Building sub-model ${modelId}`);
      await this.execBuildModels(context, modelId, model, availableEntities);
    }

    // Build the main context model last
    Log.debug(LOG_CLS_SHORT, 'BuildModels', `Building main model ${context.modelId}`);
    await this.execBuildModels(context, context.modelId, mainContextModel, availableEntities);
  }

  private async execBuildModels(context: PipelineContext, modelId: string, model: any, availableEntities: any): Promise<void> {
    try {
      const originalModel = JSON.parse(JSON.stringify(model));

      // A successful return from mergeWithRefs means we've successfully resolved all references - 
      let resolvedInstance = JSON.parse(JSON.stringify(this.mergeWithRefs.merge(model, availableEntities, false)));

      // We store the original (which will be written out to models/)...
      ContextUtils.setPhaseData(context, 'build', 'models', modelId, originalModel);

      // And we store the resolved model as an instance
      const instanceId = modelId.replace('.models.', '.instances.');
      resolvedInstance.$id = instanceId;
      resolvedInstance = this.removeRefs(resolvedInstance);
      ContextUtils.setPhaseData(context, 'build', 'instances', instanceId, resolvedInstance);
      Log.debug(LOG_CLS_SHORT, 'BuildModels', `✅ Successfully built model ${modelId}: ${JSON.stringify(originalModel)}`);
      Log.debug(LOG_CLS_SHORT, 'BuildModels', `✅ Successfully built instance ${instanceId}: ${JSON.stringify(resolvedInstance)}`);
      Log.verbose(LOG_CLS_SHORT, 'BuildModels', `✅ Successfully built model ${modelId} and instance ${instanceId}`);
    } catch (error) {
      this.handleMergeRefError(context, modelId, model, error as Error);
    }
  }

  /**
   * Extracts entities (schemas/models) from context based on resource type.
   */
  private getEntitiesFromContext(
    context: PipelineContext,
    resourceType: 'schemas' | 'models'
  ): Map<string, any> {
    const entities = new Map<string, any>();

    for (const [key, value] of context.data.entries()) {
      const [phase, type, resourceId] = key.split(':');

      if (phase === 'validation' && type === resourceType) {
        entities.set(resourceId, value.value);
      }
    }

    return entities;
  }

  /**
   * Handles errors when merging references.
   */
  private handleMergeRefError(
    context: PipelineContext,
    entityId: string,
    jsonContent: any,
    error: Error
  ): void {
    let errorMessage = error instanceof CircularRefError ? "Circular reference" : "Unresolved reference";
    Log.warn(LOG_CLS_SHORT, 'ResolveReferences', `${errorMessage} detected: ${error.message}`);

    const absPath = context.hcsManager.getConfigSetManager().buildAbsFilePathById(entityId);
    let position = { line: 0, startChar: 0, endChar: 0 }

    if (error instanceof UnresolvedRefError) {
      // Find the field position in the model JSON
      console.log(error.message);
      const fieldName = error.message;

      const modelJson: any = JSON.stringify(jsonContent);
      position = findFieldPositionInFile(modelJson, fieldName, true);
      console.log(position);
      errorMessage += `: ${fieldName}`;
    }

    context.errors.push({
      filePath: absPath,
      line: position.line + 1, // Line numbers should be 1-based
      column: position.startChar,
      endColumn: position.endChar,
      message: "[BUILD] " + errorMessage,
      severity: "error",
    });
  }

  /**
 * Removes `$ref` and `$refs` properties from a model object.
 */
  private removeRefs(resourceData: any): any {
    const deepClone = (obj: any): any => JSON.parse(JSON.stringify(obj));

    const clean = (obj: any) => {
      if (typeof obj !== "object" || obj === null) return obj;

      // Remove single $ref
      if (obj.hasOwnProperty("$ref")) {
        delete obj.$ref;
      }

      // Remove multiple $refs
      if (obj.hasOwnProperty("$refs")) {
        delete obj.$refs;
      }

      // Recursively clean nested objects
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          obj[key] = clean(obj[key]);
        }
      }

      return obj;
    };

    return clean(deepClone(resourceData));
  }
}
