import { HcsManager, NodeFs, NodeGit } from "hcs-lib";


export async function createConfigSet(configsetPath: string) {
  const fs = new NodeFs();
  const git = new NodeGit();

  try {
    // Get the cwd
    const hcsManager = new HcsManager([process.cwd()], fs, git);
    await hcsManager.initialize();
    await hcsManager.createConfigSet(configsetPath);
  } catch (error) {
    console.error(`❌ Error creating configset:`, error);
    process.exit(1);
  }
}
