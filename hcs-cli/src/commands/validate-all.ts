import { NodeFs, ConfigSet, ConfigSetManager, validateAll } from "hcs-lib";

/**
 * CLI command to validate all schemas, models, and instances in a config set.
 *
 * @param configsetPath - The path to the config set to validate.
 */
export async function validateAllCommand(configsetPath: string) {
  const fs = new NodeFs();

  try {
    // Load the config set
    const configSet = await ConfigSet.loadConfigSet(configsetPath, fs);
    const configSetManager = new ConfigSetManager(configSet, fs);

    // Ensure all resources are loaded before validation
    await configSetManager.reloadResources();

    // Perform validation
    const validationResult = await validateAll(configSetManager);

    if (!validationResult.success) {
      // Failed validation - error out - this is a workflow hook
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error validating config set:`, error);
    process.exit(1);
  }
}
