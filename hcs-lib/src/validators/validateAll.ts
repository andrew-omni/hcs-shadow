import { SchemaValidator } from "./schemaValidator";
import { ModelValidator } from "./modelValidator";
import { InstanceValidator } from "./instanceValidator";
import { ResourceManager } from "../configset/resourceManager";
import { ConfigSetManager } from "../configset/configsetManager";
import { BaseJsonValidator, ValidationError } from "./baseJsonValidator";

/**
 * The return type for validateAll - structured for easy UI integration.
 */
export interface ValidationResult {
    success: boolean;
    errors: {
        [filePath: string]: ValidationError[];
    };
}

/**
 * Validates all schemas, models, and instances in the given ConfigSet.
 *
 * @param hcsManager - The ConfigSetManager to validate.
 * @returns A ValidationResult containing structured validation results.
 */
export async function validateAll(hcsManager: ConfigSetManager): Promise<ValidationResult> {
    console.log(`🔍 Running full validation for ConfigSet at: ${hcsManager.getConfigSet().path}`);

    const resourceManager = hcsManager.getResourceManager();
    const validationResults = await validateResources(resourceManager);

    // If any file has errors, set success to false
    validationResults.success = Object.keys(validationResults.errors).length === 0;

    if (validationResults.success) {
        console.log(`✅ All schemas, models, and instances are valid!`);
    }

    console.log(`Validation complete. Success: ${validationResults.success}`);
    return validationResults;
}

async function validateResources(
    resourceManager: ResourceManager
): Promise<any> {
    const resources = resourceManager.getResources();

    const validationResults: { errors: Record<string, ValidationError[]> } = { errors: {} };

    // Helper function to process each category
    const processCategory = (category: Record<string, any>, validator: BaseJsonValidator) => {
        return Object.entries(category).map(([filePath, resource]) =>
            new Promise<void>((resolve) => {
                const fullFilePath = resourceManager.buildStripRelPathAndBuildFullPath(filePath);
                const errors = validator.validate(resource, fullFilePath);
                if (errors.length > 0) {
                    validationResults.errors[fullFilePath] = errors;
                }
                resolve();
            })
        );
    };

    // Run validation for each category in parallel
    await Promise.allSettled([
        ...processCategory(resources.schemas, new SchemaValidator(resourceManager)),
        ...processCategory(resources.models, new ModelValidator(resourceManager)),
        ...processCategory(resources.instances, new InstanceValidator(resourceManager)),
    ]);

    return validationResults;
}
