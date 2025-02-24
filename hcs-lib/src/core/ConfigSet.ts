import { FsAdapter } from '../fs/fsAdapter';
import { Log } from '../logger';

const LOG_CLS_SHORT = "CS";

const BASE_TEMPLATE = {
  $id: "",
  $version: 1
}

export class ConfigSet {
  name: string;
  absolutePath: string;
  schemaIdsToAbsPathMap: Map<string, string> = new Map();
  modelIdsToAbsPathMap: Map<string, string> = new Map();
  instanceIdsToAbsPathMap: Map<string, string> = new Map();

  constructor(public readonly path: string, private fs: FsAdapter) {
    this.absolutePath = path;
    this.name = path.split('/').pop() || '';
    Log.debug(LOG_CLS_SHORT, 'CON', `ConfigSet created at ${this.absolutePath}`);
  }

  /**
   * Factory method to load an existing ConfigSet from disk.
   */
  public static async loadConfigSet(path: string, fs: FsAdapter): Promise<ConfigSet> {
    const configSet = new ConfigSet(path, fs);
    if (await configSet.exists()) {
      await configSet.loadResources();
      return configSet;
    } else {
      throw new Error(`Failed to read directory ${path}`);
    }
  }

  /**
   * Loads resources (schemas, models, instances) from the config set directory.
   */
  private async loadResources(): Promise<void> {
    this.schemaIdsToAbsPathMap = await this.loadResourcesFromDir(`${this.absolutePath}/schemas`);
    this.modelIdsToAbsPathMap = await this.loadResourcesFromDir(`${this.absolutePath}/models`);
    this.instanceIdsToAbsPathMap = await this.loadResourcesFromDir(`${this.absolutePath}/instances`);
  }

  /**
   * Loads resources from a directory and maps file names (IDs) to their absolute paths.
   */
  private async loadResourcesFromDir(directory: string): Promise<Map<string, string>> {
    const resources = new Map<string, string>();
    try {

      const files = await this.fs.readDirectory(directory);
      Log.debug(LOG_CLS_SHORT, 'LRD', `Loaded ${files.length} resources from ${directory}`);
      for (const file of files) {
        const absolutePath = `${directory}/${file}`;

        // Expensive op to find correct IDs - don't rely on filesystem / filenames to make this mapping?
        if (!(await this.fs.isDirectory(absolutePath))) {
          // Is a file, read it in
          const fileContent = await this.fs.readFile(absolutePath);
          const idMatch = fileContent.match(/"\$id"\s*:\s*"([^"]+)"/);
          const id = idMatch ? idMatch[1] : file;

          Log.debug(LOG_CLS_SHORT, 'LRD', `Resolved: ${id} -> ${absolutePath} for ${JSON.stringify(fileContent)}`);
          resources.set(id, absolutePath);
        }
      }
      Log.debug(LOG_CLS_SHORT, 'LRD', `Loaded resources from ${directory}`);
    } catch (error) {
      Log.warn(LOG_CLS_SHORT, 'LRD', `Failed to read directory ${directory}: ${error}`);
    }
    return resources;
  }

  /**
   * Checks if the config set exists on the filesystem.
   */
  async exists(): Promise<boolean> {
    const exists = await this.fs.isExists(this.absolutePath);
    Log.verbose(LOG_CLS_SHORT, 'EX', `ConfigSet at ${this.absolutePath} exists: ${exists}`);
    return exists;
  }

  /**
   * ✅ Create a new schema file and register it.
   */
  async createSchema(name: string, content: {} = BASE_TEMPLATE): Promise<string> {
    return await this.createResourceFile("schemas", name, content, this.schemaIdsToAbsPathMap);
  }

  /**
   * ✅ Create a new model file and register it.
   */
  async createModel(name: string, content: {} = BASE_TEMPLATE): Promise<string> {
    return await this.createResourceFile("models", name, content, this.modelIdsToAbsPathMap);
  }

  /**
   * 🔍 Private method to handle file creation for schemas, models, and instances.
   */
  private async createResourceFile(
    folderName: string,
    name: string,
    baseTemplate: object,
    mapToUpdate: Map<string, string>
  ): Promise<string> {
    try {
      const outputPath = `${this.absolutePath}/${folderName}/${name}.json`;

      // Check if the file already exists
      const fileExists = await this.fs.isExists(outputPath);
      if (fileExists) {
        throw new Error(`File already exists: ${outputPath}`);
      }

      // Set the $id dynamically based on folder and name
      const id = `${this.name}.${folderName}.${name}`;
      const jsonObject = { ...baseTemplate, $id: id };

      // Write the JSON object to disk
      await this.writeJsonConfigObject(outputPath, jsonObject);

      // Update the internal map (schemas, models, instances)
      mapToUpdate.set(id, outputPath);

      Log.info(LOG_CLS_SHORT, "CR", `✅ Created ${folderName.slice(0, -1)}: ${id}`);
      return id;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      Log.error(LOG_CLS_SHORT, "CR", `❌ Error creating ${folderName.slice(0, -1)} "${name}": ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Writes a JSON configuration object to a file, ensuring proper formatting.
   */
  protected async writeJsonConfigObject(filePath: string, object: Record<string, any>): Promise<void> {
    try {
      const jsonString = JSON.stringify(object, null, 2); // Pretty print JSON
      await this.fs.writeFile(filePath, jsonString);
      Log.verbose(LOG_CLS_SHORT, "WJO", `✅ Successfully created: ${filePath}`);
    } catch (error) {
      throw error;
    }
  }

  getAbsFilePathById(id: string): string {

    const resourceType = id.split('.')[1];

    if (resourceType === 'schemas') {
      return this.schemaIdsToAbsPathMap.get(id) || '';
    } else if (resourceType === 'models') {
      return this.modelIdsToAbsPathMap.get(id) || '';
    }
    return this.instanceIdsToAbsPathMap.get(id) || '';
  }

  buildAbsFilePathById(id: string): string {
    const pathParts = id.split('.');
    if (pathParts.length === 3) {
      return `${this.absolutePath}/${id.split('.')[1]}/${id.split('.')[2]}.json`;
    } else if (pathParts.length === 4) {
      return `${this.absolutePath}/${id.split('.')[1]}/${id.split('.')[2]}/${id.split('.')[2]}_${id.split('.')[3]}.json`;
    } else {
      return '';
    }
  }

  /**
   * Gets all schema IDs.
   */
  getSchemaIds(): string[] {
    return Array.from(this.schemaIdsToAbsPathMap.keys());
  }

  /**
   * Gets all model IDs.
   */
  getModelIds(): string[] {
    return Array.from(this.modelIdsToAbsPathMap.keys());
  }

  /**
   * Gets all instance IDs.
   */
  getInstanceIds(): string[] {
    return Array.from(this.instanceIdsToAbsPathMap.keys());
  }
}
