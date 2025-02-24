import { HcsManager, NodeFs, NodeGit } from "hcs-lib";

/**
 * CLI command to validate and build all schemas, models, and instances.
 *
 * @param configsetPath - The path to the config set to validate and build.
 */
export async function buildAll(configsetPath: string) {
  const fs = new NodeFs();
  const git = new NodeGit();

  try {
    const hcsManager = new HcsManager([configsetPath], fs, git);
    await hcsManager.initialize();

    const failOnFileChanges: boolean = false;
    await hcsManager.runPipelineForAll(failOnFileChanges);
  } catch (error) {
    console.error(`❌ Build failed due to validation or processing errors:`, error);
    throw error;
  }
}

