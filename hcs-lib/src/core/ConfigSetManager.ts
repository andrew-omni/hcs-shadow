import { ConfigSet } from './ConfigSet';
import { Log } from '../logger';
import { FsAdapter } from '../fs/fsAdapter';

const LOG_CLS_SHORT = "CSM";

export class ConfigSetManager {
  private configSets: ConfigSet[] = [];

  constructor(private fsAdapter: FsAdapter) { }

  /**
   * Discover available config sets across multiple paths.
   * Resets cached config sets.
   */
  async discoverConfigSets(paths: string[]): Promise<ConfigSet[]> {
    this.clear();

    Log.verbose(LOG_CLS_SHORT, 'DCS', `Searching for config sets in: ${paths.join(", ")}`);
    let discoveredRoots: string[] = [];

    for (const basePath of paths) {
      const roots = await this.findConfigRootsRecursive(basePath);
      discoveredRoots.push(...roots);
    }

    const configRoots = [...new Set(discoveredRoots)]; // Remove duplicates
    const discoveredSets = await Promise.all(
      configRoots.map((path) => ConfigSet.loadConfigSet(path, this.fsAdapter))
    );

    this.configSets = discoveredSets;
    Log.verbose(LOG_CLS_SHORT, 'DCS', `Discovered ${discoveredSets.length} config sets: ${discoveredSets.map((set) => set.name).join(", ")}`);
    return discoveredSets;
  }

  /**
   * Get cached config sets.
   */
  getConfigSets(): ConfigSet[] {
    Log.debug(LOG_CLS_SHORT, 'GCS', 'Retrieving cached config sets.');
    return this.configSets;
  }

  /**
   * Manually set or override a config set.
   */
  setConfigSet(configSet: ConfigSet): void {
    const index = this.configSets.findIndex((set) => set.name === configSet.name);
    if (index !== -1) {
      this.configSets[index] = configSet;
      Log.info(LOG_CLS_SHORT, 'SCS', `Overwrote config set: ${configSet.name}`);
    } else {
      this.configSets.push(configSet);
      Log.info(LOG_CLS_SHORT, 'SCS', `Added new config set: ${configSet.name}`);
    }
  }

  /**
   * Clears cached config sets.
   */
  clear(): void {
    this.configSets = [];
    Log.debug(LOG_CLS_SHORT, 'CLR', 'Cleared all cached config sets.');
  }

  /**
   * Creates a new config set at the specified path.
   */
  async createConfigSet(path: string, fs: FsAdapter): Promise<ConfigSet> {
    Log.debug(LOG_CLS_SHORT, "CCS", `Creating config set at ${path}`);
    const REQUIRED_SUBDIRS = ["models", "schemas", "instances"];

    try {
      await fs.createDirectory(path);

      for (const subdir of REQUIRED_SUBDIRS) {
        await fs.createDirectory(`${path}/${subdir}`);
      }

      // Add the new config set to the list of known sets
      const configSet = await ConfigSet.loadConfigSet(path, fs);
      Log.info(LOG_CLS_SHORT, "CCS", `✅ Created config set: ${path}`);

      this.setConfigSet(configSet);
      return configSet;

    } catch (error) {
      Log.error(LOG_CLS_SHORT, "CCS", `❌ Failed to create config set at ${path}: ${error}`);
      throw error;
    }
  }

  /**
 * Retrieves a ConfigSet by a given resource ID.
 * @param resourceId - The resource ID in the format CONFIG_SET.FOLDER.NAME.
 * @returns The corresponding ConfigSet if found, otherwise null.
 */
  getConfigSetByResourceId(resourceId: string): ConfigSet | null {
    // Split the ID using '.' to extract the config set name
    const parts = resourceId.split('.');
    const configSetName = parts[0];

    // Find the ConfigSet matching the extracted name
    const configSet = this.configSets.find(
      (set) => set.name === configSetName
    );

    if (configSet) {
      Log.debug(LOG_CLS_SHORT, 'GCSRI', `Found ConfigSet for resource ID: ${resourceId}`);
      return configSet;
    } else {
      Log.warn(LOG_CLS_SHORT, 'GCSRI', `No ConfigSet found for resource ID: ${resourceId}`);
      return null;
    }
  }

  resolveAbsPathFromId(idRef: string): string {
    const configSetName = idRef.split('.')[0];
    const configSet = this.getConfigSetByName(configSetName);

    if (!configSet) {
      Log.warn(LOG_CLS_SHORT, 'RAPFI', `No ConfigSet found for ID reference: ${idRef}`);
      return '';
    }

    const absPath =  configSet.getAbsFilePathById(idRef);
    if (absPath) {
      Log.debug(LOG_CLS_SHORT, 'RAPFI', `Resolved abs path for ID reference: ${idRef} -> ${absPath}`);
      return absPath;
    } else {
      Log.warn(LOG_CLS_SHORT, 'RAPFI', `Failed to resolve abs path for ID reference: ${idRef}`);
      return '';
    }
  }

  // If a file doesn't exist and you want to know where it will go / should be
  buildAbsFilePathById(id: string): string {
    const configSetName = id.split('.')[0];
    const configSet = this.getConfigSetByName(configSetName);
    const absPath = configSet?.buildAbsFilePathById(id);
    return absPath || '';
  }

  getConfigSetByName(name: string): ConfigSet | null {

    const configSet = this.configSets.find(
      (set) => set.name === name
    );

    if (configSet) {
      Log.debug(LOG_CLS_SHORT, 'GCSN', `Found ConfigSet for name: ${name}`);
      return configSet;
    } else {
      Log.warn(LOG_CLS_SHORT, 'GCSN', `No ConfigSet found for name: ${name}`);
      return null;
    }
  }

  /**
   * Recursively searches for directories that qualify as config sets.
   */
  private async findConfigRootsRecursive(currentPath: string, visited = new Set<string>()): Promise<string[]> {
    const SKIP_DIRS = new Set([
      "node_modules", "out", "build", "dist", ".git", ".cache", "coverage", "temp"
    ]);

    if (visited.has(currentPath)) return [];
    visited.add(currentPath);

    if (!(await this.fsAdapter.isDirectory(currentPath))) return [];

    if (SKIP_DIRS.has(currentPath.split("/").pop() || "")) {
      Log.debug(LOG_CLS_SHORT, 'FCR', `Skipping directory: ${currentPath}`);
      return [];
    }

    const REQUIRED_SUBDIRS = ["models", "schemas", "instances"];
    const hasRequiredSubdirs = await Promise.all(
      REQUIRED_SUBDIRS.map((subdir) => this.fsAdapter.isExists(`${currentPath}/${subdir}`))
    );

    if (hasRequiredSubdirs.every(Boolean)) {
      Log.verbose(LOG_CLS_SHORT, 'FCR', `✅ Config root found: ${currentPath}`);
      return [currentPath];
    }

    let foundRoots: string[] = [];
    try {

      const subfolders = await this.fsAdapter.readDirectory(currentPath);

      for (const subfolder of subfolders) {
        const subfolderPath = `${currentPath}/${subfolder}`;
        const rootsFromSubfolder = await this.findConfigRootsRecursive(subfolderPath, visited);
        foundRoots.push(...rootsFromSubfolder);
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("not a directory")) {
        Log.warn(LOG_CLS_SHORT, 'FCR', `⚠️ Failed to load resources from ${currentPath}: ${error}`);
      }
    }

    return foundRoots;
  }
}
