import { ResourceManager } from "../configset/resourceManager";
import Ajv2020, { AnySchemaObject } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { BaseJsonBuilder } from "./baseJsonBuilder";

export class ModelBuilder extends BaseJsonBuilder {
  private ajv: Ajv2020;

  constructor(resourceManager: ResourceManager) {
    super(resourceManager);
    this.ajv = new Ajv2020({
      strict: false,
      allErrors: true
    });

    addFormats(this.ajv);
  }

  async build(jsonObject: any, fullFilePath: string): Promise<{ path: string; builtJsonObj: any }> {

    // if (fullFilePath.includes('./')) {
    //   console.log(`❌ Validation failed due to coding error: requires fullFilePath but received relativePath: ${fullFilePath}`);
    //   throw new Error(`Invalid file path: ${fullFilePath}. Expected an absolute path without './'.`);
    // }
    console.log("Building model " + fullFilePath);
    return {
      path: fullFilePath,
      builtJsonObj: jsonObject
    };
  }
}
