import { BaseConfigObjectManager } from "./baseConfigObjectManager";

export class ModelManager extends BaseConfigObjectManager<object> {
    private FOLDER_NAME = "models";

    async create(name: string): Promise<void> {
        const outputPath = `${this.configSet.path}/${this.FOLDER_NAME}/${name}.json`;

        // Check if the file already exists
        const fileExists = await this.fs.fileExists(outputPath);
        if (fileExists) {
            console.log(`❌ File already exists: ${outputPath}`);
            return;
        }

        // Generate base JSON object
        const jsonObject = this.getBaseTemplate("https://json-schema.org/draft/2020-12/schema");

        // Set the $id
        jsonObject["$id"] = `${this.configSet.getName()}.${this.FOLDER_NAME}.${name}`;

        await this.writeJsonConfigObject(outputPath, jsonObject);
    }
}
