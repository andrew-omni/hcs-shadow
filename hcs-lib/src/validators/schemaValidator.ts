import { BaseJsonValidator, ValidationError } from "./baseJsonValidator";
import { ResourceManager } from "../configset/resourceManager";
import Ajv2020, { AnySchemaObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";

export class SchemaValidator extends BaseJsonValidator {
  private ajv: Ajv2020;

  constructor(resourceManager: ResourceManager) {
    super(resourceManager);
    this.ajv = new Ajv2020({
      strict: false,
      loadSchema: async (ref: string) => this.resolveSchemaReference(ref),
      allErrors: true
    });

    addFormats(this.ajv);
  }

  /**
   * Resolves a `$ref` by fetching the corresponding schema from `ResourceManager`.
   */
  private async resolveSchemaReference(ref: string): Promise<AnySchemaObject> {
    console.log(`🔍 Resolving schema reference: ${ref}`);

    const resolvedSchema = this.resourceManager.getResourceById(ref) || this.resourceManager.getResourceByRef(ref);
    if (resolvedSchema) {
      console.log(`✅ Successfully resolved: ${ref}`);
      return resolvedSchema;
    }

    console.warn(`⚠️ Schema reference '${ref}' not found.`);
    return {}; // Return an empty object instead of throwing
  }


  baseValidations(schemaJson: any, fullFilePath: string): ValidationError[] {
    // Safe type assertion after checking
    const schema = schemaJson as Record<string, unknown>;
    const validationErrors: ValidationError[] = [];


    // 🔍 Check for $id field
    if (typeof schema.$id !== 'string') {
      validationErrors.push(
        this.formatValidationError(
          fullFilePath,
          0, // Assuming top-level validation
          0, 0,
          `Schema ID validation error: Missing or invalid '$id'. It must be a non-empty string.`,
          "error"
        )
      );
    } else if (schema.$id.split('.').length < 3) {
      const { line, startChar, endChar } = this.findFieldPositionInFile(schemaJson, '$id');
      console.log("ID ERR: line / startChar / endChar: ", line, startChar, endChar);
      validationErrors.push(
        this.formatValidationError(
          fullFilePath,
          line,
          startChar, endChar,
          `Schema ID validation error: $id should be 'configset.type.name', but found '${schema.$id}'.`,
          "error",
        )
      );
    }

    // 🔍 Check for $version field
    if (typeof schema.$version !== 'number') {
      validationErrors.push(
        this.formatValidationError(
          fullFilePath,
          0,
          0, 0,
          `Schema version validation error: Missing or invalid '$version'. It must be a valid number.`,
          "error"
        )
      );
    }

    return validationErrors;
  }

  /**
   * Validates a schema against JSON Schema Draft 2020-12.
   * 
   * @param schemaJson - The schema object to validate.
   * @param resourceManager - The ResourceManager instance for resolving references.
   * @param fullFilePath - The file path for error reporting.
   * @returns List of validation errors (empty if valid).
   */
  validate(schemaJson: any, fullFilePath: string): ValidationError[] {
    const validationErrors: ValidationError[] = [];

    if (schemaJson === undefined || schemaJson === null || Object.keys(schemaJson).length === 0) {
      console.log(`❌ Validation failed due to missing schema: ${fullFilePath}`);
      throw new Error(`Invalid schema: ${fullFilePath}. Expected a non-empty object.`);
    }

    if (fullFilePath.includes('./')) {
      console.log(`❌ Validation failed due to coding error: requires fullFilePath but received relativePath: ${fullFilePath}`);
      throw new Error(`Invalid file path: ${fullFilePath}. Expected an absolute path without './'.`);
    }

    try {
      // Compile the schema without triggering validation recursion
      const validateSchemaFn = this.ajv.compile(schemaJson);

      // Validate the schema itself
      if (!validateSchemaFn(schemaJson)) {
        for (const ajvError of validateSchemaFn.errors || []) {
          validationErrors.push(
            this.formatValidationError(
              fullFilePath,
              this.extractLineNumber(ajvError.instancePath),
              0, 0,
              `Schema validation error: ${ajvError.message}`,
              "error"
            )
          );
        }
      } else {
        validationErrors.push(...this.baseValidations(schemaJson, fullFilePath));
      }
    } catch (error) {
      console.log(`⚠️ ${fullFilePath}: ${error}`);
      validationErrors.push(
        this.formatValidationError(fullFilePath, 0, 0, 0, `Validation engine error: ${error}`, "error")
      );
    }

    if (validationErrors.length > 0) {
      console.log(`⚠️ ${fullFilePath}: ${JSON.stringify(validationErrors, null, 2)}`);
    }
    return validationErrors;
  }
}