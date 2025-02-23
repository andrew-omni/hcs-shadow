import { ResourceManager } from "../configset/resourceManager";

export abstract class BaseJsonBuilder {
  resourceManager: ResourceManager;

  constructor(resourceManager: ResourceManager) {
    this.resourceManager = resourceManager;
  }

  /* Builds the supplied jsonObject (found at filePath) and returns the newly built object 
   * NB Does not intelligently handle versioning - this is the responsibility of the caller
  */
  abstract build(jsonObject: any, relFilePath: string): Promise<{ path: string, builtJsonObj: any }>;
}
