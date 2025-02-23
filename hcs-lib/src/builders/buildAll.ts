import { SchemaBuilder } from "./schemaBuilder";
import { ModelBuilder } from "./modelBuilder";
import { ResourceManager } from "../configset/resourceManager";
import { ConfigSetManager } from "../configset/configsetManager";
import { BaseJsonBuilder } from "./baseJsonBuilder";
import { FsAdapter } from "../fs/fsAdapter";
import { GitAdapter } from "../git/gitAdapter";
import { InstanceBuilder } from "./instanceBuilder";

/**
 * Validates all schemas, models, and instances in the given ConfigSet, then builds them
 * (creates versioned copies along with rebuilding the compiled versions of models and instances).
 *
 * @param hcsManager - The ConfigSetManager to validate.
 * @param failOnFileChanges - If true, build fails if any file changes after the build.
 */
export async function buildAll(hcsManager: ConfigSetManager, failOnFileChanges: boolean): Promise<void> {
    console.log(`🔍 Running full build for ConfigSet at: ${hcsManager.getConfigSet().path} with failOnFileChanges ${failOnFileChanges}`);

    const resourceManager = hcsManager.getResourceManager();
    const fs: FsAdapter = hcsManager.getFsAdapter();
    const git: GitAdapter = hcsManager.getGitAdapter();

    // Step 1: Validate all resources before proceeding
    await validateAllResources(hcsManager);

    // Step 2: Build schemas and models
    const builtResourcesByRef = await buildResources(resourceManager);

    // Step 3: Handle versioning, file persistence, and check for changes
    await processVersioningAndPersistence(builtResourcesByRef, resourceManager, fs, git, failOnFileChanges);

    console.log(`✅ Build complete.`);
}

/**
 * Validates all resources in the ConfigSet.
 * Throws an error if validation fails.
 */
async function validateAllResources(hcsManager: ConfigSetManager): Promise<void> {
    const validationResults = await hcsManager.validateAll();
    if (!validationResults.success) {
        console.error(`❌ Build failed due to validation errors.`);
        throw new Error(`Build failed due to validation errors.`);
    }
}

/**
 * Builds schemas and models, returning a map of built objects.
 */
/**
 * Builds schemas and models, returning a map of built objects.
 */
async function buildResources(resourceManager: ResourceManager): Promise<Map<string, any>> {
    const resources = resourceManager.getResources();
    const builtResourcesByRef: Map<string, any> = new Map();

    // Helper function to process categories
    const processCategory = async (category: Record<string, any>, builder: BaseJsonBuilder) => {
        for (const [filePath, resource] of Object.entries(category)) {
            try {
                // Updated: builder.build now returns { path, builtJsonObj }
                const { path: newPath, builtJsonObj } = await builder.build(resource, filePath);
                builtResourcesByRef.set(newPath, builtJsonObj);
            } catch (error) {
                console.error(`❌ Error building ${filePath}:`, error);
                throw error;
            }
        }
    };

    // Build schemas first, then models
    try {
        const schemaBuilder = new SchemaBuilder(resourceManager);
        await processCategory(resources.schemas, schemaBuilder);

        const modelBuilder = new ModelBuilder(resourceManager);
        await processCategory(resources.models, modelBuilder);

        // Instances are built by the model, not other instances
        const instanceBuilder = new InstanceBuilder(resourceManager);
        await processCategory(resources.models, instanceBuilder);
    } catch (error) {
        console.error(`❌ Build failed due to build-time error:`, error);
        throw new Error(`Build failed due to build-time error: ${error}`);
    }

    console.log(`📦 Built Resources: ${builtResourcesByRef.size} files`);
    return builtResourcesByRef;
}


/**
 * Handles versioning, detects changes, and writes final built objects to disk.
 */
async function processVersioningAndPersistence(
    builtResourcesByRef: Map<string, any>,
    resourceManager: ResourceManager,
    fs: FsAdapter,
    git: GitAdapter,
    failOnFileChanges: boolean
): Promise<void> {
    console.log(`🔍 Processing versioning and persistence...`);

    for (const [ref, builtObj] of builtResourcesByRef.entries()) {
        // We expect ref to be a relative path to the file, e.g. '../schemas/validSchema.json'
        // ref = '../schemas/validSchema.json'
        if (!ref.startsWith("../")) {
            console.error(`❌ Versioning expectes relative path, but received (coding error?): ${ref}`);
            throw new Error(`Invalid ref: ${ref}`);
        }

        const originalId = builtObj.$id;

        // 'schemas'
        const configDir = ref.substring(3, ref.lastIndexOf("/"));

        // '/Users/andy/repos/omni/configset/schemas'
        const absConfigDirPath = resourceManager.buildFullPathFromRelativePath(configDir);

        // 'validSchema.json'
        const configFilename = ref.substring(ref.lastIndexOf("/") + 1);

        // 'validSchema'
        const filenameWithoutExtension = configFilename.replace(".json", "");

        // 'schemas/validSchema'
        const versionedFolder = `${configDir}/${filenameWithoutExtension}`;
        const versionedFolderAbsPath = resourceManager.buildFullPathFromRelativePath(versionedFolder);

        // The builtJsonObj are the raw objects - they do not yet have meaningful $version values
        // Remember that the $id is like 'configsetname.schemas.schema' and versions have ids like
        // 'configsetname.schemas.schema.1'

        // Get the highest versioned file for this file
        const latestVersion = await getLatestVersionOnDisk(resourceManager.buildFullPathFromRelativePath(`${versionedFolder}`), fs);

        // Compared to what is on disk, the built object will change it
        let buildChangedFile = false;

        // There is already a versioned file on disk
        let versionedFileExists = false;

        // The versioned file on disk has changed compared to git
        let isVersionFileChangedFromGit = false;

        if (latestVersion === 0) {
            buildChangedFile = true;
            versionedFileExists = false;
            // There is no versioned file on disk
        } else {
            versionedFileExists = true;

            // There is at least one versioned file on disk
            // We set our newly builtJsonObj $id to that value.
            builtObj.$id = `${builtObj.$id}.${latestVersion}`;
            builtObj.$version = latestVersion;

            const latestVersionFileName = `${filenameWithoutExtension}_${latestVersion}.json`;

            const latestVersionAbsFilePath = resourceManager.buildFullPathFromRelativePath(`${versionedFolder}/${latestVersionFileName}`);

            const latestVersionFile = await fs.readFile(latestVersionAbsFilePath);

            const latestVersionJson = JSON.parse(latestVersionFile);

            if (compareJsonContent(builtObj, latestVersionJson)) {
                // If the builtObj is the same as the highest version on disk, no change has been made
                console.log(`✅ No changes detected for ${ref}.`);
                buildChangedFile = false;
                continue;
            } else {
                // If those two files are different, we know that our build caused a new version to be created.
                console.warn(`⚠️ File ${ref} has changed after build.`);
                buildChangedFile = true;

                // if buildChangedFile == true, we must then check to see if the highest versioned item on disk has changed wrt .git.  If it has
                // changed compared to git, this is a user actively editing files and a previous build w/in this commit has
                // already created a new version.
                isVersionFileChangedFromGit = await git.isFileChangedFromGit(latestVersionAbsFilePath);
            }
        }

        if (buildChangedFile && failOnFileChanges) {
            console.error(`❌ Build failed: Detected file changes.`);
            throw new Error(`File ${ref} has changed after build.`);
        }

        // In this case, we don't want to create a new version, but we should write the builtJsonObj to disk
        // (overwriting the highest versioned file).  newVersion = false.  Overwrite highest versioned item w/ builtJsonObj.

        // If buildChangedFile == true and newVersion == true, this is a new version.  We should increment the version and write the file to disk,
        // ensuring we increment the filename's version number as well.  Files are versioned like so:  schema_1.json, schema_2.json, etc. would
        // have a $version of 1, 2, etc.  The $id would be schema_1.json, schema_2.json, etc.  The filename would be schema_1.json, schema_2.json, etc.
        // Versioned files are written to directories, so ensure you write to the dir path w/ the same name as the file-root (w/o .json): 
        // schemas/schema_1.json, schemas/schema_2.json, etc.

        if (buildChangedFile && !versionedFileExists) {
            // No version exists - we are creating a new version
            // Create the versioned folder if it doesn't exist
            await fs.createDirectory(versionedFolderAbsPath);

            const newVersion = 1;
            builtObj.$id = `${builtObj.$id}.${newVersion}`;
            builtObj.$version = newVersion;

            // Write the file to disk
            const versionedFilePath = `${versionedFolderAbsPath}/${filenameWithoutExtension}_${newVersion}.json`;
            await fs.writeFile(versionedFilePath, JSON.stringify(builtObj, null, 2));
            console.log(`📄 Versioned File Created: ${versionedFilePath}`);

            // Write the unversioned file to disk - use the original ID
            builtObj.$id = originalId;
            await fs.writeFile(`${absConfigDirPath}/${builtObj.$id}`, JSON.stringify(builtObj, null, 2));
            console.log(`📄 Updated Unversioned File: ${absConfigDirPath}/${configFilename}`);
        } else if (buildChangedFile && versionedFileExists && !isVersionFileChangedFromGit) {
            // Version exists, but no changes from git - we are editing this file from what is committed.
            // Increment the version number
            const newVersion = latestVersion + 1;
            builtObj.$id = `${builtObj.$id}.${newVersion}`;
            builtObj.$version = newVersion;

            // Write the file to disk
            const versionedFilePath = `${versionedFolderAbsPath}/${filenameWithoutExtension}_${newVersion}.json`;
            await fs.writeFile(versionedFilePath, JSON.stringify(builtObj, null, 2));
            console.log(`📄 Versioned File Created: ${versionedFilePath}`);

            // Write the unversioned file to disk
            builtObj.$id = originalId;
            await fs.writeFile(`${absConfigDirPath}/${builtObj.$id}`, JSON.stringify(builtObj, null, 2));
            console.log(`📄 Updated Unversioned File: ${absConfigDirPath}/${configFilename}`);
        } else if (buildChangedFile && versionedFileExists && isVersionFileChangedFromGit) {
            // Version exists, and changes from git - we are overwriting the existing version
            builtObj.$id = `${builtObj.$id}.${latestVersion}`;
            builtObj.$version = latestVersion;

            // Write the file to disk
            const versionedFilePath = `${versionedFolderAbsPath}/${filenameWithoutExtension}_${latestVersion}.json`;
            await fs.writeFile(versionedFilePath, JSON.stringify(builtObj, null, 2));
            console.log(`📄 Versioned File Created: ${versionedFilePath}`);

            // Write the unversioned file to disk
            builtObj.$id = originalId;
            await fs.writeFile(`${absConfigDirPath}/${builtObj.$id}`, JSON.stringify(builtObj, null, 2));
            console.log(`📄 Updated Unversioned File: ${absConfigDirPath}/${configFilename}`);
        } else {
            // No changes detected
            console.log(`✅ No changes detected for ${ref}.`);
        }
    }
}

/**
 * Compares two JSON objects to check if their content is identical.
 */
function compareJsonContent(a: any, b: any): boolean {
    // Handle primitive types and direct equality
    if (a === b) {
        return true;
    }

    // Handle null or undefined
    if (a == null || b == null) {
        return a === b;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, index) => compareJsonContent(item, b[index]));
    }

    // Handle objects
    if (typeof a === "object" && typeof b === "object") {
        const aKeys = Object.keys(a).sort();
        const bKeys = Object.keys(b).sort();

        if (aKeys.length !== bKeys.length) return false;

        // Check if all keys are identical
        if (!aKeys.every((key, index) => key === bKeys[index])) return false;

        // Recursively compare all values
        return aKeys.every((key) => compareJsonContent(a[key], b[key]));
    }

    // Fallback for other data types (should not happen in valid JSON)
    return false;
}

/**
 * Finds the latest versioned instance number on disk.
 */
export async function getLatestVersionOnDisk(versionDir: string, fs: FsAdapter): Promise<number> {
    // Does the versionDir exist?
    if (!(await fs.fileExists(versionDir))) {
        return 0; // No versions exist yet
    }

    const existingFiles = await fs.readDirectory(versionDir);

    const versionNumbers = existingFiles
        .map((filename) => {
            const match = filename.match(/^(.+)_([0-9]+)\.json$/);
            return match ? parseInt(match[2], 10) : null;
        })
        .filter((num): num is number => num !== null);

    return versionNumbers.length > 0 ? Math.max(...versionNumbers) : 0;
}