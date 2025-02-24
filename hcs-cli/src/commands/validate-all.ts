import { HcsManager, NodeFs, NodeGit } from "hcs-lib";

/**
 * CLI command to validate all schemas, models, and instances in a config set.
 *
 * @param configsetPath - The path to the config set to validate.
 */
export async function validateAllCommand(configsetPath: string) {
  const fs = new NodeFs();
  const git = new NodeGit();

  try {
    const hcsManager = new HcsManager([process.cwd()], fs, git);
    await hcsManager.initialize();

    const failOnFileChanges: boolean = false;
    const pipelineResults = await hcsManager.runPipelineForAll(failOnFileChanges);
    // Log results
    if (pipelineResults.hasErrors) {
      console.error(`❌ Validation failed with errors:`, JSON.stringify(pipelineResults.results, null, 2));
      process.exit(1);
    } else {
      console.log(`✅ Validation succeeded.`);
    }
  } catch (error) {
    console.error(`❌ Build failed due to validation or processing errors:`, error);
    throw error;
  }
}
