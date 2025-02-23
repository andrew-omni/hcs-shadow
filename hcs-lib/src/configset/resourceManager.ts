import { FsAdapter } from "../fs/fsAdapter";
import { ConfigSet } from "./configsetManager";

export class ResourceManager {
    private configSet: ConfigSet;
    private fs: FsAdapter;
    private resourcesById: Map<string, any>;
    private resourcesByRef: Map<string, any>;

    constructor(configSet: ConfigSet, fs: FsAdapter) {
        this.configSet = configSet;
        this.fs = fs;
        this.resourcesById = new Map();
        this.resourcesByRef = new Map();
    }

    buildFullPathFromRelativePath(pathFragment: string): string {
        return this.fs.buildFullPathFromRelativePath(this.configSet.path, pathFragment);
    }

    buildStripRelPathAndBuildFullPath(relativeFilePath: string): string {
        return this.fs.buildStripRelPathAndBuildFullPath(this.configSet.path, relativeFilePath);
    }

    /**
     * Loads all JSON configuration files from the config set into memory.
     */
    async loadAll(): Promise<void> {
        console.log(`🔍 Loading all resources for config set at: ${this.configSet.path}`);

        this.resourcesById.clear();
        this.resourcesByRef.clear();

        const directories = ["models", "schemas", "instances"];
        for (const dir of directories) {
            const dirPath = `${this.configSet.path}/${dir}`;
            if (await this.fs.fileExists(dirPath)) {
                await this.loadResourcesFromDirectory(dirPath, dir);
            }
        }

        console.log(`✅ Loaded ${this.resourcesByRef.size} resources.`);
    }

    /**
     * Loads JSON files from a directory, storing them by `$id` and `$ref`.
     */
    private async loadResourcesFromDirectory(directory: string, category: string): Promise<void> {
        try {
            const files = await this.fs.readDirectory(directory);

            for (const file of files) {
                if (!file.endsWith(".json")) continue; // Skip non-JSON files

                const filePath = `${directory}/${file}`;
                const content = await this.fs.readFile(filePath);
                const parsedContent = JSON.parse(content);

                if (parsedContent.$id) {
                    if (parsedContent.$id.endsWith(".json") || parsedContent.$id == "") {
                        console.warn(`⚠️ Invalid $id for resource in ${filePath}: ${parsedContent.$id}`);
                    }
                    this.resourcesById.set(parsedContent.$id, parsedContent);
                }

                // Compute relative $ref for lookup
                const relativeRef = `../${category}/${file}`;
                this.resourcesByRef.set(relativeRef, parsedContent);
            }
        } catch (error) {
            console.warn(`⚠️ Failed to load resources from ${directory}:`, error);
        }
    }

    /**
     * Retrieves a resource by its `$id` value.
     */
    getResourceById(id: string): any | null {
        return this.resourcesById.get(id) || null;
    }

    /**
     * Retrieves a resource by its `$ref` value (relative path).
     */
    getResourceByRef(ref: string): any | null {
        return this.resourcesByRef.get(ref) || null;
    }

    /**
     * Retrieves all loaded resources categorized by type.
     * @returns { object } An object containing `schemas`, `models`, and `instances`.
     */
    getResources(): { schemas: Record<string, any>; models: Record<string, any>; instances: Record<string, any> } {
        const schemas: Record<string, any> = {};
        const models: Record<string, any> = {};
        const instances: Record<string, any> = {};

        // Categorize resources by their relative $ref paths
        for (const [ref, resource] of this.resourcesByRef.entries()) {
            if (ref.startsWith("../schemas/")) {
                schemas[ref] = resource;
            } else if (ref.startsWith("../models/")) {
                models[ref] = resource;
            } else if (ref.startsWith("../instances/")) {
                instances[ref] = resource;
            }
        }

        return { schemas, models, instances };
    }
}
