import { BaseConfigObjectManager } from "./baseConfigObjectManager";

export class InstanceManager extends BaseConfigObjectManager<object> {

    private FOLDER_NAME = "instances";

    async create(name: string): Promise<void> {
        // Generate base JSON object
        const jsonObject = this.getBaseTemplate("https://json-schema.org/draft/2020-12/schema");
        
        // Set the $id
        const outputPath = `${this.configSet.path}/${this.FOLDER_NAME}/${name}.json`;
        jsonObject["$id"] = `${this.configSet.getName()}.${this.FOLDER_NAME}.${name}`;

        await this.writeJsonConfigObject(outputPath, jsonObject);
    }
}
