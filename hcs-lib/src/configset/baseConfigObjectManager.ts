import { FsAdapter } from "../fs/fsAdapter";
import { ConfigSet } from "./configsetManager";
import { ResourceManager } from "./resourceManager";

export abstract class BaseConfigObjectManager<T> {
    protected configSet: ConfigSet;
    protected objects: Map<string, T>;
    protected fs: FsAdapter;
    protected resourceManager: ResourceManager;

    constructor(configSet: ConfigSet, fs: FsAdapter, resourceManager: ResourceManager) {
        this.configSet = configSet;
        this.fs = fs;
        this.resourceManager = resourceManager;
        this.objects = new Map();
    }

    /**
     * Retrieve an object by its ID.
     */
    getById(id: string): T | undefined {
        return this.objects.get(id);
    }

    /**
     * Retrieve an object by a reference string.
     * Placeholder - references will be resolved differently for schemas/models/instances.
     */
    getByRef(ref: string): T | undefined {
        return this.objects.get(ref); // Simple stub, should implement proper lookup logic
    }

    getFsAdapter(): FsAdapter {
        return this.fs;
    }

    /**
     * Common JSON template used by all configuration objects.
     */
    protected getBaseTemplate(schemaRef: string): Record<string, any> {
        return {
            $id: "",
            $version: 1,
            $schema: schemaRef,
        };
    }

    /**
     * Writes a JSON configuration object to a file, ensuring proper formatting.
     */
    protected async writeJsonConfigObject(filePath: string, object: Record<string, any>): Promise<void> {
        try {
            const jsonString = JSON.stringify(object, null, 2); // Pretty print JSON
            await this.fs.writeFile(filePath, jsonString);
            console.log(`✅ Successfully created: ${filePath}`);
        } catch (error) {
            console.error(`❌ Error writing JSON to ${filePath}:`, error);
            throw error;
        }
    }

    /**
     * Subclasses must implement this to create objects.
     */
    abstract create(name: string): T;
}
