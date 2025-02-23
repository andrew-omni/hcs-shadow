import { NodeFs } from "hcs-lib";
import { ConfigSet, ConfigSetManager } from "hcs-lib";

/**
 * CLI command to validate and build all schemas, models, and instances.
 *
 * @param configsetPath - The path to the config set to validate and build.
 */
export async function verifyBuild(configsetPath: string) {
  const fs = new NodeFs();

  // Step 1: Load the config set
  const configSet = await ConfigSet.loadConfigSet(configsetPath, fs);
  const configSetManager = new ConfigSetManager(configSet, fs);

  // Step 2: Reload resources (schemas, models, instances)
  await configSetManager.reloadResources();

  // Step 3: Perform the build
  try {
    const failOnFileChanges: boolean = true;
    await configSetManager.buildAll(failOnFileChanges);
  } catch (error) {
    console.error(`❌ Build failed due to validation or processing errors:`, error);
    throw error;
  }
}

