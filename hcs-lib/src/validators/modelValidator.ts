import { BaseJsonValidator, ValidationError } from "./baseJsonValidator";
import { ResourceManager } from "../configset/resourceManager";
import Ajv2020, { AnySchemaObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";

export class ModelValidator extends BaseJsonValidator {
  private ajv: Ajv2020;

  constructor(resourceManager: ResourceManager) {
    super(resourceManager);
    this.ajv = new Ajv2020({
      strict: false,
      allErrors: true
    });

    addFormats(this.ajv);
  }

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
        console.log(`✅ Model successfully validated: ${fullFilePath}`);
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
