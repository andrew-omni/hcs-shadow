import { SchemaManager } from "./schemaManager";
import { ModelManager } from "./modelManager";
import { InstanceManager } from "./instanceManager";
import { FsAdapter } from "../fs/fsAdapter";
import { ResourceManager } from "./resourceManager";
import { validateAll, ValidationResult } from "../validators/validateAll";
import { buildAll as libBuildAll } from "../builders/buildAll";
import { GitAdapter } from "../git/gitAdapter";
import { NodeGit } from "../git/nodeGit";

const REQUIRED_SUBDIRS = ["models", "schemas", "instances"];

export let configSets: ConfigSet[] = [];
export function setConfigSets(sets: ConfigSet[]) {
    configSets = sets;
}
/**
 * Represents a ConfigSet, encapsulating its structure and behavior.
 */
export class ConfigSet {
    private configSetPath: string;
    private fsAdapter: FsAdapter;

    constructor(public readonly path: string, private fs: FsAdapter) {
        this.configSetPath = path;
        this.fsAdapter = fs;
    }

    public getName(): string {
        return this.path.split("/").pop() || "";
    }

    public getPath(): string {
        return this.configSetPath;
    }

    /**
     * Asynchronous factory method to create a ConfigSet instance.
     * 
     * NB This does not create an actual directory structure on disk
     */
    public static async loadConfigSet(path: string, fs: FsAdapter): Promise<ConfigSet> {
        const isValid = await ConfigSet.validateConfigSet(path, fs);
        if (!isValid) {
            throw new Error(`❌ Invalid ConfigSet: ${path} is missing required subdirectories.`);
        }

        return new ConfigSet(path, fs);
    }

    /**
    * Validates whether the given path contains the required subdirectories.
    */
    private static async validateConfigSet(path: string, fs: FsAdapter): Promise<boolean> {
        try {
            const subdirs = await fs.readDirectory(path);
            return REQUIRED_SUBDIRS.every(requiredSubdir => subdirs.includes(requiredSubdir));
        } catch (error) {
            console.warn(`⚠️ Error while validating config set at ${path}:`, error);
            return false;
        }
    }

    async exists(): Promise<boolean> {
        return this.fs.fileExists(this.path);
    }
}

/**
 * Manages the creation and operations on ConfigSets.
 */
export class ConfigSetManager {
    private configSet: ConfigSet;
    private resourceManager: ResourceManager;
    private schemaManager: SchemaManager;
    private modelManager: ModelManager;
    private instanceManager: InstanceManager;
    private fsAdapter: FsAdapter;
    private gitAdapter: GitAdapter;

    constructor(configSet: ConfigSet, fs: FsAdapter, git?: GitAdapter) {
        this.configSet = configSet;
        this.fsAdapter = fs;
        this.resourceManager = new ResourceManager(configSet, this.fsAdapter);
        this.schemaManager = new SchemaManager(configSet, fs, this.resourceManager);
        this.modelManager = new ModelManager(configSet, fs, this.resourceManager);
        this.instanceManager = new InstanceManager(configSet, fs, this.resourceManager);
        this.gitAdapter = git || new NodeGit();
    }

    getFsAdapter(): FsAdapter {
        return this.fsAdapter
    }

    getGitAdapter(): GitAdapter {
        return this.gitAdapter
    }

    getConfigSet(): ConfigSet {
        return this.configSet;
    }

    getResourceManager(): ResourceManager {
        return this.resourceManager;
    }

    async reloadResources(): Promise<void> {
        await this.resourceManager.loadAll();
    }

    async createSchema(name: string): Promise<void> {
        await this.schemaManager.create(name);
    }

    async createModel(name: string): Promise<void> {
        await this.modelManager.create(name);
    }

    async createInstance(name: string): Promise<void> {
        await this.instanceManager.create(name);
    }

    async validateAll(): Promise<ValidationResult> {
        return await validateAll(this);
    }

    async buildAll(failOnFileChanges: boolean): Promise<void> {
        return await libBuildAll(this, failOnFileChanges);
    }

    getSchemaManager(): SchemaManager {
        return this.schemaManager;
    }

    getModelManager(): ModelManager {
        return this.modelManager;
    }

    getInstanceManager(): InstanceManager {
        return this.instanceManager;
    }
}

/**
 * Creates a new config set at the specified path.
 */
export async function createConfigSet(path: string, fs: FsAdapter): Promise<void> {
    console.log(`📂 Creating config set: ${path}`);

    const REQUIRED_SUBDIRS = ["models", "schemas", "instances"];

    try {
        await fs.createDirectory(path);

        for (const subdir of REQUIRED_SUBDIRS) {
            await fs.createDirectory(`${path}/${subdir}`);
        }

        // Add the new config set to the list of known sets
        if (!configSets.some(configRoot => configRoot.path === path)) {
            const configSet = await ConfigSet.loadConfigSet(path, fs);
            configSets.push(configSet);
        }

        console.log(`✅ Created config set: ${path}`);
    } catch (error) {
        console.error(`❌ Failed to create config set at ${path}:`, error);
        throw error;
    }
}

/**
 * Retrieves all valid config sets in the given base paths.
 */
export async function getConfigSets(
    basePaths: string[],
    fs: FsAdapter
): Promise<ConfigSet[]> {
    if (configSets.length > 0) {
        console.log("⚡ Returning cached config sets:", configSets);
        return configSets;
    }

    console.log("🔍 Searching for config sets...");
    let discoveredRoots: string[] = [];

    for (const basePath of basePaths) {
        const roots = await findConfigRootsRecursive(basePath, fs);
        discoveredRoots.push(...roots);
    }

    // For each unique root, create a ConfigSet
    const configRoots = [...new Set(discoveredRoots)];
    configSets = await Promise.all(configRoots.map(path => ConfigSet.loadConfigSet(path, fs)));

    console.log("✅ Found config sets:", configRoots);

    return configSets;
}

/**
 * Recursively searches for directories that qualify as config sets.
 */
async function findConfigRootsRecursive(
    currentPath: string,
    fs: FsAdapter,
    visited = new Set<string>()
): Promise<string[]> {
    const SKIP_DIRS = new Set(["node_modules", "out", "build", "dist", ".git", ".cache", "coverage", "temp"]);
    const FILE_EXTENSIONS_TO_SKIP = new Set([
        ".ts", ".js", ".jsx", ".cjs", ".mjs", ".json", ".jsonc", ".yaml", ".yml",
        ".md", ".rst", ".txt", ".lock", ".toml", ".ini",
        ".py", ".pyc", ".pyo", ".pyd", ".pyw", ".ipynb",
        ".rb", ".gemspec", ".rake",
        ".java", ".class", ".jar", ".war", ".gradle", ".kt",
        ".cpp", ".c", ".h", ".hpp", ".cc", ".o", ".obj", ".dylib", ".so", ".dll",
        ".swift", ".go", ".rs", ".dart", ".cs", ".vb",
        ".php", ".phar",
        ".sh", ".bat", ".cmd", ".ps1",
        ".pl", ".pm", ".t", ".perl",
        ".lua", ".r", ".m", ".mat",
        ".sql", ".db", ".db3", ".sqlite", ".sqlite3",
        ".tsx", ".lock", ".env", ".cfg",
    ]);

    if (visited.has(currentPath)) {
        return [];
    }
    visited.add(currentPath);

    // Skip ignored directories
    if (SKIP_DIRS.has(currentPath.split("/").pop() || "")) {
        console.log(`⏭️ Skipping directory: ${currentPath}`);
        return [];
    }

    // Skip files with blacklisted extensions
    if (FILE_EXTENSIONS_TO_SKIP.has(currentPath.substring(currentPath.lastIndexOf(".")))) {
        return [];
    }

    const REQUIRED_SUBDIRS = ["models", "schemas", "instances"];
    const hasRequiredSubdirs = await Promise.all(
        REQUIRED_SUBDIRS.map(async (subdir) => fs.fileExists(`${currentPath}/${subdir}`))
    );

    if (hasRequiredSubdirs.every(Boolean)) {
        console.log(`✅ Config root found: ${currentPath}`);
        return [currentPath];
    }

    let foundRoots: string[] = [];
    try {
        const subfolders = await fs.readDirectory(currentPath);

        for (const subfolder of subfolders) {
            if (SKIP_DIRS.has(subfolder)) {
                console.log(`⏭️ Skipping directory: ${currentPath}/${subfolder}`);
                continue;
            }

            if (FILE_EXTENSIONS_TO_SKIP.has(subfolder.substring(subfolder.lastIndexOf(".")))) {
                continue;
            }

            const subfolderPath = `${currentPath}/${subfolder}`;
            const rootsFromSubfolder = await findConfigRootsRecursive(subfolderPath, fs, visited);
            foundRoots.push(...rootsFromSubfolder);
        }
    } catch (error) {
        console.warn(`⚠️ Skipping inaccessible directory: ${currentPath}`);
    }

    return foundRoots;
}
