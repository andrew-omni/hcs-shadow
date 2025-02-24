import { VersioningStrategy } from './VersioningStrategy';
import { Log } from '../../logger';
import { PipelineContext } from '../../core/interfaces/PipelineContext';
import { ContextUtils } from '../../core/ContextUtils';
import { FsAdapter } from '../../fs/fsAdapter';
import { GitAdapter } from '../../git/gitAdapter';

const LOG_CLS_SHORT = 'Versioning';

export class DefaultVersioningStrategy implements VersioningStrategy {
  constructor(
    private fs: FsAdapter,
    private git: GitAdapter
  ) { }

  async execute(context: PipelineContext): Promise<void> {
    Log.info(
      LOG_CLS_SHORT,
      'Versioning',
      `🚀 Starting versioning strategy for model ID: ${context.modelId}`
    );
    // Get all built objects from the context
    const resources = this.getEntitiesFromContext(context);
    await this.processVersioning(context, resources);
  }

  /**
   * Process versioning for schemas or models
   */
  private async processVersioning(context: PipelineContext, resources: Map<string, any>) {

    for (const [id, builtObj] of resources.entries()) {
      const resourceType = id.split('.')[1];

      // Compared to what is on disk, the built object will change it
      let buildChangedFile = false;

      // There is already a versioned file on disk
      let versionedFileExists = false;

      // The versioned file on disk has changed compared to git
      let isVersionFileChangedFromGit = false;

      // filePath = '/Users/andy/repos/omniscient/hcs-lib/src/test/configset/config_test/schemas/validSchema.json'
      let filePath = await context.hcsManager.buildFilePathById(id);
      const fileExists = await context.hcsManager.getFsAdapter().isExists(filePath);
      if (!(fileExists)) {
        // The file does not exist on disk yet - we are generating it from new
        buildChangedFile = true;
        versionedFileExists = false;
        
        Log.verbose(LOG_CLS_SHORT, "pvp", `⚠️ File ${id} does not exist on disk - creating...`);
      }

      const originalId = builtObj.$id;

      // '/Users/andy/repos/omni/configset/schemas'
      const absConfigObjDirPath = filePath.split('/').slice(0, -1).join('/');

      // 'schemas'
      const configObjDir = filePath.split('/').filter(Boolean).slice(-2, -1)[0] ?? null;

      // 'validSchema.json'
      const configFilename = filePath.split('/').pop() ?? null;

      // '/Users/andy/repos/omni/configset/schemas/validSchema.json'
      const unversionedFilePath = `${absConfigObjDirPath}/${configFilename}`;

      // 'validSchema'
      const filenameWithoutExtension = configFilename!.replace(".json", "");

      // 'schemas/validSchema'
      const versionedFolder = `${configObjDir}/${filenameWithoutExtension}`;

      // '/Users/andy/repos/omni/configset/schemas/validSchema/'
      const versionedFolderAbsPath = `${absConfigObjDirPath}/${filenameWithoutExtension}`;

      // The builtJsonObj are the raw objects - they do not yet have meaningful $version values
      // Remember that the $id is like 'configsetname.schemas.schema' and versions have ids like
      // 'configsetname.schemas.schema.1'

      // Get the highest versioned file for this file
      const latestVersion = await getLatestVersionOnDisk(versionedFolderAbsPath, this.fs);

      if (latestVersion === 0) {
        buildChangedFile = true;
        versionedFileExists = false;
        // There is no versioned file on disk
      } else {
        versionedFileExists = true;

        // There is at least one versioned file on disk
        const latestVersionFileName = `${filenameWithoutExtension}_${latestVersion}.json`;

        const latestVersionAbsFilePath = `${versionedFolderAbsPath}/${latestVersionFileName}`;

        const latestVersionFile = await this.fs.readFile(latestVersionAbsFilePath);

        const latestVersionJson = JSON.parse(latestVersionFile);

        // We want to compare the built object to the highest versioned file on disk - the difference being that the versioned
        // file on disk's $id will have the version number appended to it.  We create a comparison object where our built object
        // has the same $id as the highest versioned file on disk.  If the two objects are the same, we know that our build did not
        // change the file.  If they are different, we know that our build caused a new version to be created.
        const comparisonBuiltObj = { ...builtObj };
        comparisonBuiltObj.$id = `${builtObj.$id}.${latestVersion}`;
        comparisonBuiltObj.$version = latestVersion;

        if (compareJsonContent(comparisonBuiltObj, latestVersionJson)) {
          // If the builtObj is the same as the highest version on disk, no change has been made
          Log.verbose(LOG_CLS_SHORT, "pvp", `✅ No changes detected for ${id}.`);
          buildChangedFile = false;
          continue;
        } else {
          // If those two files are different, we know that our build caused a new version to be created.
          Log.debug(LOG_CLS_SHORT, "pvp", `⚠️ File ${id} has changed after build.`);
          buildChangedFile = true;

          // if buildChangedFile == true, we must then check to see if the highest versioned item on disk has changed wrt .git.  If it has
          // changed compared to git, this is a user actively editing files and a previous build w/in this commit has
          // already created a new version.
          isVersionFileChangedFromGit = await this.git.isFileChangedFromGit(latestVersionAbsFilePath);
        }
      }



      // In this case, we don't want to create a new version, but we should write the builtJsonObj to disk
      // (overwriting the highest versioned file).  newVersion = false.  Overwrite highest versioned item w/ builtJsonObj.

      // If buildChangedFile == true and newVersion == true, this is a new version.  We should increment the version and write the file to disk,
      // ensuring we increment the filename's version number as well.  Files are versioned like so:  schema_1.json, schema_2.json, etc. would
      // have a $version of 1, 2, etc.  The $id would be schema_1.json, schema_2.json, etc.  The filename would be schema_1.json, schema_2.json, etc.
      // Versioned files are written to directories, so ensure you write to the dir path w/ the same name as the file-root (w/o .json): 
      // schemas/schema_1.json, schemas/schema_2.json, etc.
      let didWriteModel = false;
      const newVersionFileContent = { ...builtObj };
      if (buildChangedFile && !versionedFileExists) {
        // No version exists - we are creating a new version
        // Create the versioned folder if it doesn't exist
        await this.fs.createDirectory(versionedFolderAbsPath);

        const newVersion = 1;
        newVersionFileContent.$id = `${newVersionFileContent.$id}.${newVersion}`;
        newVersionFileContent.$version = newVersion;

        // Write the file to disk
        const versionedFilePath = `${versionedFolderAbsPath}/${filenameWithoutExtension}_${newVersion}.json`;

        this.setPhaseData(context, 'versioning', resourceType, newVersionFileContent.$id, { ...newVersionFileContent });
        
        // Write the unversioned file to disk - use the original ID
        newVersionFileContent.$id = originalId;
        this.setPhaseData(context, 'versioning', resourceType, newVersionFileContent.$id, { ...newVersionFileContent });

        Log.debug(LOG_CLS_SHORT, "pvp", `📄 Versioned File Created: ${versionedFilePath}`);
        Log.debug(LOG_CLS_SHORT, "pvp", `📄 Updated Unversioned File: ${unversionedFilePath}`);
      } else if (buildChangedFile && versionedFileExists && !isVersionFileChangedFromGit) {
        // Version exists, but no changes from git - we are editing this file from what is committed.
        // Increment the version number
        const newVersion = latestVersion + 1;
        newVersionFileContent.$id = `${newVersionFileContent.$id}.${newVersion}`;
        newVersionFileContent.$version = newVersion;

        // Write the file to disk
        const versionedFilePath = `${versionedFolderAbsPath}/${filenameWithoutExtension}_${newVersion}.json`;

        this.setPhaseData(context, 'versioning', resourceType, newVersionFileContent.$id, { ...newVersionFileContent });

        newVersionFileContent.$id = originalId;
        this.setPhaseData(context, 'versioning', resourceType, newVersionFileContent.$id, { ...newVersionFileContent });


        Log.debug(LOG_CLS_SHORT, "pvp", `📄 Versioned File Created: ${versionedFilePath}`);
        Log.debug(LOG_CLS_SHORT, "pvp", `📄 Updated Unversioned File: ${unversionedFilePath}`);
      } else if (buildChangedFile && versionedFileExists && isVersionFileChangedFromGit) {
        // Version exists, and changes from git - we are overwriting the existing version
        newVersionFileContent.$id = `${newVersionFileContent.$id}.${latestVersion}`;
        newVersionFileContent.$version = latestVersion;

        // Write the file to disk
        const versionedFilePath = `${versionedFolderAbsPath}/${filenameWithoutExtension}_${latestVersion}.json`;

        // Write the unversioned file to disk
        this.setPhaseData(context, 'versioning', resourceType, newVersionFileContent.$id, { ...newVersionFileContent });

        newVersionFileContent.$id = originalId;
        this.setPhaseData(context, 'versioning', resourceType, newVersionFileContent.$id, { ...newVersionFileContent });

        Log.debug(LOG_CLS_SHORT, "pvp", `📄 Versioned File Created: ${versionedFilePath}`);
        Log.debug(LOG_CLS_SHORT, "pvp", `📄 Updated Unversioned File: ${unversionedFilePath}`);
      } else {
        // No changes detected
        Log.debug(LOG_CLS_SHORT, "pvp", `✅ No changes detected for ${id}.`);
      }
    }
  }

  private createInstancePhaseData(context: PipelineContext, modelId: string, modelContent: any) {
    const instanceId = modelId.replace('.models.', '.instances.');
    const instance = { ...modelContent, $id: instanceId };

    this.setPhaseData(context, 'versioning', 'instances', instanceId, instance);
  }


  private setPhaseData(context: PipelineContext, phase: string, type: string, resourceId: string, value: any) {
    return ContextUtils.setPhaseData(context, phase, type, resourceId, value);
  }

  /**
   * Extracts entities (schemas/models) from the context.
   */
  private getEntitiesFromContext(
    context: PipelineContext,
  ): Map<string, any> {
    const entities = new Map<string, any>();
    for (const [key, value] of context.data.entries()) {
      const [phase, type, resourceId] = key.split(':');
      if (phase === 'build') {
        entities.set(resourceId, value.value);
      }
    }
    return entities;
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
  if (!(await fs.isExists(versionDir))) {
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

