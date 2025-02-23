import { ResourceManager } from "../configset/resourceManager";
import Ajv2020, { AnySchemaObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { BaseJsonBuilder } from "./baseJsonBuilder";
import * as path from "path";

export class InstanceBuilder extends BaseJsonBuilder {
  private ajv: Ajv2020;

  constructor(resourceManager: ResourceManager) {
    super(resourceManager);
    this.ajv = new Ajv2020({
      strict: false,
      allErrors: true
    });

    addFormats(this.ajv);
  }

  /**
   * Builds an instance and returns the updated file path and JSON object.
   *
   * @param jsonObject - The instance to build
   * @param fullFilePath - The original file path pointing to 'models'
   * @returns An object with the updated path and built JSON object
   */
  async build(jsonObject: any, fullFilePath: string): Promise<{ path: string; builtJsonObj: any }> {
    console.log(`🚀 Building instance for file: ${fullFilePath}`);

    // Safely transform the path from 'models' to 'instances'
    const parsedPath = path.parse(fullFilePath);
    const pathSegments = parsedPath.dir.split(path.sep);

    // Replace only the last occurrence of 'models' with 'instances'
    const modelsIndex = pathSegments.lastIndexOf('models');
    if (modelsIndex === -1) {
      console.warn(`⚠️ The file path does not contain a 'models' directory: ${fullFilePath}`);
      return {
        path: fullFilePath, // Return original path if no models folder is found
        builtJsonObj: jsonObject
      };
    }

    // Replace the directory segment
    pathSegments[modelsIndex] = 'instances';
    const newDir = path.join(...pathSegments);
    const newFilePath = path.join(newDir, parsedPath.base);

    // Validation step (optional)
    const validate = this.ajv.compile(jsonObject as AnySchemaObject);
    const valid = validate(jsonObject);

    if (!valid) {
      console.warn(`⚠️ Validation failed for instance: ${newFilePath}`, validate.errors);
    }

    // Return the updated path and built JSON object
    return {
      path: newFilePath,
      builtJsonObj: jsonObject
    };
  }
}
